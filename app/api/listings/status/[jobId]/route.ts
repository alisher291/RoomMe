import { apifyProvider } from "@/lib/scraper/provider";
import { errorResponse } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    return Response.json(await apifyProvider.status((await params).jobId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
