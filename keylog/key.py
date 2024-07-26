import time
import threading
from pynput import keyboard
import subprocess
import signal
import sys

# Log file paths
LOGFILE = "./keylog.txt"
DEBUG_LOGFILE = "./debug_log.txt"

# Time gap threshold in seconds to insert a timestamp
TIME_GAP_THRESHOLD = 4

# State variables
current_text = ""
last_log_time = time.time()
insert_mode = False
listener = None
cursor_position = 0


def log_text(text):
    """Log text to the specified log file."""
    with open(LOGFILE, "a") as file:
        file.write(text)


def log_debug(message):
    """Log debug information to the debug log file."""
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S] ", time.localtime(time.time()))
    with open(DEBUG_LOGFILE, "a") as file:
        file.write(f"{timestamp}{message}\n")


def check_emacs_insert_mode():
    """Check if Emacs is in EXWM insert mode."""
    try:
        log_debug("Checking Emacs insert mode...")
        # This lisp expression checks if the current buffer is an EXWM buffer
        # and if it is in insert mode.
        lisp_expr = """
        (let ((buf (current-buffer)))
          (and (derived-mode-p 'exwm-mode)
               (bound-and-true-p exwm-input-line-mode-p)))
        """
        result = subprocess.run(["emacsclient", "-e", lisp_expr], capture_output=True, text=True, check=True)
        is_insert_mode = result.stdout.strip() == "t"
        log_debug(f"Emacs insert mode: {is_insert_mode}")
        return is_insert_mode
    except subprocess.CalledProcessError as e:
        log_debug(f"Error checking Emacs state: {e}")
        return False


def periodic_emacs_check():
    """Periodically check Emacs insert mode in a separate thread."""
    global insert_mode
    while True:
        insert_mode = check_emacs_insert_mode()
        time.sleep(TIME_GAP_THRESHOLD)


def on_press(key):
    global current_text, last_log_time, insert_mode, cursor_position

    try:
        if not insert_mode:
            return

        log_debug(f"Key pressed: {key}")
        # Handle special keys
        if key == keyboard.Key.space:
            current_text = current_text[:cursor_position] + " " + current_text[cursor_position:]
            cursor_position += 1
        elif key == keyboard.Key.enter:
            current_text = current_text[:cursor_position] + "\n" + current_text[cursor_position:]
            cursor_position += 1
        elif key == keyboard.Key.backspace:
            if cursor_position > 0:
                current_text = current_text[: cursor_position - 1] + current_text[cursor_position:]
                cursor_position -= 1
        elif hasattr(key, "char") and key.char:
            current_text = current_text[:cursor_position] + key.char + current_text[cursor_position:]
            cursor_position += 1

        # Log the current text with a timestamp if there's a significant time gap
        current_time = time.time()
        if current_time - last_log_time > TIME_GAP_THRESHOLD:
            timestamp = time.strftime("[%Y-%m-%d %H:%M:%S] ", time.localtime(current_time))
            log_text(f"\n{timestamp}{current_text}")
            log_debug(f"Logged text: {current_text}")
            last_log_time = current_time

    except Exception as e:
        log_debug(f"Error: {e}")


def on_release(key):
    global insert_mode
    # Check if insert mode should be enabled
    if hasattr(key, "char") and key.char == "i" and not insert_mode:
        insert_mode = True
        log_debug("Insert mode enabled")


def signal_handler(sig, frame):
    global listener
    log_debug("Exiting...")
    print("Exiting...")
    if listener:
        listener.stop()
    sys.exit(0)


def main():
    global listener
    # Clear log files at the start
    with open(LOGFILE, "w") as file:
        file.write("Keylogger started...\n")
    with open(DEBUG_LOGFILE, "w") as file:
        file.write("Debug log started...\n")

    # Set up the signal handler
    signal.signal(signal.SIGINT, signal_handler)

    # Start the periodic Emacs state check in a separate thread
    emacs_check_thread = threading.Thread(target=periodic_emacs_check)
    emacs_check_thread.daemon = True
    emacs_check_thread.start()

    # Start listening to keyboard events
    listener = keyboard.Listener(on_press=on_press, on_release=on_release)
    listener.start()

    # Keep the main thread alive to keep logging
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
