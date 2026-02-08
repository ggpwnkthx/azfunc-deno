# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Azure Functions v4 project using **Deno as a Custom Handler**. The Deno runtime executes as a custom executable that Azure Functions invokes for HTTP requests.

## Commands

```bash
# Start Azure Functions host (runs Deno custom handler)
func start

# Run Deno directly (port 8000)
deno run -A --port 8000 serve.ts

# Format code
deno fmt

# Lint code
deno lint

# Install dependencies
deno install
```

## Architecture

**Azure Functions + Deno Custom Handler Flow:**
1. `host.json` configures the custom handler with `.deno/handler.sh serve.ts` as the executable
2. The shell script runs Deno, which loads `serve.ts`
3. `serve.ts` exports a default fetch handler for HTTP requests
4. Azure Functions forwards HTTP requests to the Deno handler on port 8000 (configurable via `FUNCTIONS_CUSTOMHANDLER_PORT`)

**Key Files:**
- `serve.ts`: Main application entry point with fetch handler
- `host.json`: Azure Functions host configuration with custom handler setup
- `functions/function.json`: HTTP trigger bindings (wildcard route, anonymous auth)
- `.deno/handler.sh`: Shell script that invokes Deno with serve.ts
- `deno.jsonc`: Deno configuration with npm imports for @azure/functions
