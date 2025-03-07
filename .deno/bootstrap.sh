#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
$SCRIPT_DIR/install.sh
cd $SCRIPT_DIR/..
$SCRIPT_DIR/deno clean
rm -r $SCRIPT_DIR/../node_modules
$SCRIPT_DIR/deno install