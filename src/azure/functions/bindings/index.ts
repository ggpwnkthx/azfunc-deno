/**
 * Azure Functions `function.json` bindings.
 *
 * Docs/examples: https://github.com/Azure/azure-functions-host/wiki/function.json
 * JSON Schema (SchemaStore): https://www.schemastore.org/function.json
 */

import { isRecord } from "./types.ts";

import type { CustomBinding } from "./types.ts";

import type { HttpBinding } from "./http.ts";
import type { StorageBinding } from "./storage.ts";
import type { ServiceBusBinding } from "./service-bus.ts";
import type { EventHubBinding } from "./event-hub.ts";
import type { TimerBinding } from "./timer.ts";
import type { DatabaseBinding } from "./database.ts";
import type { NotificationBinding } from "./notifications.ts";

/* ----------------------------- Re-exports ----------------------------- */

// types.ts (export generic Binding under a different name to avoid confusion)
export type {
  AssertSingleTrigger,
  AuthLevel,
  Binding as BindingDefinition,
  BindingBase,
  BindingBuilder,
  BindingBuilderWithDefaults,
  BindingNames,
  BuilderArgs,
  BuilderArgsWithDefaults,
  BuildResponseOutputs,
  CustomBinding,
  DataTypeHint,
  Direction,
  ExtractTrigger,
  ExtraOf,
  InputBindingNames,
  InputBindingsMap,
  KnownBindingType,
  OutputBindingNames,
  OutputBindingsMap,
  TriggerCount,
} from "./types.ts";

export {
  createBindingGuard,
  defineBinding,
  defineInBinding,
  defineInOutBinding,
  defineOutBinding,
  isKnownBindingType,
  isRecord,
  KNOWN_BINDING_TYPES,
  makeBindingBuilder,
} from "./types.ts";

// All binding modules
export * from "./http.ts";
export * from "./storage.ts";
export * from "./service-bus.ts";
export * from "./event-hub.ts";
export * from "./timer.ts";
export * from "./database.ts";
export * from "./notifications.ts";

/* --------------------------------- Unions -------------------------------- */

export type Binding =
  | HttpBinding
  | StorageBinding
  | ServiceBusBinding
  | EventHubBinding
  | TimerBinding
  | DatabaseBinding
  | NotificationBinding
  | CustomBinding;

export interface RetryPolicy {
  strategy?: "exponentialBackoff" | "fixedDelay";
  maxRetryCount?: number;
  delayInterval?: string;
  minimumInterval?: string;
  maximumInterval?: string;
}

export type FunctionJson = FunctionConfig & { bindings: Binding[] };

export type FunctionConfig = {
  disabled?: boolean;
  excluded?: boolean;
  scriptFile?: string;
  entryPoint?: string;
  configurationSource?: "attributes" | "config";
  retry?: RetryPolicy;
};

/* ------------------------------ Type guards ------------------------------ */

export function isBinding(obj: unknown): obj is Binding {
  if (!isRecord(obj)) return false;
  const b = obj as Record<string, unknown>;
  const dir = b.direction;
  return (
    typeof b.type === "string" &&
    typeof b.name === "string" &&
    (dir === "in" || dir === "out" || dir === "inout")
  );
}
