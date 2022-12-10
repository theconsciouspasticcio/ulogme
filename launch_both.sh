#!/bin/bash
SRC_DIR=${0%/*}

# Need to be in directory to run
pushd $SRC_DIR
ps aux | grep '[u]logme' | grep -v 'tmux' | awk '{print $2}' | grep -v 'tmux' | xargs kill

/usr/bin/python3 ./ulogme_serve.py & bash ./ulogme.sh
