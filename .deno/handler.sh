#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
$SCRIPT_DIR/bootstrap.sh

if [ -n "$AzureFunctionsDevelopmentEnvironment" ]; then
    $SCRIPT_DIR/deno task dev
else
    $SCRIPT_DIR/deno task serve
fi