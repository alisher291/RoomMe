import { chatHandler } from "@/lib/gemini";
export const runtime = "nodejs";
export const POST = (request: Request) => chatHandler(request, "tenant");
