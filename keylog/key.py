import time
from pynput import keyboard
import subprocess

# Log file path
LOGFILE = "keylog.txt"

# Time gap threshold in seconds to insert a timestamp
TIME_GAP_THRESHOLD = 2

# State variables
current_text = ""
last_log_time = time.time()
emacs_active = False
insert_mode = False


# Function to log text to file
def log_text(text):
    with open(LOGFILE, "a") as file:
        file.write(text)


# Function to get the current active window title
def get_active_window_title():
    try:
        result = subprocess.run(["xdotool", "getactivewindow", "getwindowname"], capture_output=True, text=True)
        return result.stdout.strip()
    except Exception as e:
        print(f"Error getting active window title: {e}")
        return ""


# Function to check if Emacs is active
def is_emacs_active():
    title = get_active_window_title()
    return "emacs" in title.lower()


# Keyboard event handlers
def on_press(key):
    global current_text, last_log_time, emacs_active, insert_mode

    try:
        emacs_active = is_emacs_active()

        # Ignore key presses if Emacs is not active or not in insert mode
        if not emacs_active or not insert_mode:
            return

        # Handle special keys
        if key == keyboard.Key.space:
            current_text += " "
        elif key == keyboard.Key.enter:
            current_text += "\n"
        elif key == keyboard.Key.backspace:
            current_text = current_text[:-1]
        elif key == keyboard.Key.esc:
            insert_mode = False
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


# Main function to start the keylogger
def main():
    # Clear log file at the start
    with open(LOGFILE, "w") as file:
        file.write("Keylogger started...\n")

    # Start listening to keyboard events
    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()


if __name__ == "__main__":
    main()
