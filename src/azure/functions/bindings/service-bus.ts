import type { BindingBase, DataTypeHint } from "./types.ts";

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

/* ------------------------------- Builders -------------------------------- */

export const serviceBusBindings = {
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
} as const;
