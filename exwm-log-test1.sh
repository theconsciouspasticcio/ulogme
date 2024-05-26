#!/bin/bash

LANG=en_US.utf8

# logs the active window titles over time. Logs are written
# in logs/windowX.txt, where X is unix timestamp of 7am of the
# recording day. The logs are written if a window change event occurs
# (with 2 second frequency check time), or every 10 minutes if
# no changes occur.

waittime="2" # number of seconds between executions of loop
maxtime="600" # if last write happened more than this many seconds ago, write even if no window title changed

# Ensure the logs directory exists
mkdir -p logs

last_write="0"
lasttitle=""

while true
do
    islocked=true

    # Try to figure out which Desktop Manager is running and set the screensaver commands accordingly.
    if [[ $GDMSESSION == 'xfce' ]]; then
        screensaverstate=$(xscreensaver-command -time | cut -f2 -d: | cut -f2-3 -d' ')
        if [[ $screensaverstate =~ "screen non-blanked" ]]; then islocked=false; fi
    elif [[ $GDMSESSION == 'ubuntu' || $GDMSESSION == 'ubuntu-2d' || $GDMSESSION == 'gnome-shell' || $GDMSESSION == 'gnome-classic' || $GDMSESSION == 'gnome-fallback' || $GDMSESSION == 'cinnamon' ]]; then
        screensaverstate=$(gnome-screensaver-command -q >/dev/null 2>&1)
        if [[ $screensaverstate =~ .*inactive.* ]]; then islocked=false; fi
    elif [[ $XDG_SESSION_DESKTOP == 'KDE' ]]; then
        islocked=$(qdbus org.kde.screensaver /ScreenSaver org.freedesktop.ScreenSaver.GetActive)
    else
        islocked=false
    fi

    if [ "$islocked" = true ]; then
        curtitle="__LOCKEDSCREEN"
    else
        id=$(xdotool getactivewindow 2>/dev/null)
        if [ -n "$id" ]; then
            curtitle=$(wmctrl -lpG | while read -a a; do w=${a[0]}; if [[ $((16#${w:2})) -eq $id ]]; then echo "${a[@]:8}"; break; fi; done)
        else
            curtitle=$(emacsclient -e '(if (eq (window-dedicated-p (selected-window)) nil) (buffer-name (window-buffer (selected-window))) "Dedicated")' | sed s/\"//g)
        fi
    fi

    perform_write=false
    T="$(date +%s)"
    if [[ "$lasttitle" != "$curtitle" ]]; then
        perform_write=true
    elif (( T - last_write >= maxtime )); then
        perform_write=true
    fi

    if [ "$perform_write" = true ]; then
        logfile="logs/window_$(python rewind7am.py).txt"
        echo "$T $curtitle" >> "$logfile"
        echo "logged window title: $(date) $curtitle into $logfile"
        last_write=$T
    fi

    lasttitle="$curtitle"
    sleep "$waittime"
done
