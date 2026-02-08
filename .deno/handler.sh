#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd $SCRIPT_DIR/..
$SCRIPT_DIR/bootstrap.sh
PORT="${FUNCTIONS_CUSTOMHANDLER_PORT:-8000}"
$SCRIPT_DIR/deno serve -A --port $PORT $@