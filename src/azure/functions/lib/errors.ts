export type AppErrorCode =
  | "DEFINITION"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, opts?: {
    status?: number;
    details?: unknown;
    cause?: unknown;
  }) {
    super(message, { cause: opts?.cause });
    this.name = "AppError";
    this.code = code;
    this.status = opts?.status ?? defaultStatus(code);
    this.details = opts?.details;
  }
}

function defaultStatus(code: AppErrorCode): number {
  switch (code) {
    case "DEFINITION":
      return 500;
    case "BAD_REQUEST":
      return 400;
    case "NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json(
      {
        error: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      { status: err.status },
    );
  }

  const message = err instanceof Error ? err.message : String(err);
  return Response.json(
    { error: "INTERNAL", message },
    { status: 500 },
  );
}
