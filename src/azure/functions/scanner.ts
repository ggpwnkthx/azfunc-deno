import type { FunctionDefinition } from "./define.ts";
import { joinPosix } from "./lib/path.ts";

const SKIP_DIRS = new Set([
  ".git",
  ".deno",
  "node_modules",
  "src",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isFunctionDefinition(v: unknown): v is FunctionDefinition {
  if (!isRecord(v)) return false;

  const kind = v.kind;
  if (kind !== "http" && kind !== "trigger") return false;
  if (typeof v.dir !== "string") return false;

  if (!isRecord(v.functionJson) || !Array.isArray(v.functionJson.bindings)) {
    return false;
  }

  // handler exists on both shapes (Http/Trigger) and should be callable
  if (typeof v.handler !== "function") return false;

  if (kind === "http") {
    return isRecord((v as Record<string, unknown>).httpTrigger) &&
      (v as Record<string, unknown>).httpTrigger !== null;
  }

  return true;
}

function toFileUrl(path: string): string {
  // Deno expects absolute file URLs. realPath also normalizes symlinks.
  // This is intentionally simple (posix paths) since the rest of this codebase is posix-ish.
  const abs = path.startsWith("/") ? path : joinPosix(Deno.cwd(), path);
  const url = new URL(`file://${abs}`);
  return url.href;
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
  const mod = await import(toFileUrl(modulePath));

  for (const value of Object.values(mod)) {
    if (isFunctionDefinition(value)) defs.push(value);
  }

  return defs;
}

/**
 * Scans for function directories by looking for directories containing `index.ts`.
 * This expects to scan *within* the functions root (e.g. `<repo>/src/functions`).
 */
export async function scanFunctionDirs(
  functionsRootDir: string,
): Promise<string[]> {
  const root = functionsRootDir.replace(/\/+$/, "");
  const dirs: string[] = [];

  async function walk(dirAbs: string): Promise<void> {
    for await (const entry of Deno.readDir(dirAbs)) {
      if (entry.isDirectory) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(joinPosix(dirAbs, entry.name));
        }
        continue;
      }

      if (entry.isFile && entry.name === "index.ts") {
        const rel = dirAbs.startsWith(root)
          ? dirAbs.slice(root.length).replace(/^\/+/, "")
          : dirAbs;
        dirs.push(rel);
      }
    }
  }

  await walk(root);
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
  const manifestPath = joinPosix(functionsRoot, "manifest.ts");

  // 1) Manifest (fast path)
  if (await fileExists(manifestPath)) {
    const defs = await collectFromModule(manifestPath);
    if (defs.length > 0) return defs.sort((a, b) => a.dir.localeCompare(b.dir));
  }

  // 2) Auto-discovery
  const discovered: FunctionDefinition[] = [];
  const functionDirs = await scanFunctionDirs(functionsRoot);

  for (const relDir of functionDirs) {
    const indexPath = joinPosix(functionsRoot, relDir, "index.ts");
    try {
      const defs = await collectFromModule(indexPath);
      discovered.push(...defs);
    } catch {
      // ignore unreadable/broken modules
    }
  }

  return discovered.sort((a, b) => a.dir.localeCompare(b.dir));
}
