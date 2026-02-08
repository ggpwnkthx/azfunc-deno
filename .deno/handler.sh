#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
$SCRIPT_DIR/bootstrap.sh
$SCRIPT_DIR/deno serve -A --port ${FUNCTIONS_CUSTOMHANDLER_PORT:-8000} $@