/**
 * Azure Functions `function.json` bindings.
 *
 * Docs/examples: https://github.com/Azure/azure-functions-host/wiki/function.json
 * JSON Schema (SchemaStore): https://www.schemastore.org/function.json
 */

export type Direction = "in" | "out" | "inout";
export type DataTypeHint = "string" | "binary" | "stream";

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

export interface CustomBinding extends BindingBase {
  [key: string]: unknown;
}

export type AuthLevel = "anonymous" | "function" | "admin";
