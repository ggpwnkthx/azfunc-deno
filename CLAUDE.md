# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

**azfunc-deno** is a Deno-based Azure Functions runtime using Custom Handlers.
It provides a type-safe, registration-based approach for defining Azure
Functions with Deno.

## Commands

```bash
# Generate function.json files (required before running/deploying)
deno task gen

# Development with hot reload
deno task dev

# Build standalone binary
deno task build

# Deploy to Azure
deno task publish
```

## Architecture

### Registration-Based Design

Functions are explicitly registered rather than auto-discovered. The workflow:

1. Register functions in `handler.ts` using `app.register()`
2. Define functions with `defineHttpFunction()` or `defineTriggerFunction()`
3. Run `deno task gen` to auto-generate `function.json` files for Azure

### Core Entry Points

- **handler.ts**: Main entry point that registers functions and starts the
  server
- **src/azure/functions/mod.ts**: Public API (`@azure/functions` namespace)
- **src/azure/functions/app.ts**: `AzureFunctionsApp` class - registry for all
  functions

### Key Components

| File           | Purpose                                                                             |
| -------------- | ----------------------------------------------------------------------------------- |
| `app.ts`       | Main app class - handles registration, serving, and function.json generation        |
| `define.ts`    | `defineHttpFunction()` and `defineTriggerFunction()` - function definition builders |
| `router.ts`    | HTTP router for handling function invocations via custom handler protocol           |
| `generator.ts` | Generates `function.json` from registered functions                                 |
| `bindings/`    | Type-safe Azure binding definitions (http, blob, queue, timer, etc.)                |

### Data Flow

1. Azure Functions host sends request to custom handler
2. `router.ts` parses the custom handler protocol
3. Matches request to registered function by route/functionId
4. Invokes handler with typed input
5. Returns response in custom handler format

### Type Safety Pattern

Bindings are builder functions that enforce types at definition time:

```typescript
app.http("myFunc", {
  methods: ["GET"],
  route: "users/{id}",
  handler: (req, context) => { ... }
})
```

## Dependencies

- **Deno** - Runtime (no Node.js)
- **@std/path** - Standard library path utilities
- Custom `@azure/functions` implementation (local, not npm package)

## Azure-Specific Files

- `host.json`: Azure Functions host configuration
- `.funcignore`: Files to exclude from deployment
- `local.settings.json`: Local development secrets (gitignored)
