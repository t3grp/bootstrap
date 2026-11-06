import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "INVALID_REQUEST",
    public currentRevision?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound() {
  return new AppError(
    404,
    "This item is not available in this workspace.",
    "NOT_FOUND",
  );
}
export function conflict(revision: number) {
  return new AppError(
    409,
    "This item changed in another session. Keep your draft and load the latest version before saving again.",
    "REVISION_CONFLICT",
    revision,
  );
}
export function errorResponse(error: unknown) {
  const headers = {
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
  };
  if (error instanceof AppError)
    return Response.json(
      {
        error: error.message,
        code: error.code,
        ...(error.currentRevision === undefined
          ? {}
          : { currentRevision: error.currentRevision }),
      },
      { status: error.status, headers },
    );
  if (error instanceof ZodError)
    return Response.json(
      {
        error: error.issues
          .map(
            (issue) => `${issue.path.join(".") || "Request"}: ${issue.message}`,
          )
          .slice(0, 4)
          .join("; "),
        code: "VALIDATION_ERROR",
      },
      { status: 400, headers },
    );
  console.error(
    "Bootstrap request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return Response.json(
    {
      error:
        "The request could not be confirmed. Keep your draft and reload to check the latest saved state before retrying.",
      code: "INTERNAL_ERROR",
    },
    { status: 500, headers },
  );
}
