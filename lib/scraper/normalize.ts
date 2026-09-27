import { z } from "zod";
import { listingSchema, safeUrl } from "../validation";
import { ApiError } from "../api";
import type { Listing } from "../types";
const rental = z
  .object({
    id: z.union([z.string(), z.number()]),
    areaName: z.string().nullish(),
    street: z.string().nullish(),
    unit: z.string().nullish(),
    price: z.number().positive(),
    bedroomCount: z.number().nonnegative().nullish(),
    fullBathroomCount: z.number().nonnegative().nullish(),
    halfBathroomCount: z.number().nonnegative().nullish(),
    livingAreaSize: z.number().nullish(),
    urlPath: z.string().optional(),
    url: z.string().optional(),
    status: z.string().optional(),
    photos: z
      .array(z.object({ url: z.string().optional() }).passthrough())
      .optional(),
    mediumImageURL: z.string().optional(),
    images: z.array(z.string()).nullish(),
  })
  .passthrough();
// Map documented rental search fields. Keep URLs from source; never synthesize a listing ID URL.
export function normalizeListings(
  raw: unknown,
  retrievedAt = new Date().toISOString(),
): Listing[] {
  if (!Array.isArray(raw))
    throw new ApiError("Apify returned an unexpected dataset format.");
  const result: Listing[] = [];
  let invalid = 0;
  for (const item of raw) {
    const obj =
      item && typeof item === "object" && "node" in item ? item.node : item;
    const parsed = rental.safeParse(obj);
    if (!parsed.success) {
      invalid++;
      continue;
    }
    const r = parsed.data;
    if (r.status && r.status !== "ACTIVE") continue;
    const originalUrl =
      r.url ??
      (r.urlPath?.startsWith("/") && !r.urlPath.startsWith("//")
        ? `https://streeteasy.com${r.urlPath}`
        : undefined);
    if (!originalUrl || !safeUrl(originalUrl)) {
      invalid++;
      continue;
    }
    const address = r.street
      ? `${r.street}${r.unit ? ` ${r.unit.startsWith("#") ? r.unit : "#" + r.unit}` : ""}`
      : undefined;
    const images = [
      r.mediumImageURL,
      ...(r.images ?? []),
      ...(r.photos ?? []).map((p) => p.url),
    ].filter((v): v is string => typeof v === "string" && safeUrl(v));
    const listing = listingSchema.safeParse({
      id: String(r.id),
      sourceListingId: String(r.id),
      title: address ?? "Rental listing",
      address,
      neighborhood: r.areaName ?? undefined,
      monthlyRent: r.price,
      bedrooms: r.bedroomCount ?? undefined,
      bathrooms:
        r.fullBathroomCount == null
          ? undefined
          : r.fullBathroomCount + (r.halfBathroomCount ?? 0) * 0.5,
      squareFeet:
        r.livingAreaSize && r.livingAreaSize > 0 ? r.livingAreaSize : undefined,
      imageUrls: images.slice(0, 20),
      originalUrl,
      retrievedAt,
      sample: false,
    });
    if (listing.success) result.push(listing.data);
    else invalid++;
  }
  if (invalid)
    throw new ApiError(
      "Apify returned unsupported listing fields. Inspect the dataset and update the adapter; no sample results were substituted.",
    );
  return [...new Map(result.map((r) => [r.id, r])).values()];
}
