import type { Binding, FunctionJson, HttpTriggerBinding } from "./bindings.ts";
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

export type HandlerResult = Response | Promise<Response>;

export type HttpHandler =
  | ((req: Request) => HandlerResult)
  | ((req: Request, ctx: HttpContext) => HandlerResult);

export type TriggerHandler<T = unknown> =
  | ((payload: T) => HandlerResult)
  | ((payload: T, ctx: TriggerContext) => HandlerResult);

export interface FunctionDefinitionBase {
  dir: string;
  functionJson: FunctionJson;
  kind: FunctionKind;
}

export interface HttpFunctionDefinition extends FunctionDefinitionBase {
  kind: "http";
  handler: HttpHandler;
  httpTrigger: HttpTriggerBinding;
}

export interface TriggerFunctionDefinition<T = unknown> extends FunctionDefinitionBase {
  kind: "trigger";
  handler: TriggerHandler<T>;
}

export type FunctionDefinition = HttpFunctionDefinition | TriggerFunctionDefinition;

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

function findHttpTrigger(bindings: readonly Binding[]): HttpTriggerBinding | null {
  for (const b of bindings) {
    if (b.type === "httpTrigger") return b;
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

  return {
    dir: options.dir,
    functionJson: options.functionJson,
    kind: "http",
    handler: options.handler,
    httpTrigger: trigger,
  };
}

export function defineTriggerFunction<T = unknown>(options: {
  dir: string;
  functionJson: FunctionJson;
  handler: TriggerHandler<T>;
}): TriggerFunctionDefinition<T> {
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
