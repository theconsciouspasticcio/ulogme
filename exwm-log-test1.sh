#!/bin/bash

LANG=en_US.utf8

# Log the active window titles over time. Logs are written
# in logs/windowX.txt, where X is the Unix timestamp of 7am of the
# recording day. Logs are written if a window change event occurs
# (with a 2-second frequency check), or every 10 minutes if
# no changes occur.

waittime="2" # Number of seconds between executions of the loop
maxtime="600" # Max seconds between log writes if no window title changed

log_dir="logs"
mkdir -p "$log_dir"

last_write="0"
lasttitle=""

# Function to get the current log file name based on 7am timestamp
get_log_filename() {
    python rewind7am.py
}

# Function to determine if the screen is locked
is_screen_locked() {
    if [[ $GDMSESSION == 'xfce' ]]; then
        screensaverstate=$(xscreensaver-command -time | cut -f2 -d: | cut -f2-3 -d' ')
        [[ $screensaverstate =~ "screen non-blanked" ]] && echo false || echo true
    elif [[ $GDMSESSION == 'ubuntu' || $GDMSESSION == 'ubuntu-2d' || $GDMSESSION == 'gnome-shell' || $GDMSESSION == 'gnome-classic' || $GDMSESSION == 'gnome-fallback' || $GDMSESSION == 'cinnamon' ]]; then
        screensaverstate=$(gnome-screensaver-command -q >/dev/null 2>&1)
        [[ $screensaverstate =~ .*inactive.* ]] && echo false || echo true
    elif [[ $XDG_SESSION_DESKTOP == 'KDE' ]]; then
        qdbus org.kde.screensaver /ScreenSaver org.freedesktop.ScreenSaver.GetActive
    else
        echo false
    fi
}

# Function to get the current window title
get_current_window_title() {
    id=$(xdotool getactivewindow 2>/dev/null)
    if [ -n "$id" ]; then
        wmctrl -lpG | while read -a a; do
            w=${a[0]}
            if [[ $((16#${w:2})) -eq $id ]]; then
                echo "${a[@]:8}"
                break
            fi
        done
    else
        emacsclient -e '
        (let ((win (selected-window))
              (name (buffer-name (window-buffer (selected-window))))
              (mode (with-current-buffer (window-buffer (selected-window)) major-mode)))
          (cond
           ((eq mode "vterm-mode") "VTERM")
           ((eq mode "eshell-mode") "ESHELL")
           ((eq mode "term-mode") "TERM")
           ((string-match-p "^\\*.*\\*$" name) (concat "POPUP-" name))
           (t name)))' | sed s/\"//g
    fi
}

# Function to handle log writing
write_log() {
    curtitle="$1"
    T="$(date +%s)"
    logfile="$log_dir/window_$(get_log_filename).txt"
    echo "$T $curtitle" >> "$logfile"
    echo "Logged window title: $(date) $curtitle into $logfile"
    last_write=$T
    lasttitle="$curtitle"
}

# Trap signals for a graceful exit
trap 'echo "Exiting..."; exit 0;' SIGINT SIGTERM

# Main loop
while true; do
    islocked=$(is_screen_locked)

    if [ "$islocked" = true ]; then
        curtitle="__LOCKEDSCREEN"
    else
        curtitle=$(get_current_window_title)
    fi

    T="$(date +%s)"
    if [[ "$lasttitle" != "$curtitle" ]] || (( T - last_write >= maxtime )); then
        write_log "$curtitle"
    fi

    sleep "$waittime"
done
