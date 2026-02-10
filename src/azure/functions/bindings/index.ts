/**
 * Azure Functions `function.json` bindings.
 *
 * Docs/examples: https://github.com/Azure/azure-functions-host/wiki/function.json
 * JSON Schema (SchemaStore): https://www.schemastore.org/function.json
 */

// Re-export types from individual files
export type {
  AuthLevel,
  BindingBase,
  CustomBinding,
  DataTypeHint,
  Direction,
  isKnownBindingType,
  KNOWN_BINDING_TYPES,
  KnownBindingType,
} from "./types.ts";

export type {
  HttpOutputBinding,
  HttpTriggerBinding,
  isHttpTriggerBinding,
} from "./http.ts";

export type {
  BlobInputBinding,
  BlobOutputBinding,
  BlobTriggerBinding,
  isBlobTriggerBinding,
  isQueueTriggerBinding,
  QueueOutputBinding,
  QueueTriggerBinding,
  TableInputBinding,
  TableOutputBinding,
} from "./storage.ts";

export type {
  ServiceBusOutputBinding,
  ServiceBusTriggerBinding,
} from "./service-bus.ts";

export type {
  EventHubOutputBinding,
  EventHubTriggerBinding,
} from "./event-hub.ts";

export type { ManualTriggerBinding, TimerTriggerBinding } from "./timer.ts";

export type {
  DocumentDBInputBinding,
  DocumentDBOutputBinding,
  KustoInputBinding,
  KustoOutputBinding,
  MobileTableInputBinding,
  MobileTableOutputBinding,
  MySqlInputBinding,
  MySqlOutputBinding,
  MySqlTriggerBinding,
  SqlInputBinding,
  SqlOutputBinding,
  SqlTriggerBinding,
} from "./database.ts";

export type {
  NotificationHubOutputBinding,
  SendGridOutputBinding,
  TwilioSmsOutputBinding,
} from "./notifications.ts";

/* --------------------------------- Unions -------------------------------- */

export type Binding =
  | HttpTriggerBinding
  | HttpOutputBinding
  | BlobTriggerBinding
  | BlobInputBinding
  | BlobOutputBinding
  | QueueTriggerBinding
  | QueueOutputBinding
  | TableInputBinding
  | TableOutputBinding
  | ServiceBusTriggerBinding
  | ServiceBusOutputBinding
  | EventHubTriggerBinding
  | EventHubOutputBinding
  | TimerTriggerBinding
  | ManualTriggerBinding
  | MobileTableInputBinding
  | MobileTableOutputBinding
  | DocumentDBInputBinding
  | DocumentDBOutputBinding
  | NotificationHubOutputBinding
  | TwilioSmsOutputBinding
  | SendGridOutputBinding
  | SqlTriggerBinding
  | SqlInputBinding
  | SqlOutputBinding
  | KustoInputBinding
  | KustoOutputBinding
  | MySqlTriggerBinding
  | MySqlInputBinding
  | SqlOutputBinding
  | CustomBinding;

export interface RetryPolicy {
  strategy?: "exponentialBackoff" | "fixedDelay";
  maxRetryCount?: number;
  delayInterval?: string;
  minimumInterval?: string;
  maximumInterval?: string;
}

export interface FunctionJson {
  bindings: Binding[];

  // Common function-level config (documented in the host wiki + schema)
  disabled?: boolean;
  excluded?: boolean;
  scriptFile?: string;
  entryPoint?: string;
  configurationSource?: "attributes" | "config";
  retry?: RetryPolicy;
}

/* ------------------------------ Type guards ------------------------------ */

function isRecord(obj: unknown): obj is Record<string, unknown> {
  return !!obj && typeof obj === "object" && !Array.isArray(obj);
}

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

/* ------------------------------- Builders -------------------------------- */

import type { CustomBinding } from "./types.ts";
import { httpBindings, HttpOutputBinding, HttpTriggerBinding } from "./http.ts";
import {
  ManualTriggerBinding,
  timerBindings,
  TimerTriggerBinding,
} from "./timer.ts";
import {
  BlobInputBinding,
  BlobOutputBinding,
  BlobTriggerBinding,
  QueueOutputBinding,
  QueueTriggerBinding,
  storageBindings,
  TableInputBinding,
  TableOutputBinding,
} from "./storage.ts";
import {
  serviceBusBindings,
  ServiceBusOutputBinding,
  ServiceBusTriggerBinding,
} from "./service-bus.ts";
import {
  eventHubBindings,
  EventHubOutputBinding,
  EventHubTriggerBinding,
} from "./event-hub.ts";
import {
  DocumentDBInputBinding,
  DocumentDBOutputBinding,
  KustoInputBinding,
  KustoOutputBinding,
  MobileTableInputBinding,
  MobileTableOutputBinding,
  MySqlInputBinding,
  MySqlTriggerBinding,
  SqlInputBinding,
  SqlOutputBinding,
  SqlTriggerBinding,
} from "./database.ts";
import {
  NotificationHubOutputBinding,
  SendGridOutputBinding,
  TwilioSmsOutputBinding,
} from "./notifications.ts";

export const bindings = {
  ...httpBindings,
  ...timerBindings,
  ...storageBindings,
  ...serviceBusBindings,
  ...eventHubBindings,

  /**
   * Escape hatch for extension bindings (or anything not modeled above).
   * You still get strong typing for `name/type/direction/dataType`.
   */
  custom<T extends CustomBinding>(binding: T): T {
    return binding;
  },
} as const;
