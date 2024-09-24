import time
from pynput import keyboard
import subprocess

# Constants
TIME_FRAME = 10  # seconds

# Variables to track the state
buffer = []
last_timestamp = time.time()
insert_mode = False
cursor_position = 0
ignore_next_key = False  # Variable to ignore the next key press


def is_insert_mode():
    """Function to check if EXWM is in insert mode"""
    try:
        result = subprocess.run(
            [
                "emacsclient",
                "-e",
                "(with-current-buffer (window-buffer (selected-window)) (if (eq evil-state 'insert) 't 'nil))",
            ],
            capture_output=True,
            text=True,
        )
        insert_mode = "t" in result.stdout
        print(f"Insert mode: {insert_mode}")  # Debug statement
        return insert_mode
    except Exception as e:
        print(f"Error checking insert mode: {e}")
        return False


def on_press(key):
    global buffer, last_timestamp, cursor_position, insert_mode, ignore_next_key

    # Check if insert mode is active
    current_insert_mode = is_insert_mode()

    if current_insert_mode != insert_mode:
        insert_mode = current_insert_mode
        ignore_next_key = insert_mode  # Ignore the next key if we just entered insert mode
        if insert_mode:
            print("Switched to insert mode")  # Debug statement
        else:
            print("Switched out of insert mode")  # Debug statement
        return

    if not insert_mode:
        return

    if ignore_next_key:
        print(f"Ignored key: {key}")  # Debug statement
        ignore_next_key = False
        return

    try:
        # Convert key to string
        if key == keyboard.Key.space:
            key_str = " "
        elif key == keyboard.Key.enter:
            key_str = "\n"
        elif key == keyboard.Key.backspace:
            if cursor_position > 0:
                cursor_position -= 1
                buffer.pop(cursor_position)
            print(f"Key pressed: BACKSPACE")  # Debug statement
            return
        elif key == keyboard.Key.left:
            if cursor_position > 0:
                cursor_position -= 1
            print(f"Key pressed: LEFT ARROW")  # Debug statement
            return
        elif key == keyboard.Key.right:
            if cursor_position < len(buffer):
                cursor_position += 1
            print(f"Key pressed: RIGHT ARROW")  # Debug statement
            return
        elif key == keyboard.Key.home:
            cursor_position = 0
            print(f"Key pressed: HOME")  # Debug statement
            return
        elif key == keyboard.Key.end:
            cursor_position = len(buffer)
            print(f"Key pressed: END")  # Debug statement
            return
        elif hasattr(key, "char") and key.char is not None:
            key_str = key.char
        else:
            return

        # Insert character at the current cursor position
        buffer.insert(cursor_position, key_str)
        cursor_position += 1
        print(f"Key pressed: {key_str}")  # Debug statement

        # Handle timestamps and buffer flushing
        current_time = time.time()
        if current_time - last_timestamp >= TIME_FRAME or key_str == "\n":
            flush_buffer(current_time)
            last_timestamp = current_time

    except Exception as e:
        print(f"Error in on_press: {e}")


def flush_buffer(current_time):
    global buffer
    if buffer:
        log_entry = "".join(buffer)
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current_time))
        with open("keylog.txt", "a") as f:
            f.write(f"[{timestamp}] {log_entry}\n")
        print(f"Flushed buffer: [{timestamp}] {log_entry}")  # Debug statement
        buffer.clear()


def on_release(key):
    # Optionally implement functionality on key release
    pass


# Set up keyboard listener
print("Starting keylogger...")  # Debug statement
with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
    listener.join()
