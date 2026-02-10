import type { FunctionDefinition } from "./define.ts";
import { joinFsPath, relativePosix, toFileUrlFromFsPath } from "./lib/path.ts";

const SKIP_DIRS = new Set([
  ".git",
  ".deno",
  "node_modules",
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
 * Scans for function directories by looking for directories containing `index.ts`.
 * This expects to scan *within* the functions root (e.g. `<repo>/functions` or `<repo>/src/functions`).
 */
export async function scanFunctionDirs(
  functionsRootDir: string,
): Promise<string[]> {
  const rootAbs = await Deno.realPath(functionsRootDir);
  const dirs: string[] = [];

  async function walk(dirAbs: string): Promise<void> {
    for await (const entry of Deno.readDir(dirAbs)) {
      if (entry.isDirectory) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(joinFsPath(dirAbs, entry.name));
        }
        continue;
      }

      if (entry.isFile && entry.name === "index.ts") {
        const rel = relativePosix(rootAbs, dirAbs).replace(/^\/+/, "");
        dirs.push(rel);
      }
    }
  }

  await walk(rootAbs);
  return dirs.sort();
}

/**
 * Discovers all Azure Functions.
 *
 * Prefers a manifest if present; otherwise auto-discovers by scanning for
 * `<functionsRoot>/**\/index.ts` and importing modules to find exported definitions.
 */
export async function discoverFunctions(
  functionsRoot: string,
): Promise<FunctionDefinition[]> {
  const rootAbs = await Deno.realPath(functionsRoot);
  const manifestPath = joinFsPath(rootAbs, "manifest.ts");

  // 1) Manifest (fast path)
  if (await fileExists(manifestPath)) {
    const defs = await collectFromModule(manifestPath);
    if (defs.length > 0) return defs.sort((a, b) => a.dir.localeCompare(b.dir));
  }

  // 2) Auto-discovery
  const discovered: FunctionDefinition[] = [];
  const functionDirs = await scanFunctionDirs(rootAbs);

  for (const relDir of functionDirs) {
    const indexPath = joinFsPath(rootAbs, relDir, "index.ts");
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
