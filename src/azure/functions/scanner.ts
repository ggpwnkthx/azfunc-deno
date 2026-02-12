import type { FunctionDefinition } from "./define.ts";
import { joinFsPath, toFileUrlFromFsPath } from "./lib/path.ts";

/**
 * Discovery default (project-root functions):
 * - Each function is a *top-level directory* under the project root.
 * - A function directory must contain an `index.ts` entry module.
 *
 * This avoids accidentally scanning/importing nested `index.ts` files under `src/`, etc.
 */
const SKIP_DIRS = new Set([
  // VCS / tooling
  ".git",
  ".deno",
  "node_modules",
  ".github",
  ".vscode",
  ".idea",

  // Common non-function dirs at repo root
  "src",
  "dist",
  "build",
  "out",
  "coverage",
  "docs",
  "scripts",
  "tools",
  "test",
  "tests",
  "tmp",
  "vendor",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isFunctionDefinition(v: unknown): v is FunctionDefinition {
  if (!isRecord(v)) return false;

  const kind = v.kind;
  if (kind !== "trigger" && kind !== "http") return false;

  if (typeof v.dir !== "string") return false;
  if (!isRecord(v.functionJson) || !Array.isArray(v.functionJson.bindings)) {
    return false;
  }
  if (!isRecord(v.bindings)) return false;

  if (typeof v.handler !== "function") return false;
  return true;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await Deno.stat(path);
    return s.isFile;
  } catch {
    return false;
  }
}

async function collectFromModule(
  modulePath: string,
): Promise<FunctionDefinition[]> {
  const defs: FunctionDefinition[] = [];
  const mod = await import(toFileUrlFromFsPath(modulePath));

  for (const value of Object.values(mod)) {
    if (isFunctionDefinition(value)) defs.push(value);
  }

  return defs;
}

/**
 * Scans only *top-level* directories under `projectRootDir` for `<dir>/index.ts`.
 */
export async function scanFunctionDirs(
  projectRootDir: string,
): Promise<string[]> {
  const rootAbs = await Deno.realPath(projectRootDir);
  const dirs: string[] = [];

  for await (const entry of Deno.readDir(rootAbs)) {
    if (!entry.isDirectory) continue;

    const name = entry.name;

    // Skip hidden dirs (".git", ".something") and known non-function dirs.
    if (name.startsWith(".")) continue;
    if (SKIP_DIRS.has(name)) continue;

    const indexPath = joinFsPath(rootAbs, name, "index.ts");
    if (await fileExists(indexPath)) {
      dirs.push(name);
    }
  }

  return dirs.sort();
}

/**
 * Discovers all Azure Functions.
 *
 * Prefers a manifest if present; otherwise auto-discovers by scanning for
 * `<projectRoot>/*\/index.ts` and importing modules to find exported definitions.
 */
export async function discoverFunctions(
  projectRoot: string,
): Promise<FunctionDefinition[]> {
  const rootAbs = await Deno.realPath(projectRoot);
  const manifestPath = joinFsPath(rootAbs, "manifest.ts");

  // 1) Manifest (fast path)
  if (await fileExists(manifestPath)) {
    const defs = await collectFromModule(manifestPath);
    if (defs.length > 0) return defs.sort((a, b) => a.dir.localeCompare(b.dir));
  }

  // 2) Auto-discovery (top-level only)
  const discovered: FunctionDefinition[] = [];
  const functionDirs = await scanFunctionDirs(rootAbs);

  for (const dirName of functionDirs) {
    const indexPath = joinFsPath(rootAbs, dirName, "index.ts");
    try {
      const defs = await collectFromModule(indexPath);
      discovered.push(...defs);
    } catch {
      // Production choice: ignore unreadable/broken modules (keeps boot resilient).
      // If you prefer “fail fast”, remove this catch and let it throw.
    }
  }

  return discovered.sort((a, b) => a.dir.localeCompare(b.dir));
}
