import { AppError } from "./errors.ts";

export function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
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

export async function readJsonBodyLimited(
  req: Request,
  maxBytes: number,
): Promise<unknown> {
  const body = req.body;
  if (!body) return null;

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
          `Request body too large (>${maxBytes} bytes).`,
          { details: { maxBytes } },
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = concatChunks(chunks, total);
  const text = new TextDecoder().decode(bytes);
  const parsed = tryParseJson(text);

  if (parsed === undefined) {
    throw new AppError("BAD_REQUEST", "Invalid JSON body.");
  }
  return parsed;
}
