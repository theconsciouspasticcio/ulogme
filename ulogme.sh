#!/bin/bash
set eux -pipefail

SRC_DIR=$(/usr/bin/dirname $(/usr/local/bin/realpath $0))

# Need to be in directory to run
cd $SRC_DIR
if [ "$(uname)" == "Darwin" ]; then
  # This is a Mac
  ./osx/run_ulogme_osx.sh
else
  # Assume Linux
  sudo echo -n ""
  sudo ./keyfreq.sh &
  ./logactivewin.sh
fi
