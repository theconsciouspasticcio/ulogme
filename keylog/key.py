import time
from pynput import keyboard
import subprocess
import signal
import sys

# Log file path
LOGFILE = "./keylog.txt"

# Time gap threshold in seconds to insert a timestamp
TIME_GAP_THRESHOLD = 4

# State variables
current_text = ""
last_log_time = time.time()
emacs_active = False
insert_mode = False
listener = None


# Function to log text to file
def log_text(text):
    with open(LOGFILE, "a") as file:
        file.write(text)


# Function to check if Emacs is in insert mode and EXWM buffer is active
def check_emacs_state():
    try:
        # This lisp expression checks if the current buffer is an EXWM buffer
        # and if it is in insert mode.
        lisp_expr = """
        (let ((buf (current-buffer)))
          (and (derived-mode-p 'exwm-mode)
               (bound-and-true-p exwm-input-line-mode-p)))
        """
        result = subprocess.run(["emacsclient", "-e", lisp_expr], capture_output=True, text=True)
        return result.stdout.strip() == "t"
    except Exception as e:
        print(f"Error checking Emacs state: {e}")
        return False


# Keyboard event handlers
def on_press(key):
    global current_text, last_log_time, emacs_active, insert_mode

    try:
        emacs_active = check_emacs_state()

        # Ignore key presses if Emacs is not active or not in insert mode
        if not emacs_active:
            return

        # Handle special keys
        if key == keyboard.Key.space:
            current_text += " "
        elif key == keyboard.Key.enter:
            current_text += "\n"
        elif key == keyboard.Key.backspace:
            current_text = current_text[:-1]
        elif hasattr(key, "char") and key.char:
            current_text += key.char

        # Log if there is a significant time gap
        current_time = time.time()
        if current_time - last_log_time > TIME_GAP_THRESHOLD:
            timestamp = time.strftime("[%Y-%m-%d %H:%M:%S] ", time.localtime(current_time))
            log_text(f"\n{timestamp}{current_text}")
            current_text = ""
            last_log_time = current_time

    except Exception as e:
        print(f"Error: {e}")


def on_release(key):
    global insert_mode
    # Check if insert mode should be enabled
    if hasattr(key, "char") and key.char == "i" and not insert_mode:
        insert_mode = True


# Signal handler for clean exit
def signal_handler(sig, frame):
    global listener
    print("Exiting...")
    if listener:
        listener.stop()
    sys.exit(0)


# Main function to start the keylogger
def main():
    global listener
    # Clear log file at the start
    with open(LOGFILE, "w") as file:
        file.write("Keylogger started...\n")

    # Set up the signal handler
    signal.signal(signal.SIGINT, signal_handler)

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
