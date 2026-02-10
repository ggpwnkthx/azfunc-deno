import type { Binding, FunctionJson } from "./bindings/index.ts";
import type { InvokeRequest, InvokeResponse } from "./invoke.ts";
import { AppError } from "./lib/errors.ts";

export type FunctionKind = "http" | "trigger";

export interface HttpContext {
  functionDir: string;
  routePrefix: string;
  rawPathname: string;
  params: Record<string, string>;
}

export interface TriggerContext {
  functionDir: string;
  rawPathname: string;
}

export type HttpHandlerResult =
  | Response
  | InvokeResponse
  | Promise<Response | InvokeResponse>;

export type TriggerHandlerResult =
  | InvokeResponse
  | Promise<InvokeResponse>;

export type HttpHandler =
  | ((req: Request) => HttpHandlerResult)
  | ((req: Request, ctx: HttpContext) => HttpHandlerResult);

export type TriggerHandler<
  TPayload extends InvokeRequest = InvokeRequest,
  TResult extends InvokeResponse = InvokeResponse,
> =
  | ((payload: TPayload) => TResult | Promise<TResult>)
  | ((payload: TPayload, ctx: TriggerContext) => TResult | Promise<TResult>);

export interface FunctionDefinitionBase {
  dir: string;
  functionJson: FunctionJson;
  kind: FunctionKind;
}

/**
 * Generic binding storage for TriggerFunctionDefinition.
 * Provides structured access to bindings by direction, name, and type.
 */
export interface TriggerFunctionBindings {
  /** The trigger binding (first "in" direction binding) */
  trigger?: Binding;
  /** All input bindings (direction "in") */
  inputs: Binding[];
  /** All output bindings (direction "out") */
  outputs: Binding[];
  /** Lookup by binding name */
  byName: Record<string, Binding>;
  /** Lookup by binding type */
  byType: Record<string, Binding | undefined>;
}

export interface TriggerFunctionDefinition<
  TPayload extends InvokeRequest = InvokeRequest,
  TResult extends InvokeResponse = InvokeResponse,
> extends FunctionDefinitionBase {
  kind: "trigger";
  handler: TriggerHandler<TPayload, TResult> | HttpHandler;
  /** Generic binding storage */
  bindings: TriggerFunctionBindings;

  /** Get the trigger binding filtered by a type guard */
  getTriggerBinding<T extends Binding>(
    guard: (b: Binding) => b is T,
  ): T | undefined;
  /** Lookup a binding by its name */
  getBindingByName(name: string): Binding | undefined;
  /** Lookup a binding by its type (e.g., "httpTrigger", "queue") */
  getBindingByType(type: string): Binding | undefined;
  /** Get all input bindings filtered by a type guard */
  getInputBindings<T extends Binding>(
    guard: (b: Binding) => b is T,
  ): T[];
  /** Get all output bindings filtered by a type guard */
  getOutputBindings<T extends Binding>(
    guard: (b: Binding) => b is T,
  ): T[];
}

export type FunctionDefinition = TriggerFunctionDefinition;

function assertValidDir(dir: string): void {
  if (dir.trim() === "") {
    throw new AppError("DEFINITION", "Function dir must be non-empty.");
  }
  if (dir.includes("\\") || dir.startsWith("/") || dir.includes("..")) {
    throw new AppError(
      "DEFINITION",
      `Function dir must be a relative posix-like path without ".." or leading "/": ${dir}`,
    );
  }
}

function assertValidFunctionJson(functionJson: FunctionJson): void {
  if (!functionJson || !Array.isArray(functionJson.bindings)) {
    throw new AppError("DEFINITION", "functionJson.bindings missing.");
  }
  if (functionJson.bindings.length === 0) {
    throw new AppError("DEFINITION", "functionJson.bindings is empty.");
  }
}

/** Find the first binding matching a type guard */
export function findBinding<T extends Binding>(
  bindings: readonly Binding[],
  typeGuard: (b: Binding) => b is T,
): T | null {
  for (const b of bindings) {
    if (typeGuard(b)) return b;
  }
  return null;
}

/** Find all bindings matching a type guard */
export function findBindings<T extends Binding>(
  bindings: readonly Binding[],
  typeGuard: (b: Binding) => b is T,
): T[] {
  const result: T[] = [];
  for (const b of bindings) {
    if (typeGuard(b)) result.push(b);
  }
  return result;
}

/** Get the trigger binding (first "in" direction binding) */
export function getTriggerBinding(
  bindings: readonly Binding[],
): Binding | null {
  for (const b of bindings) {
    if (b.direction === "in") return b;
  }
  return null;
}

export function defineTriggerFunction<
  TPayload extends InvokeRequest = InvokeRequest,
  TResult extends InvokeResponse = InvokeResponse,
>(options: {
  dir: string;
  functionJson: FunctionJson;
  handler: TriggerHandler<TPayload, TResult> | HttpHandler;
}): TriggerFunctionDefinition<TPayload, TResult> {
  assertValidDir(options.dir);
  assertValidFunctionJson(options.functionJson);

  const allBindings = options.functionJson.bindings;
  const trigger = getTriggerBinding(allBindings) ?? undefined;
  const inputs = allBindings.filter((b) => b.direction === "in");
  const outputs = allBindings.filter((b) => b.direction === "out");
  const byName: Record<string, Binding> = {};
  const byType: Record<string, Binding | undefined> = {};

  for (const b of allBindings) {
    byName[b.name] = b;
    byType[b.type] = b;
  }

  const bindings: TriggerFunctionBindings = {
    trigger,
    inputs,
    outputs,
    byName,
    byType,
  };

  const definition: TriggerFunctionDefinition<TPayload, TResult> = {
    dir: options.dir,
    functionJson: options.functionJson,
    kind: "trigger",
    handler: options.handler as TriggerHandler<TPayload, TResult>,
    bindings,
    getTriggerBinding<T extends Binding>(
      guard: (b: Binding) => b is T,
    ): T | undefined {
      const trigger = bindings.trigger;
      if (trigger && guard(trigger)) return trigger as T;
      return undefined;
    },
    getBindingByName(name: string): Binding | undefined {
      return bindings.byName[name];
    },
    getBindingByType(type: string): Binding | undefined {
      return bindings.byType[type];
    },
    getInputBindings<T extends Binding>(
      guard: (b: Binding) => b is T,
    ): T[] {
      return bindings.inputs.filter((b) => guard(b)) as T[];
    },
    getOutputBindings<T extends Binding>(
      guard: (b: Binding) => b is T,
    ): T[] {
      return bindings.outputs.filter((b) => guard(b)) as T[];
    },
  };

  return definition;
}
