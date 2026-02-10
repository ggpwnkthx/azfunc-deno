import { AppError } from "./lib/errors.ts";

/**
 * JSON types (compatible with custom handler payloads).
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonArray = JsonValue[];
export type JsonObject = { [k: string]: JsonValue };

/**
 * Azure Functions Custom Handler request payload.
 * Docs: Data + Metadata. (Values are JSON-decoded.)
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
 * Docs: Outputs + Logs + ReturnValue.
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
 * (Matches the casing used by the Functions host.)
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
 */
export interface AzureHttpResponseData {
  statusCode?: number;
  headers?: Record<string, readonly string[]>;
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
    throw new AppError(
      "BAD_REQUEST",
      `Invalid ${what}: expected string[].`,
    );
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

/**
 * Parse + validate the top-level InvokeRequest envelope.
 * (Does not deep-validate Data values beyond “is object”.)
 */
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

/**
 * Validate/normalize Data.<bindingName> into AzureHttpRequestData.
 */
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
  };

  if (req.Body !== undefined) {
    init.body = req.Body;
  }

  return new Request(req.Url, init);
}

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function readStreamTextLimited(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<string> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        throw new AppError(
          "BAD_REQUEST",
          `HTTP response body too large (>${maxBytes} bytes).`,
          { details: { maxBytes } },
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(concatChunks(chunks, total));
}

function headersToAzure(
  h: Headers,
): Record<string, readonly string[]> {
  const out: Record<string, readonly string[]> = {};

  // Most headers are single-valued once exposed via Headers.
  for (const [k, v] of h.entries()) {
    if (k.toLowerCase() === "set-cookie") continue;
    out[k] = [v];
  }

  // Preserve multiple Set-Cookie values when available (Deno extension).
  const sc = h.getSetCookie?.() ?? [];
  if (sc.length > 0) out["set-cookie"] = sc;

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
    ? await readStreamTextLimited(res.body, maxBodyBytes)
    : undefined;

  return {
    statusCode: res.status,
    headers: headersToAzure(res.headers),
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
