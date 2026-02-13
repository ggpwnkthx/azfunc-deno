import type { BindingFromApi, InBinding, OutBinding } from "./types.ts";
import { defineInBinding, defineOutBinding } from "./types.ts";

export type EventHubTriggerBinding = InBinding<"eventHubTrigger", {
  path: string;
  connection: string;
  consumerGroup?: string;
  cardinality?: "one" | "many";
}>;

export type EventHubOutputBinding = OutBinding<"eventHub", {
  path: string;
  connection: string;
}>;

const trigger = defineInBinding<EventHubTriggerBinding>("eventHubTrigger");
const output = defineOutBinding<EventHubOutputBinding>("eventHub");

export const eventHub = {
  trigger: trigger.build,
  output: output.build,
} as const;

export type EventHubBinding = BindingFromApi<typeof eventHub>;
