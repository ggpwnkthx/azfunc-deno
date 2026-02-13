import type { BindingFromApi, InBinding, OutBinding } from "./types.ts";
import { defineInBinding, defineOutBinding } from "./types.ts";

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

export type ServiceBusTriggerBinding = InBinding<
  "serviceBusTrigger",
  ServiceBusCommon & (ServiceBusQueueLike | ServiceBusTopicLike)
>;

export type ServiceBusOutputBinding = OutBinding<
  "serviceBus",
  ServiceBusCommon & (ServiceBusQueueLike | ServiceBusTopicLike)
>;

/* ------------------------------- Grouped API ----------------------------- */

export const serviceBus = {
  trigger: {
    queue: defineInBinding<ServiceBusTriggerBinding & ServiceBusQueueLike>(
      "serviceBusTrigger",
    ).build,
    topic: defineInBinding<ServiceBusTriggerBinding & ServiceBusTopicLike>(
      "serviceBusTrigger",
    ).build,
  },

  output: {
    queue: defineOutBinding<ServiceBusOutputBinding & ServiceBusQueueLike>(
      "serviceBus",
    ).build,
    topic: defineOutBinding<ServiceBusOutputBinding & ServiceBusTopicLike>(
      "serviceBus",
    ).build,
  },
} as const;

export type ServiceBusBinding = BindingFromApi<typeof serviceBus>;
