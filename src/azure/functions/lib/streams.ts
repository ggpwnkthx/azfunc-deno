import { AppError } from "./errors.ts";

export function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Read an entire stream with a strict byte limit.
 * Memory note: buffers up to maxBytes in RAM.
 */
export async function readStreamBytesLimited(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
  what = "stream",
): Promise<Uint8Array> {
  const reader = stream.getReader();
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
          `${what} too large (>${maxBytes} bytes).`,
          { details: { maxBytes } },
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return concatChunks(chunks, total);
}

export async function readStreamTextLimited(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
  what = "stream",
): Promise<string> {
  const bytes = await readStreamBytesLimited(stream, maxBytes, what);
  return new TextDecoder().decode(bytes);
}
