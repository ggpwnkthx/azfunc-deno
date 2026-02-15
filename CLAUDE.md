# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Azure Functions runtime for Deno. Uses Azure's Custom Handler protocol to run
Deno functions on Azure Functions.

## Commands

```bash
deno task dev      # Generate function.json and run in watch mode
deno task build    # Generate function.json and compile to binary
deno task publish  # Build and deploy to Azure Function App
deno task gen      # Only generate function.json files
deno fmt           # Format code
deno lint          # Lint code
deno check         # Type-check
```

## Architecture

### Function Definition

Functions are defined using `defineFunction()` from `@azure/functions`:

```typescript
import { bind, defineFunction } from "@azure/functions";

export default defineFunction({
  name: "myFunction",
  bindings: [
    bind.http.trigger({ name: "req", route: "api/{*route}" }),
    bind.http.output({ name: "res" }),
  ],
  handler(payload, ctx) {
    return new Response("Hello");
  },
});
```

### App Registry

Register functions with `AzureFunctionsApp` in `handler.ts`:

```typescript
import { AzureFunctionsApp } from "@azure/functions";
import myFunction from "./src/functions/myFunction.ts";

const app = new AzureFunctionsApp();
app.register(myFunction);

if (import.meta.main) {
  await app.serve();
}
```

### Binding System

Located in `src/azure/functions/bindings/`. Each binding type has builder
functions:

- `bind.http` - HTTP trigger and output
- `bind.storage.blob` - Blob trigger, input, output
- `bind.storage.queue` - Queue trigger, output
- `bind.storage.table` - Table input, output
- `bind.serviceBus` - Service Bus trigger/output
- `bind.eventHub` - Event Hub trigger/output
- `bind.timer` - Timer trigger
- `bind.database` - SQL bindings

### Custom Handler Protocol

The runtime uses Azure's Custom Handler - HTTP POST requests with
`InvokeRequest` body:

```typescript
{
  Data: { triggerBindingName: triggerData },
  Metadata: { invocationId, ... }
}
```

Response uses `InvokeResponse` format with `Outputs` and `ReturnValue`.

### Generator

Run with `--gen` flag to auto-generate `function.json` files from TypeScript
definitions. Each registered function gets its own directory with
`function.json` and optionally `readme.md`.

### Key Files

- `handler.ts` - App entry point
- `src/azure/functions/mod.ts` - Public exports
- `src/azure/functions/app.ts` - AzureFunctionsApp class
- `src/azure/functions/define.ts` - defineFunction factory
- `src/azure/functions/invoke.ts` - InvokeRequest/InvokeResponse types
- `src/azure/functions/router.ts` - Request routing
