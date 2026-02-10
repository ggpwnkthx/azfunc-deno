import type { FunctionDefinition } from "./define.ts";
import type { FunctionJson } from "./bindings/index.ts";
import { joinPosix } from "./lib/path.ts";
import { AppError } from "./lib/errors.ts";
import { discoverFunctions } from "./scanner.ts";

export interface GenerateOptions {
  /** Repo root where function folders live (default: Deno.cwd()) */
  rootDir?: string;
  /**
   * If true, create each function directory if missing. (Default: true)
   * Azure Functions requires each function to have a root directory.
   */
  ensureDirs?: boolean;
  /**
   * If true, validate each dir exists and is a directory before writing.
   * Ignored if ensureDirs is true. (Default: true)
   */
  validateDirs?: boolean;
}

export interface WrittenFile {
  dir: string;
  path: string;
  functionJson: FunctionJson;
}

export async function writeFunctionJsonFiles(
  functions: readonly FunctionDefinition[],
  options: GenerateOptions = {},
): Promise<WrittenFile[]> {
  const rootDir = options.rootDir ?? Deno.cwd();
  const ensureDirs = options.ensureDirs ?? true;
  const validateDirs = options.validateDirs ?? true;

  const seen = new Set<string>();
  for (const fn of functions) {
    if (seen.has(fn.dir)) {
      throw new AppError("DEFINITION", `Duplicate function dir: "${fn.dir}".`);
    }
    seen.add(fn.dir);
  }

  const written: WrittenFile[] = [];

  for (const fn of functions) {
    const functionDirPath = joinPosix(rootDir, fn.dir);

    if (ensureDirs) {
      await Deno.mkdir(functionDirPath, { recursive: true });
    } else if (validateDirs) {
      const stat = await Deno.stat(functionDirPath).catch(() => undefined);
      if (!stat?.isDirectory) {
        throw new AppError(
          "DEFINITION",
          `Function dir does not exist or is not a directory: ${functionDirPath}`,
        );
      }
    }

    const outPath = joinPosix(functionDirPath, "function.json");
    const jsonText = JSON.stringify(fn.functionJson, null, 2) + "\n";
    await Deno.writeTextFile(outPath, jsonText);

    written.push({ dir: fn.dir, path: outPath, functionJson: fn.functionJson });
  }

  return written;
}

if (import.meta.main) {
  const functions = await discoverFunctions(Deno.cwd());
  await writeFunctionJsonFiles(functions, { rootDir: Deno.cwd() });
}
