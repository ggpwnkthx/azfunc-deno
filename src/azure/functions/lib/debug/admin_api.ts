import type { FunctionsHostStatus } from "./types.ts";
import { isRecord } from "../util.ts";

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort fetch GET /admin/host/status/ from the Functions host.
 * Requires:
 * - `--allow-net`
 * - a valid master key (x-functions-key) in most hosted environments
 */
export async function fetchFunctionsHostStatus(
  hostBaseUrl: string,
  opts: { functionsMasterKey?: string; timeoutMs: number },
): Promise<FunctionsHostStatus | undefined> {
  const url = `${hostBaseUrl.replace(/\/+$/g, "")}/admin/host/status/`;

  const headers = new Headers();
  if (opts.functionsMasterKey) {
    headers.set("x-functions-key", opts.functionsMasterKey);
  }

  const res = await fetchWithTimeout(
    url,
    { method: "GET", headers },
    opts.timeoutMs,
  )
    .catch(() => undefined);

  if (!res || !res.ok) return undefined;

  const parsed = await res.json().catch(() => undefined);
  if (!isRecord(parsed)) return undefined;

  const id = parsed["id"];
  const state = parsed["state"];
  const version = parsed["version"];
  const versionDetails = parsed["versionDetails"];

  if (
    typeof id !== "string" || typeof state !== "string" ||
    typeof version !== "string"
  ) {
    return undefined;
  }

  return {
    id,
    state,
    version,
    ...(typeof versionDetails === "string" ? { versionDetails } : {}),
  };
}
