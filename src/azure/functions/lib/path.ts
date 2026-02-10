import { join, relative, toFileUrl } from "@std/path";
import { AppError } from "./errors.ts";

/**
 * Join path segments in a predictable POSIX-like way for logical “function dirs”.
 * Not intended for OS filesystem paths.
 */
export function joinPosix(...parts: string[]): string {
  return parts
    .map((p) => p.replaceAll("\\", "/").replaceAll(/\/+$/g, ""))
    .filter((p) => p.length > 0)
    .join("/")
    .replaceAll(/\/{2,}/g, "/");
}

export function toPosixPath(p: string): string {
  return p.replaceAll("\\", "/");
}

export function joinFsPath(...parts: string[]): string {
  return join(parts[0], ...parts.slice(1));
}

export function toFileUrlFromFsPath(fsPath: string): string {
  return toFileUrl(fsPath).href;
}

export function relativePosix(fromFs: string, toFs: string): string {
  return toPosixPath(relative(fromFs, toFs));
}

/**
 * Validate + normalize function folder dirs.
 * Must be relative, POSIX-ish, no traversal.
 */
export function normalizeFunctionDir(dir: string): string {
  const d = toPosixPath(dir).replace(/^\/+/, "").replace(/\/+$/g, "");
  if (d.trim() === "") {
    throw new AppError("DEFINITION", "Function dir must be non-empty.");
  }
  if (d.includes("..")) {
    throw new AppError(
      "DEFINITION",
      `Function dir must not contain "..": ${dir}`,
    );
  }
  if (d.includes("\n") || d.includes("\r")) {
    throw new AppError(
      "DEFINITION",
      `Function dir must not contain newlines: ${dir}`,
    );
  }
  return d;
}
