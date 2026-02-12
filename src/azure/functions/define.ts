import type { Binding, FunctionJson } from "./bindings/index.ts";
import { isHttpOutputBinding, isHttpTriggerBinding } from "./bindings/index.ts";
import type { InvokeRequest, InvokeResponse } from "./invoke.ts";
import { AppError } from "./lib/errors.ts";
import { normalizeFunctionDir } from "./lib/path.ts";

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

/**
 * Internal trigger handler signature used by the router/registry.
 * We intentionally erase per-function payload typing here to avoid invariance issues.
 */
export type TriggerHandlerInternal = (
  payload: InvokeRequest,
  ctx: TriggerContext,
) => TriggerHandlerResult;

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
  dir: string;
  functionJson: FunctionJson;
  kind: FunctionKind;
  bindings: FunctionBindingsIndex;
} & BindingLookupMethods;

export interface HttpFunctionDefinition extends FunctionDefinitionBase {
  kind: "http";
  handler: HttpHandler;
  http: {
    triggerName: string;
    outName: string;
  };
}

/**
 * Note: non-generic on purpose.
 * Per-function payload typing is enforced at define-time, not at registry time.
 */
export interface TriggerFunctionDefinition extends FunctionDefinitionBase {
  kind: "trigger";
  handler: TriggerHandlerInternal;
}

export type FunctionDefinition =
  | HttpFunctionDefinition
  | TriggerFunctionDefinition;

function assertValidFunctionJson(functionJson: FunctionJson): void {
  if (!functionJson || !Array.isArray(functionJson.bindings)) {
    throw new AppError("DEFINITION", "functionJson.bindings missing.");
  }
  if (functionJson.bindings.length === 0) {
    throw new AppError("DEFINITION", "functionJson.bindings is empty.");
  }
}

function isLikelyTriggerBinding(b: Binding): boolean {
  // Abstract trigger inference: do NOT hardcode trigger types.
  // Most triggers end with "Trigger". If none match, we fall back to first "in" binding.
  return b.direction === "in" && /trigger$/i.test(b.type);
}

function indexBindings(all: readonly Binding[]): FunctionBindingsIndex {
  const inputs = all.filter((b) => b.direction === "in");
  const outputs = all.filter((b) => b.direction === "out");

  const triggerCandidates = all.filter(isLikelyTriggerBinding);
  const trigger = triggerCandidates[0] ?? inputs[0];

  // Validate: binding names should be unique
  const byName = new Map<string, Binding>();
  for (const b of all) {
    if (byName.has(b.name)) {
      throw new AppError("DEFINITION", `Duplicate binding name "${b.name}".`);
    }
    byName.set(b.name, b);
  }

  // Group by type
  const byType = new Map<string, Binding[]>();
  for (const b of all) {
    const arr = byType.get(b.type);
    if (arr) arr.push(b);
    else byType.set(b.type, [b]);
  }

  // If we detect multiple "*Trigger" bindings, that’s almost certainly invalid.
  // (Still does not enumerate trigger types.)
  if (triggerCandidates.length > 1) {
    throw new AppError(
      "DEFINITION",
      `function.json must define exactly 1 trigger binding; found ${triggerCandidates.length}.`,
      { details: { triggerTypes: triggerCandidates.map((b) => b.type) } },
    );
  }
  if (!trigger) {
    throw new AppError("DEFINITION", "Unable to infer trigger binding.");
  }

  return { all, trigger, inputs, outputs, byName, byType };
}

/**
 * Avoids TS widening that caused TS2739: we return an intersection type, not a base type.
 */
function withBindingLookups<T extends { bindings: FunctionBindingsIndex }>(
  def: T,
): T & BindingLookupMethods {
  const methods: BindingLookupMethods = {
    getBindingByName(name: string): Binding | undefined {
      return def.bindings.byName.get(name);
    },
    getBindingByType(type: string): Binding | undefined {
      return def.bindings.byType.get(type)?.[0];
    },
    getBindingsByType(type: string): readonly Binding[] {
      return def.bindings.byType.get(type) ?? [];
    },
  };

  return Object.assign(def, methods);
}

/**
 * HTTP is special (custom handler envelope + http output binding encoding),
 * so we keep an explicit constructor for it.
 */
export function defineHttpFunction(options: {
  dir: string;
  functionJson: FunctionJson;
  handler: HttpHandler;
}): HttpFunctionDefinition {
  const dir = normalizeFunctionDir(options.dir);
  assertValidFunctionJson(options.functionJson);

  const bindings = indexBindings(options.functionJson.bindings);

  const httpTriggers = bindings.all.filter(isHttpTriggerBinding);
  if (httpTriggers.length !== 1) {
    throw new AppError(
      "DEFINITION",
      `HTTP function "${dir}" must define exactly one "httpTrigger"; found ${httpTriggers.length}.`,
    );
  }

  const httpOuts = bindings.all.filter(isHttpOutputBinding);
  if (httpOuts.length !== 1) {
    throw new AppError(
      "DEFINITION",
      `HTTP function "${dir}" must define exactly one "http" output binding; found ${httpOuts.length}.`,
    );
  }

  const httpTrigger = httpTriggers[0];
  const httpOut = httpOuts[0];

  const def: HttpFunctionDefinition = withBindingLookups({
    dir,
    functionJson: options.functionJson,
    kind: "http",
    handler: options.handler,
    bindings,
    http: {
      triggerName: httpTrigger.name,
      outName: httpOut.name,
    },
  });

  return def;
}

type TriggerHandlerOne<TPayload extends InvokeRequest, TResult extends InvokeResponse> =
  (payload: TPayload) => TResult | Promise<TResult>;

type TriggerHandlerTwo<TPayload extends InvokeRequest, TResult extends InvokeResponse> =
  (payload: TPayload, ctx: TriggerContext) => TResult | Promise<TResult>;

/**
 * Generic trigger constructor (abstract over trigger types).
 * This is the one you want for non-HTTP triggers.
 *
 * NOTE:
 * - The returned FunctionDefinition erases the specific payload type for registry compatibility.
 * - You still get strong typing inside your handler via the generic parameters.
 */
export function defineTriggerFunction<
  TPayload extends InvokeRequest = InvokeRequest,
  TResult extends InvokeResponse = InvokeResponse,
>(options: {
  dir: string;
  functionJson: FunctionJson;
  handler: TriggerHandler<TPayload, TResult>;
}): TriggerFunctionDefinition {
  const dir = normalizeFunctionDir(options.dir);
  assertValidFunctionJson(options.functionJson);

  const bindings = indexBindings(options.functionJson.bindings);

  if (bindings.all.some(isHttpTriggerBinding)) {
    throw new AppError(
      "DEFINITION",
      `Trigger function "${dir}" contains an "httpTrigger"; use defineHttpFunction().`,
    );
  }

  // Wrap the typed handler into an internal erased signature.
  const internalHandler: TriggerHandlerInternal = async (
    payload: InvokeRequest,
    ctx: TriggerContext,
  ): Promise<InvokeResponse> => {
    const typedPayload = payload as unknown as TPayload;

    const out =
      options.handler.length >= 2
        ? (options.handler as TriggerHandlerTwo<TPayload, TResult>)(
          typedPayload,
          ctx,
        )
        : (options.handler as TriggerHandlerOne<TPayload, TResult>)(typedPayload);

    const resolved = await out;
    return resolved as unknown as InvokeResponse;
  };

  const def: TriggerFunctionDefinition = withBindingLookups({
    dir,
    functionJson: options.functionJson,
    kind: "trigger",
    handler: internalHandler,
    bindings,
  });

  return def;
}

/**
 * Convenience alias: "defineFunction" == "defineTriggerFunction"
 * (keeps things abstract without mixing incompatible handler types).
 */
export const defineFunction = defineTriggerFunction;
