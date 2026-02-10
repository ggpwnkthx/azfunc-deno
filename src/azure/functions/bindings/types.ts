/**
 * Azure Functions `function.json` bindings.
 *
 * Docs/examples: https://github.com/Azure/azure-functions-host/wiki/function.json
 * JSON Schema (SchemaStore): https://www.schemastore.org/function.json
 */

export type Direction = "in" | "out" | "inout";
export type DataTypeHint = "string" | "binary" | "stream";

/**
 * Binding types explicitly listed by the Azure Functions host docs (examples)
 * plus the SchemaStore function.json schema (which the docs link to).
 *
 * Note: Azure Functions supports additional binding types via extensions; those
 * can be represented using `CustomBinding`.
 */
export const KNOWN_BINDING_TYPES = [
  // HTTP
  "httpTrigger",
  "http",

  // Storage
  "blobTrigger",
  "blob",
  "queueTrigger",
  "queue",
  "table",

  // Messaging
  "serviceBusTrigger",
  "serviceBus",
  "eventHubTrigger",
  "eventHub",

  // Schedulers / manual
  "timerTrigger",
  "manualTrigger",

  // Mobile / DB
  "mobileTable",
  "documentDB",

  // Notifications / email
  "notificationHub",
  "twilioSms",
  "sendGrid",

  // SQL / Kusto / MySQL
  "sql",
  "sqlTrigger",
  "kusto",
  "mysql",
  "mysqlTrigger",
] as const;

export type KnownBindingType = typeof KNOWN_BINDING_TYPES[number];

export function isKnownBindingType(t: unknown): t is KnownBindingType {
  return typeof t === "string" &&
    (KNOWN_BINDING_TYPES as readonly string[]).includes(t);
}

export interface BindingBase {
  name: string;
  type: string;
  direction: Direction;
  dataType?: DataTypeHint;
}

/**
 * Fallback for binding extensions or any binding types not in KNOWN_BINDING_TYPES.
 * Keeps the runtime flexible while still letting us type the common bindings.
 */
export interface CustomBinding extends BindingBase {
  // Azure binding-specific properties are free-form.
  [key: string]: unknown;
}

export type AuthLevel = "anonymous" | "function" | "admin";
