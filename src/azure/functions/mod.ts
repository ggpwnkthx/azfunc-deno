// Runtime surface area: safe to import from function modules.

export * from "./bindings/index.ts";
export * from "./define.ts";

// App / routing
export { AzureFunctionsApp } from "./app.ts";
export type { AzureFunctionsRouter, RouterOptions } from "./router.ts";
export { buildAzureFunctionsRouter, resolveRoutePrefixFromEnv } from "./router.ts";

// Custom handler payload types/helpers
export type {
  AzureHttpRequestData,
  AzureHttpResponseData,
  InvokeRequest,
  InvokeResponse,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
} from "./invoke.ts";
export {
  asAzureHttpRequestData,
  invokeResponseFromHttpResponse,
  parseInvokeRequest,
  toAzureHttpResponseData,
  toDenoRequest,
} from "./invoke.ts";

// Re-export utilities from lib/
export type { AppErrorCode, ErrorPayload } from "./lib/errors.ts";
export { AppError, toErrorPayload, toErrorResponse } from "./lib/errors.ts";
export { assert } from "./lib/validate.ts";
export { readJsonBodyLimited, tryParseJson } from "./lib/json.ts";
export {
  joinFsPath,
  joinPosix,
  normalizeFunctionDir,
  relativePosix,
  toFileUrlFromFsPath,
  toPosixPath,
} from "./lib/path.ts";
