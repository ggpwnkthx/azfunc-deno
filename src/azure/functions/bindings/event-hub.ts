import type { BindingBase, DataTypeHint } from "./types.ts";

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

/* ------------------------------- Builders -------------------------------- */

export const eventHubBindings = {
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
} as const;
