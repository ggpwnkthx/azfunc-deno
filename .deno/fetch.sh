#!/bin/bash
set -euo pipefail
export PERL_BADLANG=0

usage() {
  printf "Usage: %s URL\n" "$0" >&2
  exit 1
}

if [ "$#" -ne 1 ]; then
  usage
fi

# fetch() downloads the content from a URL (following up to 5 redirects)
# and outputs the response body (binary-safe) to stdout.
fetch() {
  local url="$1"
  local max_redirects=5
  local user_agent="Mozilla/5.0 (X11; Linux x86_64)"
  local i new_url proto host port path request tmpfile status_line

  for ((i=0; i<max_redirects; i++)); do
    # Parse URL components
    proto=$(printf "%s" "$url" | awk -F:// '{print $1}')
    host=$(printf "%s" "$url" | awk -F/ '{print $3}')
    path=$(printf "%s" "$url" | cut -d'/' -f4-)
    if [ -z "$path" ]; then
      path="/"
    else
      path="/$path"
    fi

    # Set port based on protocol
    if [ "$proto" = "https" ]; then
      port=443
    else
      port=80
    fi

    # Build HTTP request string
    request="GET $path HTTP/1.1\r\nHost: $host\r\nUser-Agent: $user_agent\r\nConnection: close\r\n\r\n"
    
    # Create a temporary file to store the full response.
    tmpfile=$(mktemp)

    # Send the HTTP request and capture the response
    if [ "$proto" = "https" ]; then
      printf '%b' "$request" | openssl s_client -quiet -connect "${host}:${port}" 2>/dev/null > "$tmpfile"
    else
      if ! exec 3<>"/dev/tcp/${host}/${port}"; then
        printf "Failed to connect to %s:%s\n" "$host" "$port" >&2
        rm -f "$tmpfile"
        return 1
      fi
      printf '%b' "$request" >&3
      cat <&3 > "$tmpfile"
      exec 3>&-
    fi

    # Get the status line (first line) to check the response code.
    status_line=$(head -n 1 "$tmpfile")

    if echo "$status_line" | grep -q "HTTP/1\.[01] 200"; then
      # Use Perl to slurp the file and remove everything up to the first "\r\n\r\n"
      perl -0777 -e 'undef $/; $_ = <>; s/.*?\r\n\r\n//s; print' "$tmpfile"
      rm -f "$tmpfile"
      return 0
    fi

    if echo "$status_line" | grep -q "HTTP/1\.[01] 3[0-9][0-9]"; then
      # Extract the new URL from the Location header for a redirect.
      new_url=$(grep -ai "^Location:" "$tmpfile" | head -n1 | awk '{print $2}' | tr -d '\r')
      if [ -z "$new_url" ]; then
        printf "Redirect location not found.\n" >&2
        rm -f "$tmpfile"
        return 1
      fi
      url="$new_url"
      rm -f "$tmpfile"
      continue
    fi

    printf "Unexpected response:\n%s\n" "$status_line" >&2
    rm -f "$tmpfile"
    return 1
  done

  printf "Too many redirects.\n" >&2
  return 1
}

fetch "$1"
