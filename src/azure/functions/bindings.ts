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
  return typeof t === "string" && (KNOWN_BINDING_TYPES as readonly string[]).includes(t);
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

/* ----------------------------- HTTP bindings ----------------------------- */

export interface HttpTriggerBinding extends BindingBase {
  type: "httpTrigger";
  direction: "in";
  authLevel: AuthLevel;
  /**
   * Optional per host docs/examples (they show a minimal object),
   * but we strongly recommend setting it in your codebase.
   */
  route?: string;
  methods?: readonly string[];
  webHookType?: string;
}

export interface HttpOutputBinding extends BindingBase {
  type: "http";
  direction: "out";
}

/* ---------------------------- Storage bindings --------------------------- */

export interface BlobTriggerBinding extends BindingBase {
  type: "blobTrigger";
  direction: "in";
  path: string;
  connection: string;
}

export interface BlobInputBinding extends BindingBase {
  type: "blob";
  direction: "in";
  path: string;
  connection: string;
}

export interface BlobOutputBinding extends BindingBase {
  type: "blob";
  direction: "out";
  path: string;
  connection: string;
}

export interface QueueTriggerBinding extends BindingBase {
  type: "queueTrigger";
  direction: "in";
  queueName: string;
  connection: string;
}

export interface QueueOutputBinding extends BindingBase {
  type: "queue";
  direction: "out";
  queueName: string;
  connection: string;
}

export interface TableInputBinding extends BindingBase {
  type: "table";
  direction: "in";
  tableName: string;
  partitionKey?: string;
  rowKey?: string;
  connection: string;
  // query-ish options (schema mentions `take`/`filter`)
  take?: string;
  filter?: string;
}

export interface TableOutputBinding extends BindingBase {
  type: "table";
  direction: "out";
  tableName: string;
  partitionKey?: string;
  rowKey?: string;
  connection: string;
}

/* -------------------------- Service Bus bindings ------------------------- */

type ServiceBusQueueLike = {
  queueName: string;
  topicName?: never;
  subscriptionName?: never;
};

type ServiceBusTopicLike = {
  queueName?: never;
  topicName: string;
  subscriptionName: string;
};

type ServiceBusCommon = {
  connection: string;
  accessRights?: "manage" | "listen" | "send";
};

export type ServiceBusTriggerBinding =
  & BindingBase
  & ServiceBusCommon
  & (ServiceBusQueueLike | ServiceBusTopicLike)
  & {
    type: "serviceBusTrigger";
    direction: "in";
  };

export type ServiceBusOutputBinding =
  & BindingBase
  & ServiceBusCommon
  & (ServiceBusQueueLike | ServiceBusTopicLike)
  & {
    type: "serviceBus";
    direction: "out";
  };

/* --------------------------- Event Hub bindings -------------------------- */

export interface EventHubTriggerBinding extends BindingBase {
  type: "eventHubTrigger";
  direction: "in";
  path: string;
  connection: string;
  consumerGroup?: string;
  cardinality?: "one" | "many";
}

export interface EventHubOutputBinding extends BindingBase {
  type: "eventHub";
  direction: "out";
  path: string;
  connection: string;
}

/* ------------------------- Timer / Manual triggers ----------------------- */

export interface TimerTriggerBinding extends BindingBase {
  type: "timerTrigger";
  direction: "in";
  schedule: string;
  runOnStartup?: boolean;
  useMonitor?: boolean;
}

export interface ManualTriggerBinding extends BindingBase {
  type: "manualTrigger";
  direction: "in";
}

/* ------------------------- Mobile / DocumentDB --------------------------- */

export interface MobileTableInputBinding extends BindingBase {
  type: "mobileTable";
  direction: "in";
  tableName: string;
  connection: string;
  apiKey: string;
  id?: string;
}

export interface MobileTableOutputBinding extends BindingBase {
  type: "mobileTable";
  direction: "out";
  tableName: string;
  connection: string;
  apiKey: string;
}

export interface DocumentDBInputBinding extends BindingBase {
  type: "documentDB";
  direction: "in";
  connection: string;
  databaseName: string;
  collectionName: string;
  id?: string;
  sqlQuery?: string;
}

export interface DocumentDBOutputBinding extends BindingBase {
  type: "documentDB";
  direction: "out";
  connection: string;
  databaseName: string;
  collectionName: string;
  createIfNotExists?: boolean;
}

/* ---------------------- Notification / Email bindings -------------------- */

export interface NotificationHubOutputBinding extends BindingBase {
  type: "notificationHub";
  direction: "out";
  tagExpression: string;
  hubName: string;
  connection: string;
  platform?: "apns" | "adm" | "gcm" | "wns" | "mpns";
}

export interface TwilioSmsOutputBinding extends BindingBase {
  type: "twilioSms";
  direction: "out";
  accountSid: string;
  authToken: string;
  to: string;
  from: string;
  body?: string;
}

export interface SendGridOutputBinding extends BindingBase {
  type: "sendGrid";
  direction: "out";
  apiKey: string;
  to: string;
  from: string;
  subject: string;
  text: string;
}

/* ---------------------------- SQL / Kusto / MySQL ------------------------ */

export interface SqlTriggerBinding extends BindingBase {
  type: "sqlTrigger";
  direction: "in";
  tableName: string;
  connectionStringSetting: string;
}

export interface SqlInputBinding extends BindingBase {
  type: "sql";
  direction: "in";
  connectionStringSetting: string;
  commandText: string;
  commandType?: "text" | "storedProcedure";
  parameters?: string;
}

export interface SqlOutputBinding extends BindingBase {
  type: "sql";
  direction: "out";
  connectionStringSetting: string;
  commandText: string; // upsert target (schema describes as table name)
}

export interface KustoInputBinding extends BindingBase {
  type: "kusto";
  direction: "in";
  connection: string;
  database: string;
  managedServiceIdentity?: string;
  kqlCommand: string;
  kqlParameters?: string;
}

export interface KustoOutputBinding extends BindingBase {
  type: "kusto";
  direction: "out";
  connection: string;
  database: string;
  managedServiceIdentity?: string;
  tableName: string;
  mappingRef?: string;
  dataFormat?: string;
}

export interface MySqlTriggerBinding extends BindingBase {
  type: "mysqlTrigger";
  direction: "in";
  tableName: string;
  connectionStringSetting: string;
}

export interface MySqlInputBinding extends BindingBase {
  type: "mysql";
  direction: "in";
  connectionStringSetting: string;
  commandText: string;
  commandType?: "text" | "storedProcedure";
  parameters?: string;
}

export interface MySqlOutputBinding extends BindingBase {
  type: "mysql";
  direction: "out";
  connectionStringSetting: string;
  commandText: string; // upsert target (schema describes as table name)
}

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
  | MySqlOutputBinding
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

export function isHttpTriggerBinding(obj: unknown): obj is HttpTriggerBinding {
  if (!isRecord(obj)) return false;
  const b = obj as Record<string, unknown>;
  return b.type === "httpTrigger" && b.direction === "in";
}

export function isBlobTriggerBinding(obj: unknown): obj is BlobTriggerBinding {
  if (!isRecord(obj)) return false;
  const b = obj as Record<string, unknown>;
  return b.type === "blobTrigger" && b.direction === "in";
}

export function isQueueTriggerBinding(obj: unknown): obj is QueueTriggerBinding {
  if (!isRecord(obj)) return false;
  const b = obj as Record<string, unknown>;
  return b.type === "queueTrigger" && b.direction === "in";
}

/* ------------------------------- Builders -------------------------------- */

export const bindings = {
  httpTrigger(args: {
    name: string;
    route?: string;
    authLevel?: AuthLevel;
    methods?: readonly string[];
    webHookType?: string;
    dataType?: DataTypeHint;
  }): HttpTriggerBinding {
    return {
      type: "httpTrigger",
      direction: "in",
      name: args.name,
      authLevel: args.authLevel ?? "anonymous",
      ...(args.route ? { route: args.route } : {}),
      ...(args.methods ? { methods: args.methods } : {}),
      ...(args.webHookType ? { webHookType: args.webHookType } : {}),
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  httpOut(args: { name: string; dataType?: DataTypeHint }): HttpOutputBinding {
    return {
      type: "http",
      direction: "out",
      name: args.name,
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  timerTrigger(args: {
    name: string;
    schedule: string;
    runOnStartup?: boolean;
    useMonitor?: boolean;
    dataType?: DataTypeHint;
  }): TimerTriggerBinding {
    return {
      type: "timerTrigger",
      direction: "in",
      name: args.name,
      schedule: args.schedule,
      ...(args.runOnStartup !== undefined ? { runOnStartup: args.runOnStartup } : {}),
      ...(args.useMonitor !== undefined ? { useMonitor: args.useMonitor } : {}),
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  manualTrigger(args: { name: string; dataType?: DataTypeHint }): ManualTriggerBinding {
    return {
      type: "manualTrigger",
      direction: "in",
      name: args.name,
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  blobTrigger(args: {
    name: string;
    path: string;
    connection: string;
    dataType?: DataTypeHint;
  }): BlobTriggerBinding {
    return {
      type: "blobTrigger",
      direction: "in",
      name: args.name,
      path: args.path,
      connection: args.connection,
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  blobIn(args: {
    name: string;
    path: string;
    connection: string;
    dataType?: DataTypeHint;
  }): BlobInputBinding {
    return {
      type: "blob",
      direction: "in",
      name: args.name,
      path: args.path,
      connection: args.connection,
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  blobOut(args: {
    name: string;
    path: string;
    connection: string;
    dataType?: DataTypeHint;
  }): BlobOutputBinding {
    return {
      type: "blob",
      direction: "out",
      name: args.name,
      path: args.path,
      connection: args.connection,
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  queueTrigger(args: {
    name: string;
    queueName: string;
    connection: string;
    dataType?: DataTypeHint;
  }): QueueTriggerBinding {
    return {
      type: "queueTrigger",
      direction: "in",
      name: args.name,
      queueName: args.queueName,
      connection: args.connection,
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  queueOut(args: {
    name: string; // "$return" allowed
    queueName: string;
    connection: string;
    dataType?: DataTypeHint;
  }): QueueOutputBinding {
    return {
      type: "queue",
      direction: "out",
      name: args.name,
      queueName: args.queueName,
      connection: args.connection,
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  serviceBusTriggerQueue(args: {
    name: string;
    queueName: string;
    connection: string;
    accessRights?: "manage" | "listen" | "send";
    dataType?: DataTypeHint;
  }): ServiceBusTriggerBinding {
    return {
      type: "serviceBusTrigger",
      direction: "in",
      name: args.name,
      queueName: args.queueName,
      connection: args.connection,
      ...(args.accessRights ? { accessRights: args.accessRights } : {}),
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  serviceBusTriggerTopic(args: {
    name: string;
    topicName: string;
    subscriptionName: string;
    connection: string;
    accessRights?: "manage" | "listen" | "send";
    dataType?: DataTypeHint;
  }): ServiceBusTriggerBinding {
    return {
      type: "serviceBusTrigger",
      direction: "in",
      name: args.name,
      topicName: args.topicName,
      subscriptionName: args.subscriptionName,
      connection: args.connection,
      ...(args.accessRights ? { accessRights: args.accessRights } : {}),
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  serviceBusOutQueue(args: {
    name: string;
    queueName: string;
    connection: string;
    accessRights?: "manage" | "listen" | "send";
    dataType?: DataTypeHint;
  }): ServiceBusOutputBinding {
    return {
      type: "serviceBus",
      direction: "out",
      name: args.name,
      queueName: args.queueName,
      connection: args.connection,
      ...(args.accessRights ? { accessRights: args.accessRights } : {}),
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  serviceBusOutTopic(args: {
    name: string;
    topicName: string;
    subscriptionName: string;
    connection: string;
    accessRights?: "manage" | "listen" | "send";
    dataType?: DataTypeHint;
  }): ServiceBusOutputBinding {
    return {
      type: "serviceBus",
      direction: "out",
      name: args.name,
      topicName: args.topicName,
      subscriptionName: args.subscriptionName,
      connection: args.connection,
      ...(args.accessRights ? { accessRights: args.accessRights } : {}),
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  eventHubTrigger(args: {
    name: string;
    path: string;
    connection: string;
    consumerGroup?: string;
    cardinality?: "one" | "many";
    dataType?: DataTypeHint;
  }): EventHubTriggerBinding {
    return {
      type: "eventHubTrigger",
      direction: "in",
      name: args.name,
      path: args.path,
      connection: args.connection,
      ...(args.consumerGroup ? { consumerGroup: args.consumerGroup } : {}),
      ...(args.cardinality ? { cardinality: args.cardinality } : {}),
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  eventHubOut(args: {
    name: string;
    path: string;
    connection: string;
    dataType?: DataTypeHint;
  }): EventHubOutputBinding {
    return {
      type: "eventHub",
      direction: "out",
      name: args.name,
      path: args.path,
      connection: args.connection,
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  /**
   * Escape hatch for extension bindings (or anything not modeled above).
   * You still get strong typing for `name/type/direction/dataType`.
   */
  custom<T extends CustomBinding>(binding: T): T {
    return binding;
  },
} as const;
