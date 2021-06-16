#!/bin/bash
SRC_DIR=$(dirname $(realpath $0))

# Need to be in directory to run
cd $SRC_DIR
python2 ./ulogme_serve.py & bash ./ulogme.sh

