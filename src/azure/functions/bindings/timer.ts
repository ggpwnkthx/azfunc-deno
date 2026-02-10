import type { BindingBase, DataTypeHint } from "./types.ts";

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

/* ------------------------------- Builders -------------------------------- */

export const timerBindings = {
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
      ...(args.runOnStartup !== undefined
        ? { runOnStartup: args.runOnStartup }
        : {}),
      ...(args.useMonitor !== undefined ? { useMonitor: args.useMonitor } : {}),
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },

  manualTrigger(
    args: { name: string; dataType?: DataTypeHint },
  ): ManualTriggerBinding {
    return {
      type: "manualTrigger",
      direction: "in",
      name: args.name,
      ...(args.dataType ? { dataType: args.dataType } : {}),
    };
  },
} as const;
