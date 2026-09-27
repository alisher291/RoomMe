import { criteriaSchema } from "@/lib/validation";
import { ApiError, errorResponse, jsonBody, sameOrigin } from "@/lib/api";
import { apifyProvider, sampleProvider } from "@/lib/scraper/provider";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const parsed = criteriaSchema.safeParse(await jsonBody(request));
    if (!parsed.success)
      throw new ApiError(
        "Enter a location and a total rent range between $500 and $15,000.",
        400,
      );
    return Response.json(
      await (parsed.data.sample ? sampleProvider : apifyProvider).start(
        parsed.data,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
