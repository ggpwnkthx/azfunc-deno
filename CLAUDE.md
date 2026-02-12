# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Azure Functions custom handler written in Deno. It allows running Azure Functions triggers (HTTP, Queue, Blob, etc.) using Deno as the runtime instead of C#/Node.js/Python. The framework is designed to be abstract over trigger types - it infers triggers dynamically rather than hardcoding specific types.

## Commands

```bash
# Generate function.json files from function definitions
deno task gen

# Run the custom handler server (port from FUNCTIONS_CUSTOMHANDLER_PORT env, default 8080)
deno task serve

# Development: regenerate function.json then serve with file watching
deno task dev
```

## Architecture

### Function Discovery Pattern
Functions can be discovered in two ways:
1. **Manifest** (`<root>/manifest.ts`) - Export an array of `FunctionDefinition` objects
2. **Auto-discovery** - Scan for `**/index.ts` directories and import exported definitions

Functions are defined using either:
- `defineHttpFunction()` - For HTTP triggers (handler receives standard `Request`)
- `defineTriggerFunction()` - For non-HTTP triggers (queue, blob, timer, etc.)

### Directory Structure
- `src/azure/functions/` - Core framework code
  - `bindings/` - Binding type definitions for all Azure trigger/output types
  - `lib/` - Utilities (errors, JSON, path, streams, validation)
  - `define.ts` - Function definition builders
  - `router.ts` - Request routing to function handlers
  - `scanner.ts` - Function discovery (manifest + directory scanning)
  - `generator.ts` - Generates `function.json` files from definitions
  - `invoke.ts` - Custom handler request/response serialization
- `<functionDir>/` - Function implementations (e.g., `api/`, `queue_trigger/`)
- `serve.ts` - Entry point for the custom handler HTTP server

### Data Flow
1. Azure Functions host sends POST to custom handler (`serve.ts`)
2. Router parses `InvokeRequest` payload, routes to matching function
3. Handler executes with appropriate context
4. Handler returns `InvokeResponse` (or `Response` for HTTP)
5. Router serializes and returns JSON to host

### Key Types
- `InvokeRequest<TData, TMetadata>` - Incoming trigger data from host
- `InvokeResponse<TOutputs, TReturnValue>` - Response to return to host
- `HttpContext` / `TriggerContext` - Handler context objects

### Error Handling
Use `AppError` from `@azure/functions` for structured errors:
```typescript
throw new AppError("ERROR_CODE", "Human readable message", { details: {...} })
```

## Adding New Functions

Create a directory with `index.ts` exporting a function definition:

```typescript
// my_function/index.ts
import { bindings, defineTriggerFunction } from "@azure/functions";

export const myFunction = defineTriggerFunction({
  dir: "my_function",
  functionJson: {
    bindings: [
      bindings.queueTrigger({ name: "item", queueName: "myqueue", connection: "AzureWebJobsStorage" }),
      bindings.queueOut({ name: "$return", queueName: "outqueue", connection: "AzureWebJobsStorage" }),
    ],
  },
  handler(payload): InvokeResponse {
    return { ReturnValue: payload.Data.item };
  },
});
```

Run `deno task gen` to generate the `function.json` file.
