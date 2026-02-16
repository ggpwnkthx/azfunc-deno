import { join } from "@std/path";
import { AppError } from "./errors.ts";

export function toPosixPath(p: string): string {
  return p.replaceAll("\\", "/");
}

export function joinFsPath(...parts: string[]): string {
  return join(parts[0], ...parts.slice(1));
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
