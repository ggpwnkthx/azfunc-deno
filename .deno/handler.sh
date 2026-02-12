#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/.."   # <-- this is what you intended

# Only bootstrap if the Deno binary isn't already present
if [[ ! -f "$SCRIPT_DIR/deno" ]]; then
  chmod +x "$SCRIPT_DIR/bootstrap.sh"
  "$SCRIPT_DIR/bootstrap.sh"
fi
chmod +x "$SCRIPT_DIR/deno"
exec "$SCRIPT_DIR/deno" task serve
