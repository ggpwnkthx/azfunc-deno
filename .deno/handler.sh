#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
$SCRIPT_DIR/install.sh
$SCRIPT_DIR/deno serve -A $SCRIPT_DIR/../func.ts