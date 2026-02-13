import type { BindingFromApi, InBinding, OutBinding } from "./types.ts";
import { defineInBinding, defineOutBinding } from "./types.ts";

export type BlobTriggerBinding = InBinding<"blobTrigger", {
  path: string;
  connection: string;
}>;

export type BlobInputBinding = InBinding<"blob", {
  path: string;
  connection: string;
}>;

export type BlobOutputBinding = OutBinding<"blob", {
  path: string;
  connection: string;
}>;

export type QueueTriggerBinding = InBinding<"queueTrigger", {
  queueName: string;
  connection: string;
}>;

export type QueueOutputBinding = OutBinding<"queue", {
  queueName: string;
  connection: string;
}>;

export type TableInputBinding = InBinding<"table", {
  tableName: string;
  partitionKey?: string;
  rowKey?: string;
  connection: string;
  take?: string;
  filter?: string;
}>;

export type TableOutputBinding = OutBinding<"table", {
  tableName: string;
  partitionKey?: string;
  rowKey?: string;
  connection: string;
}>;

const blobTrigger = defineInBinding<BlobTriggerBinding>("blobTrigger");
const blobInput = defineInBinding<BlobInputBinding>("blob");
const blobOutput = defineOutBinding<BlobOutputBinding>("blob");

const queueTrigger = defineInBinding<QueueTriggerBinding>("queueTrigger");
const queueOutput = defineOutBinding<QueueOutputBinding>("queue");

const tableInput = defineInBinding<TableInputBinding>("table");
const tableOutput = defineOutBinding<TableOutputBinding>("table");

export const isBlobTriggerBinding = blobTrigger.is;
export const isQueueTriggerBinding = queueTrigger.is;

export const storage = {
  blob: {
    trigger: blobTrigger.build,
    input: blobInput.build,
    output: blobOutput.build,
  },
  queue: {
    trigger: queueTrigger.build,
    output: queueOutput.build,
  },
  table: {
    input: tableInput.build,
    output: tableOutput.build,
  },
} as const;

export type StorageBinding = BindingFromApi<typeof storage>;
