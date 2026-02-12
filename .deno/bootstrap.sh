#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
chmod +x $SCRIPT_DIR/install.sh && $SCRIPT_DIR/install.sh
cd $SCRIPT_DIR/..