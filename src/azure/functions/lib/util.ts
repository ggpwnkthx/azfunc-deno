import { AppError } from "./errors.ts";

export function tryCall<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export function envGet(key: string): string | undefined {
  return tryCall(() => Deno.env.get(key)) ?? undefined;
}

export function parseIntEnv(key: string): number | undefined {
  const raw = envGet(key);
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function objectIfNotEmpty<T extends Record<string, unknown>>(
  obj: T,
): T | undefined {
  return Object.keys(obj).length === 0 ? undefined : obj;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function asRecord(v: unknown, what: string): Record<string, unknown> {
  if (!isRecord(v)) {
    throw new AppError("BAD_REQUEST", `Invalid ${what}: expected object.`);
  }
  return v;
}