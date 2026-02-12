#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
chmod +x "$SCRIPT_DIR/fetch.sh"

# Only proceed if "deno" is not already present in the script directory.
if [ ! -f "$SCRIPT_DIR/deno" ]; then

  # Check if unzip is available system-wide.
  if command -v unzip > /dev/null 2>&1; then
    UNZIP_CMD="unzip"
  else
    # unzip is not available: check for local 7zz.
    if [ ! -f "$SCRIPT_DIR/7zz" ]; then
      # Determine which xz to use: system-wide or local.
      if command -v xz > /dev/null 2>&1; then
        XZ_CMD="xz"
      elif [ -f "$SCRIPT_DIR/xz" ]; then
        XZ_CMD="$SCRIPT_DIR/xz"
      else
        # Download the local xz binary since it's not available system-wide or in SCRIPT_DIR.
        "$SCRIPT_DIR/fetch.sh" "https://github.com/polaco1782/linux-static-binaries/raw/refs/heads/master/x86-i686/xz" > "$SCRIPT_DIR/xz"
        chmod +x "$SCRIPT_DIR/xz"
        XZ_CMD="$SCRIPT_DIR/xz"
      fi

      # Download and extract the 7zz binary using the selected xz.
      "$SCRIPT_DIR/fetch.sh" "https://7-zip.org/a/7z2409-linux-x64.tar.xz" | $XZ_CMD -dc | tar -xf - -C "$SCRIPT_DIR" 7zz

      # Clean up the locally downloaded xz if we downloaded it.
      if [ "$XZ_CMD" = "$SCRIPT_DIR/xz" ]; then
        rm "$SCRIPT_DIR/xz"
      fi
    fi
    UNZIP_CMD="$SCRIPT_DIR/7zz"
  fi

  # Download the Deno binary archive.
  "$SCRIPT_DIR/fetch.sh" "https://github.com/denoland/deno/releases/download/v2.6.8/deno-x86_64-unknown-linux-gnu.zip" > "$SCRIPT_DIR/deno.zip"

  # Extract the archive using the chosen extraction command.
  if [ "$UNZIP_CMD" = "unzip" ]; then
    unzip "$SCRIPT_DIR/deno.zip" -d "$SCRIPT_DIR"
  else
    "$SCRIPT_DIR/7zz" x "$SCRIPT_DIR/deno.zip" -o"$SCRIPT_DIR"
  fi

  rm "$SCRIPT_DIR/deno.zip"

  # If 7zz was used (downloaded locally), remove it.
  if [ "$UNZIP_CMD" != "unzip" ]; then
    rm "$SCRIPT_DIR/7zz"
  fi
fi

# Create a symlink to /usr/bin/deno if it doesn't exist.
if [ ! -f /usr/bin/deno ]; then
  ln -s "$SCRIPT_DIR/deno" /usr/bin/deno
fi

chmod +x "$SCRIPT_DIR/deno"
