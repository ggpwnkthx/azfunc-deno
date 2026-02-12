// Runs: deno fmt -> deno lint --fix -> deno check
// On failure: prints a JSON "decision: block" payload so Claude sees the output.
//
// Required permissions for this script (via deno run flags):
//   --allow-run=deno

type HookInput = {
  cwd?: unknown;
  hook_event_name?: unknown;
  tool_name?: unknown;
  tool_input?: unknown;
};

type PostToolUseHookOutput = {
  decision: "block";
  reason: string;
  suppressOutput?: boolean;
  hookSpecificOutput: {
    hookEventName: "PostToolUse";
    additionalContext: string;
  };
};

const MAX_CAPTURE_BYTES = 64 * 1024; // cap stdout and stderr each

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

async function readStdinText(): Promise<string> {
  // Hook input JSON arrives on stdin. (May be empty in some edge cases.)
  return await new Response(Deno.stdin.readable).text();
}

async function readTextLimited(
  stream: ReadableStream<Uint8Array>,
  limitBytes: number,
): Promise<{ text: string; truncated: boolean }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let captured = "";
  let used = 0;
  let truncated = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value || value.length === 0) continue;

    if (used >= limitBytes) {
      truncated = true;
      // Drain without storing to avoid blocking the child process.
      continue;
    }

    const remaining = limitBytes - used;
    if (value.length > remaining) {
      truncated = true;
      const slice = value.subarray(0, remaining);
      captured += decoder.decode(slice, { stream: true });
      used = limitBytes;
      continue; // keep draining
    }

    captured += decoder.decode(value, { stream: true });
    used += value.length;
  }

  captured += decoder.decode(); // flush decoder
  return { text: captured, truncated };
}

function cmdDisplay(args: readonly string[]): string {
  return args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ");
}

async function runCommand(
  args: readonly string[],
  cwd: string,
): Promise<{
  code: number;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}> {
  const [bin, ...rest] = args;
  const child = new Deno.Command(bin, {
    args: rest,
    cwd,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const [out, err, status] = await Promise.all([
    readTextLimited(child.stdout, MAX_CAPTURE_BYTES),
    readTextLimited(child.stderr, MAX_CAPTURE_BYTES),
    child.status,
  ]);

  return {
    code: status.code,
    stdout: out.text,
    stderr: err.text,
    stdoutTruncated: out.truncated,
    stderrTruncated: err.truncated,
  };
}

function makeFailurePayload(params: {
  failingCmd: readonly string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  toolName?: string;
  filePathHint?: string;
}): PostToolUseHookOutput {
  const headerParts = [
    `❌ ${cmdDisplay(params.failingCmd)} failed (exit code ${params.exitCode})`,
    params.toolName ? `Tool: ${params.toolName}` : undefined,
    params.filePathHint ? `File: ${params.filePathHint}` : undefined,
  ].filter((x): x is string => typeof x === "string");

  const truncNote = params.stdoutTruncated || params.stderrTruncated
    ? "\n\n(Note: output was truncated.)"
    : "";

  const stdoutBlock = params.stdout.trim().length > 0
    ? `\n\n--- stdout ---\n${params.stdout.trimEnd()}`
    : "";
  const stderrBlock = params.stderr.trim().length > 0
    ? `\n\n--- stderr ---\n${params.stderr.trimEnd()}`
    : "";

  const body = `${
    headerParts.join("\n")
  }${stdoutBlock}${stderrBlock}${truncNote}`.trimEnd();

  return {
    decision: "block",
    reason: body,
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: body,
    },
  };
}

function tryGetFilePathHint(input: HookInput): string | undefined {
  if (!isRecord(input.tool_input)) return undefined;
  // Matches Claude Code tool input examples (tool_input.file_path).
  const fp = asString(input.tool_input["file_path"]);
  return fp;
}

const stdinText = (await readStdinText()).trim();

let hookInput: HookInput = {};
if (stdinText.length > 0) {
  try {
    const parsed: unknown = JSON.parse(stdinText);
    if (isRecord(parsed)) hookInput = parsed as HookInput;
  } catch {
    // If hook input isn't valid JSON, don't crash; just run in current cwd.
    hookInput = {};
  }
}

const cwd = asString(hookInput.cwd) ?? Deno.cwd();
const toolName = asString(hookInput.tool_name);
const filePathHint = tryGetFilePathHint(hookInput);

const commands: readonly (readonly string[])[] = [
  ["deno", "fmt"],
  ["deno", "lint", "--fix"],
  ["deno", "check"],
];

for (const cmd of commands) {
  const res = await runCommand(cmd, cwd);
  if (res.code !== 0) {
    const payload = makeFailurePayload({
      failingCmd: cmd,
      exitCode: res.code,
      stdout: res.stdout,
      stderr: res.stderr,
      stdoutTruncated: res.stdoutTruncated,
      stderrTruncated: res.stderrTruncated,
      toolName,
      filePathHint,
    });

    // IMPORTANT: stdout must be ONLY the JSON object for Claude Code to parse it.
    console.log(JSON.stringify(payload));
    Deno.exit(0);
  }
}

// Success: no output (keeps Claude transcript clean), exit 0.
Deno.exit(0);
