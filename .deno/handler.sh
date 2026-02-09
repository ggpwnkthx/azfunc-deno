#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
$SCRIPT_DIR/bootstrap.sh

if [ -n "$AzureFunctionsDevelopmentEnvironment" ]; then
    $SCRIPT_DIR/deno run -A --watch $@
else
    $SCRIPT_DIR/deno run -A $@
fi