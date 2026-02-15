import type { AzureFunctionsApp } from "./app.ts";
import type { Binding, FunctionConfig } from "./bindings/index.ts";
import type {
  InferInputData,
  InferMetadata,
  InferResult,
} from "./bindings/types.ts";
import type { InvokeRequest, InvokeResponse } from "./invoke.ts";
import { AppError } from "./lib/errors.ts";
import { normalizeFunctionDir } from "./lib/path.ts";

export type FunctionKind = "trigger";

/**
 * App-level context passed to handlers.
 * Provides read-only access to the registered app instance (or function list).
 */
export interface AppContext {
  readonly app: Readonly<Pick<AzureFunctionsApp, "list">>;
}

export interface TriggerContext {
  functionDir: string;
  rawPathname: string;
  /** Route prefix (only for HTTP triggers) */
  routePrefix?: string;
  /** Route params (only for HTTP triggers) */
  params?: Record<string, string>;
}

export type TriggerHandlerResult = InvokeResponse | Response;
export type MaybePromise<T> = T | Promise<T>;

/**
 * Public handler type.
 * Users may declare fewer parameters; we always call (payload, ctx, appCtx).
 */
export type TriggerHandler<
  TPayload extends { Data: unknown; Metadata?: unknown } = InvokeRequest,
  TResult extends TriggerHandlerResult = InvokeResponse,
> = (
  payload: TPayload,
  ctx: TriggerContext,
  appCtx: AppContext,
) => MaybePromise<
  TResult
>;

/**
 * Internal handler signature used by router/registry.
 * Payload typing is erased here to avoid registry invariance.
 */
export type TriggerHandlerInternal = (
  payload: InvokeRequest,
  ctx: TriggerContext,
  appCtx: AppContext,
) => MaybePromise<TriggerHandlerResult>;

export interface FunctionBindingsIndex {
  all: readonly Binding[];
  /** The inferred trigger binding */
  trigger?: Binding;
  inputs: readonly Binding[];
  outputs: readonly Binding[];
  byName: ReadonlyMap<string, Binding>;
  byType: ReadonlyMap<string, readonly Binding[]>;
}

export type BindingLookupMethods = {
  getBindingByName(name: string): Binding | undefined;
  getBindingByType(type: string): Binding | undefined;
  getBindingsByType(type: string): readonly Binding[];
};

export type FunctionDefinitionBase = {
  name: string;
  config: FunctionConfig;
  kind: FunctionKind;
  bindings: FunctionBindingsIndex;
} & BindingLookupMethods;

export interface TriggerFunctionDefinition extends FunctionDefinitionBase {
  kind: "trigger";
  handler: TriggerHandlerInternal;
}

export type FunctionDefinition = TriggerFunctionDefinition;

function isLikelyTriggerBinding(b: Binding): boolean {
  // Abstract trigger inference: do NOT hardcode trigger types.
  // Most triggers end with "Trigger". If none match, fall back to first "in" binding.
  return b.direction === "in" && /trigger$/i.test(b.type);
}

function indexBindings(all: readonly Binding[]): FunctionBindingsIndex {
  const inputs: Binding[] = [];
  const outputs: Binding[] = [];
  const triggerCandidates: Binding[] = [];

  const byName = new Map<string, Binding>();
  const byType = new Map<string, Binding[]>();

  for (const b of all) {
    if (b.direction === "in") inputs.push(b);
    else if (b.direction === "out") outputs.push(b);

    if (isLikelyTriggerBinding(b)) triggerCandidates.push(b);

    if (byName.has(b.name)) {
      throw new AppError("DEFINITION", `Duplicate binding name "${b.name}".`);
    }
    byName.set(b.name, b);

    const arr = byType.get(b.type);
    if (arr) arr.push(b);
    else byType.set(b.type, [b]);
  }

  if (triggerCandidates.length > 1) {
    throw new AppError(
      "DEFINITION",
      `function.json must define exactly 1 trigger binding; found ${triggerCandidates.length}.`,
      { details: { triggerTypes: triggerCandidates.map((b) => b.type) } },
    );
  }

  const trigger = triggerCandidates[0] ?? inputs[0];
  if (!trigger) {
    throw new AppError("DEFINITION", "Unable to infer trigger binding.");
  }

  return { all, trigger, inputs, outputs, byName, byType };
}

function withBindingLookups<T extends { bindings: FunctionBindingsIndex }>(
  def: T,
): T & BindingLookupMethods {
  const methods: BindingLookupMethods = {
    getBindingByName: (name) => def.bindings.byName.get(name),
    getBindingByType: (type) => def.bindings.byType.get(type)?.[0],
    getBindingsByType: (type) => def.bindings.byType.get(type) ?? [],
  };
  return Object.assign(def, methods);
}

/**
 * Generic trigger constructor (abstract over trigger types).
 *
 * Uses rest parameters to infer handler types automatically from bindings.
 * No `as const` or explicit type annotations needed.
 */

// Main overload: infer handler types from bindings using rest parameters
export function defineFunction<
  const TBindings extends readonly [...Binding[]],
>(
  options: {
    name: string;
    config?: FunctionConfig;
    bindings: TBindings;
    handler: (
      payload: InvokeRequest<
        InferInputData<TBindings>,
        InferMetadata<TBindings>
      >,
      ctx: TriggerContext,
      appCtx?: AppContext,
    ) => MaybePromise<InferResult<TBindings>>;
  },
): TriggerFunctionDefinition;

// Implementation
export function defineFunction<
  TBindings extends readonly [...Binding[]],
>(options: {
  name: string;
  config?: FunctionConfig;
  bindings: TBindings;
  handler: (
    payload: InvokeRequest<InferInputData<TBindings>, InferMetadata<TBindings>>,
    ctx: TriggerContext,
    appCtx?: AppContext,
  ) => MaybePromise<InferResult<TBindings>>;
}): TriggerFunctionDefinition {
  const dir = normalizeFunctionDir(options.name);

  if (!options.bindings?.length) {
    throw new AppError("DEFINITION", "bindings array is missing or empty.");
  }

  const bindings = indexBindings(options.bindings);

  const internalHandler: TriggerHandlerInternal = (payload, ctx, appCtx) =>
    options.handler(
      payload as InvokeRequest<
        InferInputData<TBindings>,
        InferMetadata<TBindings>
      >,
      ctx,
      appCtx,
    ) as MaybePromise<TriggerHandlerResult>;

  return withBindingLookups({
    name: dir,
    config: options.config ?? {},
    kind: "trigger",
    handler: internalHandler,
    bindings,
  });
}
