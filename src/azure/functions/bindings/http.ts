import type { AuthLevel, BindingBase, DataTypeHint } from "./types.ts";
import { isRecord } from "./guards.ts";

/* ----------------------------- HTTP bindings ----------------------------- */

export interface HttpTriggerBinding extends BindingBase {
  type: "httpTrigger";
  direction: "in";
  authLevel: AuthLevel;
  route?: string;
  methods?: readonly string[];
  webHookType?: string;
}

export interface HttpOutputBinding extends BindingBase {
  type: "http";
  direction: "out";
}

/* ------------------------------ Type guards ------------------------------ */

export function isHttpTriggerBinding(obj: unknown): obj is HttpTriggerBinding {
  if (!isRecord(obj)) return false;
  const b = obj as Record<string, unknown>;
  return b.type === "httpTrigger" && b.direction === "in";
}

export function isHttpOutputBinding(obj: unknown): obj is HttpOutputBinding {
  if (!isRecord(obj)) return false;
  const b = obj as Record<string, unknown>;
  return b.type === "http" && b.direction === "out";
}

/* ------------------------------- Builders -------------------------------- */

export const httpBindings = {
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
} as const;
