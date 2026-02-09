import { AppError } from "./errors.ts";

export function assert(
  condition: unknown,
  messageOrFactory: string | (() => AppError),
): asserts condition {
  if (condition) return;
  if (typeof messageOrFactory === "function") throw messageOrFactory();
  throw new AppError("INTERNAL", messageOrFactory);
}
