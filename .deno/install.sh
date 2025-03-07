#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
if [ ! -f $SCRIPT_DIR/deno ]; then
  if [ ! -f $SCRIPT_DIR/7zz ]; then
    if [ ! -f $SCRIPT_DIR/xz ]; then
      $SCRIPT_DIR/fetch.sh https://github.com/polaco1782/linux-static-binaries/raw/refs/heads/master/x86-i686/xz > $SCRIPT_DIR/xz
      chmod +x $SCRIPT_DIR/xz
    fi
    $SCRIPT_DIR/fetch.sh "https://7-zip.org/a/7z2409-linux-x64.tar.xz" | $SCRIPT_DIR/xz -dc | tar -xf - -C $SCRIPT_DIR 7zz
    rm $SCRIPT_DIR/xz
  fi
  $SCRIPT_DIR/fetch.sh "https://github.com/denoland/deno/releases/download/v2.2.3/deno-x86_64-unknown-linux-gnu.zip" > $SCRIPT_DIR/deno.zip
  $SCRIPT_DIR/7zz x $SCRIPT_DIR/deno.zip -o$SCRIPT_DIR
  rm $SCRIPT_DIR/deno.zip
  rm $SCRIPT_DIR/7zz
fi

if [ ! -f /usr/bin/deno ]; then
  ln -s $SCRIPT_DIR/deno /usr/bin/deno
fi