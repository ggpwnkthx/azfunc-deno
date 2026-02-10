// Runtime surface area: safe to import from function modules.
// IMPORTANT: do NOT export generator/scanner/router from here (prevents TLA cycles).

export * from "./bindings/index.ts";
export * from "./define.ts";

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
export type { AppErrorCode } from "./lib/errors.ts";
export { AppError, toErrorResponse } from "./lib/errors.ts";
export { assert } from "./lib/validate.ts";
export { readJsonBodyLimited, tryParseJson } from "./lib/json.ts";
export { joinPosix } from "./lib/path.ts";
