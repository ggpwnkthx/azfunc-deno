#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd $SCRIPT_DIR/..
$SCRIPT_DIR/bootstrap.sh
$SCRIPT_DIR/deno serve --port $FUNCTIONS_CUSTOMHANDLER_PORT $@