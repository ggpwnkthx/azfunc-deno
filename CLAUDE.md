# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Azure Functions v4 project using **Deno as a Custom Handler**. The Deno runtime executes as a custom executable that Azure Functions invokes for HTTP requests.

## Commands

```bash
# Start Azure Functions host (runs Deno custom handler)
func start

# Run Deno directly (port 8000) - useful for local development
deno run -A --port 8000 serve.ts

# Run with custom port
FUNCTIONS_CUSTOMHANDLER_PORT=8080 deno run -A --port 8080 serve.ts

# Format code
deno fmt

# Lint code
deno lint

# Install dependencies (auto-downloads Deno if not present)
.deno/install.sh

# Deploy to Azure
func azure functionapp publish <function-app-name>
```

## Architecture

**Azure Functions + Deno Custom Handler Flow:**

1. `host.json` configures the custom handler with `.deno/handler.sh serve.ts` as the executable
2. `handler.sh` runs `bootstrap.sh` which downloads/installs Deno, then invokes `deno serve`
3. `serve.ts` exports a default fetch handler for HTTP requests
4. Azure Functions forwards HTTP requests to the Deno handler on port 8000 (configurable via `FUNCTIONS_CUSTOMHANDLER_PORT`)
5. The `enableForwardingHttpRequest` setting in `host.json` allows Azure Functions to handle trigger bindings while passing requests to the custom handler

**Request Processing:**
- `functions/function.json` defines HTTP trigger bindings with wildcard route `{route}` and anonymous auth
- All HTTP methods (get, post, put, delete, option) are supported

**Key Files:**
- `serve.ts`: Main application entry point with fetch handler
- `host.json`: Azure Functions host configuration with custom handler setup
- `functions/function.json`: HTTP trigger bindings (wildcard route, anonymous auth)
- `.deno/handler.sh`: Shell script that invokes Deno with serve.ts
- `.deno/bootstrap.sh`: Ensures Deno is installed before running
- `.deno/install.sh`: Downloads and installs Deno binary if not present
- `deno.jsonc`: Deno configuration with npm imports for @azure/functions
