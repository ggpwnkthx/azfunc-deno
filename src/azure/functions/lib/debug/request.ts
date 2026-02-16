import type {
  AzureHttpRequestData,
  InvokeRequest,
  JsonValue,
} from "../../invoke.ts";
import { isRecord } from "../util.ts";

function isAzureHttpRequestDataLike(v: unknown): v is AzureHttpRequestData {
  if (!isRecord(v)) return false;
  const url = v["Url"];
  const method = v["Method"];
  return typeof url === "string" && url.trim() !== "" &&
    typeof method === "string" && method.trim() !== "";
}

/**
 * Custom handler payload: the HTTP trigger data can be under any binding name.
 * Scan Data.* values and return the first thing that looks like AzureHttpRequestData.
 */
export function findHttpRequestData(
  payload: InvokeRequest<object, Record<string, JsonValue>>,
): AzureHttpRequestData | undefined {
  for (const v of Object.values(payload.Data)) {
    if (isAzureHttpRequestDataLike(v)) return v;
  }
  return undefined;
}