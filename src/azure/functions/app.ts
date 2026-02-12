import type { FunctionDefinition } from "./define.ts";
import { AppError } from "./lib/errors.ts";
import type { AzureFunctionsRouter, RouterOptions } from "./router.ts";
import {
  buildAzureFunctionsRouter,
  resolveRoutePrefixFromEnv,
  resolveRoutePrefixFromHostJson,
} from "./router.ts";
import type { GenerateOptions, WrittenFile } from "./generator.ts";
import { writeFunctionJsonFiles } from "./generator.ts";

/**
 * Options for `AzureFunctionsApp.serve()`.
 *
 * The intent is to keep `serve.ts` as the function registration source of truth,
 * while the app owns all CLI/runtime behavior.
 */
export interface AppServeOptions {
  /**
   * CLI args (default: Deno.args)
   * Supported:
   * - --gen
   * - --rootDir <path> / --rootDir=<path>
   * - --port <n> / --port=<n>
   * - --routePrefix <prefix> / --routePrefix=<prefix>
   */
  args?: readonly string[];

  /** Root dir for generation (default: Deno.cwd()) */
  rootDir?: string;

  /** Generation: create missing function dirs (default: true) */
  ensureDirs?: boolean;

  /** Generation: validate dirs if ensureDirs=false (default: true) */
  validateDirs?: boolean;

  /** Server port override (default: env FUNCTIONS_CUSTOMHANDLER_PORT or 8080) */
  port?: number;

  /**
   * Route prefix override (default: resolveRoutePrefixFromEnv("api"))
   * Examples: "api", "", "v1"
   */
  routePrefix?: string;

  /** Router tuning (optional) */
  routerOptions?: Omit<RouterOptions, "routePrefix">;

  /** Output for --gen logs (default: console.log) */
  log?: (line: string) => void;
}

/**
 * Explicit Azure Functions registry (no scanning).
 *
 * This is intentionally tiny:
 * - stores registered FunctionDefinitions by `dir`
 * - validates duplicates
 * - can build a router from the registered set
 * - can generate/write function.json for the registered set
 * - can own CLI behavior via `serve()`
 */
export class AzureFunctionsApp {
  readonly #byDir = new Map<string, FunctionDefinition>();

  register(fn: FunctionDefinition): this {
    const dir = fn.dir;
    const existing = this.#byDir.get(dir);
    if (existing) {
      throw new AppError(
        "DEFINITION",
        `Duplicate function dir registration: "${dir}".`,
      );
    }
    this.#byDir.set(dir, fn);
    return this;
  }

  registerAll(fns: readonly FunctionDefinition[]): this {
    for (const fn of fns) this.register(fn);
    return this;
  }

  list(): readonly FunctionDefinition[] {
    return [...this.#byDir.values()].sort((a, b) => a.dir.localeCompare(b.dir));
  }

  buildRouter(options: RouterOptions = {}): AzureFunctionsRouter {
    return buildAzureFunctionsRouter(this.list(), options);
  }

  /**
   * Write each registered function's `function.json`.
   */
  async writeFunctionJsonFiles(
    options: GenerateOptions = {},
  ): Promise<WrittenFile[]> {
    return await writeFunctionJsonFiles(this.list(), options);
  }

  /**
   * CLI/runtime entrypoint owned by the app.
   *
   * Behavior:
   * - If args include `--gen`, write function.json files and exit.
   * - Otherwise, start the custom-handler HTTP server.
   */
  async serve(options: AppServeOptions = {}): Promise<void> {
    const args = options.args ?? Deno.args;
    const log = options.log ?? ((line: string) => console.log(line));

    const isGen = hasFlag(args, "--gen");

    if (isGen) {
      const rootDir = getStringFlag(args, "--rootDir") ?? options.rootDir ??
        Deno.cwd();

      const ensureDirs = options.ensureDirs ?? true;
      const validateDirs = options.validateDirs ?? true;

      const written = await this.writeFunctionJsonFiles({
        rootDir,
        ensureDirs,
        validateDirs,
      });

      written.sort((a, b) => a.dir.localeCompare(b.dir));
      log(`Wrote ${written.length} function.json file(s):`);
      for (const w of written) log(`- ${w.dir} -> ${w.path}`);
      return;
    }

    const port = options.port ?? getIntFlag(args, "--port") ?? parseEnvPort(
      Deno.env.get("FUNCTIONS_CUSTOMHANDLER_PORT"),
      8080,
    );

    const routePrefix = options.routePrefix ??
      getStringFlag(args, "--routePrefix") ??
      resolveRoutePrefixFromEnv() ??
      resolveRoutePrefixFromHostJson() ??
      "api";

    const router = this.buildRouter({
      routePrefix,
      ...(options.routerOptions ?? {}),
    });

    Deno.serve({ port }, (req: Request) => router.handle(req));
  }
}

/* --------------------------------- CLI utils -------------------------------- */

function hasFlag(args: readonly string[], name: string): boolean {
  return args.includes(name);
}

function getStringFlag(
  args: readonly string[],
  name: string,
): string | undefined {
  // Supports: --x value  OR  --x=value
  for (let i = 0; i < args.length; i++) {
    const a = args[i] ?? "";
    if (a === name) {
      const v = args[i + 1];
      return typeof v === "string" && v.trim() !== "" ? v : undefined;
    }
    const prefix = `${name}=`;
    if (a.startsWith(prefix)) {
      const v = a.slice(prefix.length);
      return v.trim() !== "" ? v : undefined;
    }
  }
  return undefined;
}

function getIntFlag(args: readonly string[], name: string): number | undefined {
  const s = getStringFlag(args, name);
  if (s === undefined) return undefined;

  const n = Number.parseInt(s, 10);
  if (
    !Number.isFinite(n) || String(n) !== String(Number.parseInt(String(n), 10))
  ) {
    throw new AppError("DEFINITION", `Invalid ${name} value: ${s}`);
  }
  if (n <= 0 || n > 65535) {
    throw new AppError("DEFINITION", `Invalid ${name} (1-65535): ${n}`);
  }
  return n;
}

function parseEnvPort(raw: string | undefined, fallback: number): number {
  if (!raw || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0 || n > 65535) return fallback;
  return n;
}
