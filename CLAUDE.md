# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Commands

```bash
# Generate function.json files for all functions
deno task gen

# Run the custom handler server (default port 8080)
deno task serve

# Development: generate function.json and run with file watching
deno task dev
```

## Architecture

This is an Azure Functions custom handler for Deno runtime. It enables running
Azure Functions with Deno by implementing the custom handler protocol.

### Core Flow

1. **Function Definition** (`src/azure/functions/define.ts`): Functions are
   defined using `defineHttpFunction()` or `defineTriggerFunction()` and
   exported from module files.

2. **Discovery** (`src/azure/functions/scanner.ts`): Functions are discovered via:
   - A `manifest.ts` file in the functions root (fast path - exports all definitions)
   - Auto-discovery: scans for `**/index.ts` files and imports to find exported
     definitions

3. **Routing** (`src/azure/functions/router.ts`): The router handles requests:
   - HTTP triggers: routes based on `httpTrigger.route` (or function name if
     omitted). Routes are sorted by specificity (more literals = higher priority).
   - Non-HTTP triggers (queue, blob, etc.): receives POST requests at
     `/<FunctionName>`
   - Route prefix defaults to `api`; configurable via `AzureFunctionsJobHost__extensions__http__routePrefix`
     or `FUNCTIONS_HTTP_ROUTE_PREFIX` environment variables

4. **Generation** (`src/azure/functions/generator.ts`): Writes `function.json`
   files for each function (required by Azure Functions)

5. **Server** (`serve.ts`): Entry point that creates the router and serves on
   the port specified by `FUNCTIONS_CUSTOMHANDLER_PORT` (default 8080)

### Key Files

- `src/azure/functions/mod.ts`: Safe public exports for function modules (no
  router/scanner/generator to avoid TLA cycles). Exports `bindings`, `defineHttpFunction`,
  `defineTriggerFunction`, plus utilities: `AppError`, `toErrorResponse`, `assert`,
  `readJsonBodyLimited`, `tryParseJson`, `joinPosix`.
- `src/azure/functions/bindings/index.ts`: Type definitions and builders for all
  binding types (HTTP, blob, queue, etc.)
- `src/azure/functions/lib/`: Utility modules (errors, validation, JSON, path)

### Function Module Pattern

Each function lives in its own directory with an `index.ts` that exports a
definition:

```typescript
import { bindings, defineHttpFunction } from "@azure/functions";

export const myFunc = defineHttpFunction({
  dir: "myFunc", // directory name, must be unique
  functionJson: {
    bindings: [
      bindings.httpTrigger({ name: "req", route: "users/{id}" }),
      bindings.httpOut({ name: "res" }),
    ],
  },
  handler(request, ctx) {
    return Response.json({ params: ctx.params });
  },
});
```

### Trigger functions return outputs via Response body

```typescript
return Response.json({
  Outputs: {
    queueOut: transformedData, // binding name -> value
  },
  Logs: ["log message"],
});
```

### Custom bindings

For Azure Functions extension bindings not modeled above, use `bindings.custom()`:

```typescript
bindings.custom({
  type: "myExtension",
  name: "input",
  direction: "in",
  // extension-specific properties...
}),
```
