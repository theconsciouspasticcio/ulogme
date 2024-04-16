#!/usr/bin/env sh

#!/bin/bash

LANG=en_US.utf8

# logs the active window titles over time. Logs are written
# in logs/windowX.txt, where X is unix timestamp of 7am of the
# recording day. The logs are written if a window change event occurs
# (with 2 second frequency check time), or every 10 minutes if
# no changes occur.

waittime="2" # number of seconds between executions of loop
maxtime="600" # if last write happened more than this many seconds ago, write even if no window title changed
#------------------------------

mkdir -p logs
last_write="0"
lasttitle=""
while true
do
    islocked=true
    # Screensaver checks...
    # [Your existing screensaver check code here]
##############################
	# Try to figure out which Desktop Manager is running and set the
	# screensaver commands accordingly.
	if [[ $GDMSESSION == 'xfce' ]]; then
		# Assume XFCE folks use xscreensaver (the default).
		screensaverstate=$(xscreensaver-command -time | cut -f2 -d: | cut -f2-3 -d' ')
		if [[ $screensaverstate =~ "screen non-blanked" ]]; then islocked=false; fi
	elif [[ $GDMSESSION == 'ubuntu' || $GDMSESSION == 'ubuntu-2d' || $GDMSESSION == 'gnome-shell' || $GDMSESSION == 'gnome-classic' || $GDMSESSION == 'gnome-fallback' || $GDMSESSION == 'cinnamon' ]]; then
		# Assume the GNOME/Ubuntu/cinnamon folks are using gnome-screensaver.
		screensaverstate=$(gnome-screensaver-command -q 2>&1 /dev/null)
		if [[ $screensaverstate =~ .*inactive.* ]]; then islocked=false; fi
	elif [[ $XDG_SESSION_DESKTOP == 'KDE' ]]; then
		islocked=$(qdbus org.kde.screensaver /ScreenSaver org.freedesktop.ScreenSaver.GetActive)
	else
		# If we can't find the screensaver, assume it's missing.
		islocked=false
	fi

##############################
if [ "$islocked" = true ]; then
        curtitle="__LOCKEDSCREEN"
    else
        # Attempt to get the active window using xdotool
        id=$(xdotool getactivewindow 2>/dev/null)  # Suppress error messages
        if [ -n "$id" ]; then
            # If an ID was found, it's an X11 window
            curtitle=$(wmctrl -lpG | while read -a a; do w=${a[0]}; if [[ $((16#${w:2})) -eq $id ]]; then echo "${a[@]:8}"; break; fi; done)
        else
            # If no ID, it's likely an Emacs buffer in EXWM
            curtitle=$(emacsclient -e '(if (eq (window-dedicated-p (selected-window)) nil) (buffer-name (window-buffer (selected-window))) "Dedicated")' | sed s/\"//g)
        fi
    fi

    if [[ "$lasttitle" != "$curtitle" ]]; then
        perform_write=true
    else
        perform_write=false
    fi

    T="$(date +%s)"
    if [ "$perform_write" = true ]; then
        logfile="logs/window_$(python rewind7am.py).txt"
        echo "$T $curtitle" >> $logfile
        echo "logged window title: $(date) $curtitle into $logfile"
        last_write=$T
    fi

    lasttitle="$curtitle"
    sleep "$waittime"
done
