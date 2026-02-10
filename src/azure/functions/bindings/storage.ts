import type { BindingBase, DataTypeHint } from "./types.ts";
import { isRecord } from "./guards.ts";

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

/* ------------------------------ Type guards ------------------------------ */

export function isBlobTriggerBinding(obj: unknown): obj is BlobTriggerBinding {
  if (!isRecord(obj)) return false;
  const b = obj as Record<string, unknown>;
  return b.type === "blobTrigger" && b.direction === "in";
}

export function isQueueTriggerBinding(
  obj: unknown,
): obj is QueueTriggerBinding {
  if (!isRecord(obj)) return false;
  const b = obj as Record<string, unknown>;
  return b.type === "queueTrigger" && b.direction === "in";
}

/* ------------------------------- Builders -------------------------------- */

export const storageBindings = {
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
} as const;
