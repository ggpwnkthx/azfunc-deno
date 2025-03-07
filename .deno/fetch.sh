#!/bin/bash
# This script is a basic HTTP client for fetching the content of a URL when utilities like curl or wget are not available.
# It supports following up to 5 HTTP redirects and handles both HTTP and HTTPS protocols using bash built-ins,
# openssl for HTTPS, and a built-in TCP connection for HTTP.

# Exit immediately if a command exits with a non-zero status,
# treat unset variables as an error, and propagate errors in pipelines.
set -euo pipefail

# Ensure Perl does not emit warnings for non-ASCII characters.
export PERL_BADLANG=0

# usage() displays the correct command usage and exits with an error.
usage() {
  # Print usage message to stderr.
  printf "Usage: %s URL\n" "$0" >&2
  exit 1
}

# Ensure that exactly one argument (the URL) is provided.
if [ "$#" -ne 1 ]; then
  usage
fi

# fetch() downloads the content from a given URL, following up to 5 redirects.
# It outputs the response body (binary-safe) to stdout.
#
# Parameters:
#   $1 - The URL to fetch.
#
# Behavior:
#   - It extracts protocol, host, and path from the URL.
#   - It determines the appropriate port (443 for HTTPS, 80 for HTTP).
#   - It builds an HTTP GET request with a simple User-Agent.
#   - It sends the request using:
#       - openssl s_client for HTTPS connections.
#       - a direct TCP connection via /dev/tcp for HTTP connections.
#   - It checks the HTTP status code:
#       - If 200 OK, it outputs the response body.
#       - If a redirect (3xx), it follows the "Location" header to a new URL.
#       - Otherwise, it outputs an error message.
#
# Note:
#   The response is processed by a Perl one-liner that strips out the HTTP headers.
fetch() {
  local url="$1"          # Initial URL to fetch.
  local max_redirects=5     # Maximum number of allowed HTTP redirects.
  local user_agent="Mozilla/5.0 (X11; Linux x86_64)"  # User-Agent header for the request.
  local i new_url proto host port path request tmpfile status_line

  # Loop to follow HTTP redirects up to max_redirects.
  for ((i=0; i<max_redirects; i++)); do
    # Parse the protocol (e.g., http, https) from the URL.
    proto=$(printf "%s" "$url" | awk -F:// '{print $1}')
    # Parse the host (domain or IP) from the URL.
    host=$(printf "%s" "$url" | awk -F/ '{print $3}')
    # Extract the path part of the URL. Default to "/" if empty.
    path=$(printf "%s" "$url" | cut -d'/' -f4-)
    if [ -z "$path" ]; then
      path="/"
    else
      path="/$path"
    fi

    # Set the port based on the protocol: 443 for HTTPS, 80 for HTTP.
    if [ "$proto" = "https" ]; then
      port=443
    else
      port=80
    fi

    # Build the HTTP GET request string with proper HTTP formatting.
    request="GET $path HTTP/1.1\r\nHost: $host\r\nUser-Agent: $user_agent\r\nConnection: close\r\n\r\n"
    
    # Create a temporary file to store the complete HTTP response.
    tmpfile=$(mktemp)

    # Send the HTTP request and capture the response:
    if [ "$proto" = "https" ]; then
      # For HTTPS, use openssl s_client to establish a secure connection.
      printf '%b' "$request" | openssl s_client -quiet -connect "${host}:${port}" 2>/dev/null > "$tmpfile"
    else
      # For HTTP, use bash's built-in /dev/tcp feature to open a TCP connection.
      if ! exec 3<>"/dev/tcp/${host}/${port}"; then
        printf "Failed to connect to %s:%s\n" "$host" "$port" >&2
        rm -f "$tmpfile"
        return 1
      fi
      # Send the request to the server via the open TCP connection.
      printf '%b' "$request" >&3
      # Read the entire response from the server.
      cat <&3 > "$tmpfile"
      # Close the TCP connection.
      exec 3>&-
    fi

    # Read the first line of the response to extract the HTTP status code.
    status_line=$(head -n 1 "$tmpfile")

    # Check if the response status indicates a successful request (200 OK).
    if echo "$status_line" | grep -q "HTTP/1\.[01] 200"; then
      # Use Perl to slurp the full response and remove HTTP headers.
      perl -0777 -e 'undef $/; $_ = <>; s/.*?\r\n\r\n//s; print' "$tmpfile"
      rm -f "$tmpfile"
      return 0
    fi

    # Check if the response status indicates a redirection (HTTP 3xx).
    if echo "$status_line" | grep -q "HTTP/1\.[01] 3[0-9][0-9]"; then
      # Extract the new URL from the "Location" header.
      new_url=$(grep -ai "^Location:" "$tmpfile" | head -n1 | awk '{print $2}' | tr -d '\r')
      if [ -z "$new_url" ]; then
        printf "Redirect location not found.\n" >&2
        rm -f "$tmpfile"
        return 1
      fi
      # Update the URL to the new location and clean up the temporary file.
      url="$new_url"
      rm -f "$tmpfile"
      # Continue with the next iteration to fetch the new URL.
      continue
    fi

    # If the response is neither a 200 OK nor a 3xx redirect, output an error message.
    printf "Unexpected response:\n%s\n" "$status_line" >&2
    rm -f "$tmpfile"
    return 1
  done

  # If the maximum number of redirects is exceeded, output an error.
  printf "Too many redirects.\n" >&2
  return 1
}

# Call the fetch function with the provided URL argument.
fetch "$1"
