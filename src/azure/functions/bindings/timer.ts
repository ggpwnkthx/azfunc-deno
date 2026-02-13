import type { BindingFromApi, InBinding } from "./types.ts";
import { defineInBinding } from "./types.ts";

export type TimerTriggerBinding = InBinding<"timerTrigger", {
  schedule: string;
  runOnStartup?: boolean;
  useMonitor?: boolean;
}>;

export type ManualTriggerBinding = InBinding<"manualTrigger">;

const trigger = defineInBinding<TimerTriggerBinding>("timerTrigger");
const manual = defineInBinding<ManualTriggerBinding>("manualTrigger");

export const timer = {
  trigger: trigger.build,
  manual: manual.build,
} as const;

export type TimerBinding = BindingFromApi<typeof timer>;
