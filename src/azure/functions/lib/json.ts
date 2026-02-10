import { AppError } from "./errors.ts";
import { readStreamTextLimited } from "./streams.ts";

export function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Read and parse a JSON request body with a strict byte limit.
 * Returns unknown (caller validates shape).
 */
export async function readJsonBodyLimited(
  req: Request,
  maxBytes: number,
): Promise<unknown> {
  const body = req.body;
  if (!body) {
    throw new AppError("BAD_REQUEST", "Missing request body.");
  }

  const text = await readStreamTextLimited(body, maxBytes, "Request body");
  const parsed = tryParseJson(text);

  if (parsed === undefined) {
    throw new AppError("BAD_REQUEST", "Invalid JSON body.");
  }
  return parsed;
}
