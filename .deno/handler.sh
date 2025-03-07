#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
$SCRIPT_DIR/install.sh
$SCRIPT_DIR/deno serve -A --port $FUNCTIONS_CUSTOMHANDLER_PORT $SCRIPT_DIR/../func.ts