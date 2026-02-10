import type {
  Binding,
  FunctionJson,
  HttpOutputBinding,
  HttpTriggerBinding,
} from "./bindings/index.ts";
import { isHttpOutputBinding, isHttpTriggerBinding } from "./bindings/index.ts";
import type { InvokeRequest, InvokeResponse } from "./invoke.ts";
import { AppError } from "./lib/errors.ts";
import { assert } from "./lib/validate.ts";

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

export interface HttpFunctionDefinition extends FunctionDefinitionBase {
  kind: "http";
  handler: HttpHandler;
  httpTrigger: HttpTriggerBinding;
  httpOutput: HttpOutputBinding | null;
}

export interface TriggerFunctionDefinition<
  TPayload extends InvokeRequest = InvokeRequest,
  TResult extends InvokeResponse = InvokeResponse,
> extends FunctionDefinitionBase {
  kind: "trigger";
  handler: TriggerHandler<TPayload, TResult>;
}

export type FunctionDefinition =
  | HttpFunctionDefinition
  | TriggerFunctionDefinition;

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

function findHttpTrigger(
  bindings: readonly Binding[],
): HttpTriggerBinding | null {
  for (const b of bindings) {
    if (isHttpTriggerBinding(b)) return b;
  }
  return null;
}

function findHttpOutput(
  bindings: readonly Binding[],
): HttpOutputBinding | null {
  for (const b of bindings) {
    if (isHttpOutputBinding(b)) return b;
  }
  return null;
}

export function defineHttpFunction(options: {
  dir: string;
  functionJson: FunctionJson;
  handler: HttpHandler;
}): HttpFunctionDefinition {
  assertValidDir(options.dir);
  assertValidFunctionJson(options.functionJson);

  const trigger = findHttpTrigger(options.functionJson.bindings);
  assert(
    trigger !== null,
    () =>
      new AppError(
        "DEFINITION",
        `HTTP function "${options.dir}" is missing an httpTrigger binding.`,
      ),
  );

  const httpOutput = findHttpOutput(options.functionJson.bindings);

  return {
    dir: options.dir,
    functionJson: options.functionJson,
    kind: "http",
    handler: options.handler,
    httpTrigger: trigger,
    httpOutput,
  };
}

export function defineTriggerFunction<
  TPayload extends InvokeRequest = InvokeRequest,
  TResult extends InvokeResponse = InvokeResponse,
>(options: {
  dir: string;
  functionJson: FunctionJson;
  handler: TriggerHandler<TPayload, TResult>;
}): TriggerFunctionDefinition<TPayload, TResult> {
  assertValidDir(options.dir);
  assertValidFunctionJson(options.functionJson);

  const trigger = findHttpTrigger(options.functionJson.bindings);
  assert(
    trigger === null,
    () =>
      new AppError(
        "DEFINITION",
        `Trigger function "${options.dir}" must not include an httpTrigger binding.`,
      ),
  );

  return {
    dir: options.dir,
    functionJson: options.functionJson,
    kind: "trigger",
    handler: options.handler,
  };
}
