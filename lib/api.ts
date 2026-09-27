export class ApiError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get("content-length")) > 100000)
    throw new ApiError("Request is too large.", 413);
  const text = await request.text();
  if (text.length > 100000) throw new ApiError("Request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("Invalid JSON request.", 400);
  }
}
export function errorResponse(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "The service could not complete the request. Please try again.",
    },
    {
      status: error instanceof ApiError ? error.status : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ApiError("Request origin is not allowed.", 403);
}
