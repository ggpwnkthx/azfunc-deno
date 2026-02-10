import { AppError } from "./lib/errors.ts";
import { readStreamTextLimited } from "./lib/streams.ts";

/**
 * JSON types (compatible with custom handler payloads).
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonArray = JsonValue[];
export type JsonObject = { [k: string]: JsonValue };

/**
 * Azure Functions Custom Handler request payload.
 */
export interface InvokeRequest<
  TData extends Record<string, JsonValue> = Record<string, JsonValue>,
  TMetadata extends Record<string, JsonValue> = Record<string, JsonValue>,
> {
  Data: TData;
  Metadata: TMetadata;
}

/**
 * Azure Functions Custom Handler response payload.
 */
export interface InvokeResponse<
  TOutputs extends Record<string, JsonValue> = Record<string, JsonValue>,
  TReturnValue extends JsonValue = JsonValue,
> {
  Outputs?: TOutputs;
  Logs?: string[] | null;
  ReturnValue?: TReturnValue | null;
}

/**
 * HTTP trigger data shape inside InvokeRequest.Data.<httpTriggerName>.
 * (Matches casing used by the Functions host.)
 */
export interface AzureHttpRequestData {
  Url: string;
  Method: string;
  Query?: string;
  Headers?: Record<string, readonly string[]>;
  Params?: Record<string, string>;
  Body?: string;
}

/**
 * HTTP output binding value for Outputs.<httpOutName>.
 *
 * IMPORTANT:
 * - Request headers are represented as string[] in the custom handler payload.
 * - Response headers MUST be emitted as string values. If you emit arrays,
 *   some host paths stringify them (often including newlines), which Kestrel rejects.
 */
export interface AzureHttpResponseData {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function asRecord(v: unknown, what: string): Record<string, unknown> {
  if (!isRecord(v)) {
    throw new AppError("BAD_REQUEST", `Invalid ${what}: expected object.`);
  }
  return v;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function asStringArray(v: unknown, what: string): string[] {
  if (!isStringArray(v)) {
    throw new AppError("BAD_REQUEST", `Invalid ${what}: expected string[].`);
  }
  return v;
}

function asStringRecord(v: unknown, what: string): Record<string, string> {
  const r = asRecord(v, what);
  const out: Record<string, string> = {};
  for (const [k, vv] of Object.entries(r)) {
    if (typeof vv !== "string") {
      throw new AppError(
        "BAD_REQUEST",
        `Invalid ${what}.${k}: expected string.`,
      );
    }
    out[k] = vv;
  }
  return out;
}

function asHeaderRecord(
  v: unknown,
  what: string,
): Record<string, readonly string[]> {
  const r = asRecord(v, what);
  const out: Record<string, readonly string[]> = {};
  for (const [k, vv] of Object.entries(r)) {
    out[k] = asStringArray(vv, `${what}.${k}`);
  }
  return out;
}

export function parseInvokeRequest(
  payload: unknown,
): InvokeRequest<Record<string, JsonValue>, Record<string, JsonValue>> {
  const root = asRecord(payload, "invoke request payload");
  const data = asRecord(root["Data"], "invoke request payload.Data");
  const metadata = asRecord(
    root["Metadata"],
    "invoke request payload.Metadata",
  );

  return {
    Data: data as unknown as Record<string, JsonValue>,
    Metadata: metadata as unknown as Record<string, JsonValue>,
  };
}

export function asAzureHttpRequestData(v: unknown): AzureHttpRequestData {
  const r = asRecord(v, "Data.<httpTrigger>");
  const url = r["Url"];
  const method = r["Method"];

  if (typeof url !== "string" || url.trim() === "") {
    throw new AppError("BAD_REQUEST", "Invalid Data.<httpTrigger>.Url.");
  }
  if (typeof method !== "string" || method.trim() === "") {
    throw new AppError("BAD_REQUEST", "Invalid Data.<httpTrigger>.Method.");
  }

  const query = r["Query"];
  const headers = r["Headers"];
  const params = r["Params"];
  const body = r["Body"];

  return {
    Url: url,
    Method: method,
    ...(typeof query === "string" ? { Query: query } : {}),
    ...(headers !== undefined
      ? { Headers: asHeaderRecord(headers, "Headers") }
      : {}),
    ...(params !== undefined
      ? { Params: asStringRecord(params, "Params") }
      : {}),
    ...(typeof body === "string" ? { Body: body } : {}),
  };
}

/**
 * Convert AzureHttpRequestData -> standard Request.
 * Note: Body is treated as UTF-8 text (as provided by the host payload).
 */
export function toDenoRequest(req: AzureHttpRequestData): Request {
  const headers = new Headers();
  if (req.Headers) {
    for (const [k, values] of Object.entries(req.Headers)) {
      for (const v of values) headers.append(k, v);
    }
  }

  const init: RequestInit = {
    method: req.Method,
    headers,
    ...(req.Body !== undefined ? { body: req.Body } : {}),
  };

  return new Request(req.Url, init);
}

/**
 * Kestrel rejects control chars (incl. \r/\n) and non-ASCII in header values.
 * Fail fast so we don’t crash the host.
 */
const HEADER_NAME_TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function assertSafeHeaderName(name: string): void {
  if (!HEADER_NAME_TOKEN_RE.test(name)) {
    throw new AppError("INTERNAL", `Unsafe HTTP response header name: ${name}`);
  }
}

function assertSafeHeaderValueAscii(value: string, name: string): void {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);

    // Disallow CTLs (0x00-0x1F), DEL (0x7F), and non-ASCII (> 0x7F).
    if (code < 0x20 || code === 0x7f || code > 0x7f) {
      throw new AppError(
        "INTERNAL",
        `Unsafe HTTP response header value for "${name}" (char 0x${
          code.toString(16).padStart(4, "0")
        }).`,
      );
    }
  }
}

function headersToAzure(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};

  // Note: Headers() in Fetch flattens multi-values (except Set-Cookie, which is special).
  for (const [k, v] of h.entries()) {
    const lk = k.toLowerCase();

    // Set-Cookie handling in custom handlers is awkward because the response shape is a map.
    // Keep prior behavior: skip it rather than emitting something invalid.
    if (lk === "set-cookie") continue;

    assertSafeHeaderName(k);
    assertSafeHeaderValueAscii(v, k);
    out[k] = v;
  }

  return out;
}

/**
 * Convert a standard Response to the HTTP output binding payload.
 * This necessarily buffers the body (custom handler payload is JSON).
 */
export async function toAzureHttpResponseData(
  res: Response,
  opts: { maxBodyBytes?: number } = {},
): Promise<AzureHttpResponseData> {
  const maxBodyBytes = opts.maxBodyBytes ?? 4 * 1024 * 1024;

  const bodyText = res.body
    ? await readStreamTextLimited(res.body, maxBodyBytes, "HTTP response body")
    : undefined;

  const headers = headersToAzure(res.headers);

  return {
    statusCode: res.status,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(bodyText !== undefined ? { body: bodyText } : {}),
  };
}

/**
 * Wrap a Response into an InvokeResponse targeting an HTTP output binding name.
 * If the binding name is "$return", the HTTP response is set as ReturnValue.
 */
export async function invokeResponseFromHttpResponse(
  httpOutName: string,
  res: Response,
  opts: { maxBodyBytes?: number } = {},
): Promise<InvokeResponse<Record<string, JsonValue>, JsonValue>> {
  const httpRes = await toAzureHttpResponseData(res, opts);

  if (httpOutName === "$return") {
    return { ReturnValue: httpRes as unknown as JsonValue };
  }

  return {
    Outputs: {
      [httpOutName]: httpRes as unknown as JsonValue,
    },
  };
}
