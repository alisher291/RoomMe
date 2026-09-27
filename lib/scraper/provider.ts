import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
import type { SearchCriteria, SearchResult } from "../types";
import { criteriaSchema } from "../validation";
import { ApiError } from "../api";
import { normalizeListings } from "./normalize";
export interface ScraperProvider {
  start(criteria: SearchCriteria): Promise<SearchResult>;
  status(jobId: string): Promise<SearchResult>;
}
function key() {
  const key = process.env.STREETEASY_SCRAPER_API_KEY;
  if (!key)
    throw new ApiError(
      "Apify is not configured. Put your Apify API token in STREETEASY_SCRAPER_API_KEY in .env.local, then restart the server.",
      503,
    );
  return key;
}
const jobSchema = z.object({
  runId: z.string().regex(/^[a-zA-Z0-9]+$/),
  criteria: criteriaSchema,
  expires: z.number(),
});
function seal(value: z.infer<typeof jobSchema>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    createHash("sha256").update(key()).digest(),
    iv,
  );
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
function unseal(token: string) {
  try {
    if (token.length > 2000) throw Error();
    const buffer = Buffer.from(token, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      createHash("sha256").update(key()).digest(),
      buffer.subarray(0, 12),
    );
    decipher.setAuthTag(buffer.subarray(12, 28));
    const value = jobSchema.parse(
      JSON.parse(
        Buffer.concat([
          decipher.update(buffer.subarray(28)),
          decipher.final(),
        ]).toString(),
      ),
    );
    if (value.expires < Date.now()) throw Error();
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Search session is invalid or expired. Start a new search.",
      400,
    );
  }
}
async function api(path: string, body?: unknown) {
  const token = key();
  let response: Response;
  try {
    response = await fetch(`https://api.apify.com/v2/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(18000),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Apify did not respond in time. Check your Apify runs before retrying a paid search.",
      504,
    );
  }
  if (!response.ok)
    throw new ApiError(
      [401, 403].includes(response.status)
        ? "Apify rejected the token or Actor access. Check your token and the Actor subscription in Apify."
        : response.status === 429
          ? "Apify rate limit reached. Wait before retrying."
          : "Apify could not complete the request. Check the run in your Apify console.",
      response.status === 429 ? 429 : 502,
    );
  try {
    return await response.json();
  } catch {
    throw new ApiError("Apify returned an unexpected response.");
  }
}
const runSchema = z.object({
  data: z.object({
    id: z.string().regex(/^[a-zA-Z0-9]+$/),
    status: z.string(),
    defaultDatasetId: z
      .string()
      .regex(/^[a-zA-Z0-9]+$/)
      .optional(),
    finishedAt: z.string().nullish(),
  }),
});
export function searchUrl(criteria: SearchCriteria) {
  const slug = criteria.location.toLowerCase().trim().replace(/\s+/g, "-");
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(slug))
    throw new ApiError(
      "Enter a NYC borough or neighborhood name, such as Brooklyn, Astoria, or Upper West Side.",
      400,
    );
  return `https://streeteasy.com/for-rent/${slug}/price:${criteria.minRent}-${criteria.maxRent}`;
}
export const apifyProvider: ScraperProvider = {
  async start(criteria) {
    const url = searchUrl(criteria);
    const response = runSchema.safeParse(
      await api("actors/memo23~apify-streeteasy-cheerio/runs?timeout=300", {
        startUrls: [{ url }],
        monitoringMode: false,
        flattenDatasetItems: true,
        enrichEmails: false,
        maxItems: 15,
        maxConcurrency: 10,
        minConcurrency: 1,
        maxRequestRetries: 3,
      }),
    );
    if (!response.success)
      throw new ApiError(
        "Apify returned an unexpected run response. Check your console before retrying.",
      );
    const jobId = seal({
      runId: response.data.data.id,
      criteria,
      expires: Date.now() + 15 * 60 * 1000,
    });
    return {
      status: "pending",
      jobId,
      progress: "Search started. Retrieving StreetEasy listings…",
    };
  },
  async status(jobId) {
    const job = unseal(jobId);
    const response = runSchema.safeParse(await api(`actor-runs/${job.runId}`));
    if (!response.success)
      throw new ApiError("Apify returned an unexpected run status.");
    const run = response.data.data;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(run.status))
      return {
        status: "failed",
        error:
          "The Apify scrape failed or timed out. Check Actor access and run details in the Apify console.",
      };
    if (run.status !== "SUCCEEDED")
      return {
        status: "pending",
        jobId,
        progress: "Apify is still retrieving listings…",
      };
    if (!run.defaultDatasetId)
      throw new ApiError("Apify completed without a results dataset.");
    const raw = await api(
      `datasets/${run.defaultDatasetId}/items?format=json&clean=true&limit=100`,
    );
    const listings = normalizeListings(
      raw,
      run.finishedAt ?? new Date().toISOString(),
    ).filter(
      (l) =>
        l.monthlyRent >= job.criteria.minRent &&
        l.monthlyRent <= job.criteria.maxRent,
    );
    return { status: "complete", listings };
  },
};
export const sampleProvider: ScraperProvider = {
  async start(criteria) {
    const now = new Date().toISOString();
    return {
      status: "complete",
      listings: [
        {
          id: "sample-1",
          title: "Sample · A sunny shared space",
          monthlyRent: 3200,
          bedrooms: 2,
          bathrooms: 1,
        },
        {
          id: "sample-2",
          title: "Sample · Room to make your own",
          monthlyRent: 4100,
          bedrooms: 3,
          bathrooms: 2,
        },
        {
          id: "sample-3",
          title: "Sample · A cozy neighborhood base",
          monthlyRent: 2600,
          bedrooms: 2,
          bathrooms: 1,
        },
      ]
        .filter(
          (f) =>
            f.monthlyRent >= criteria.minRent &&
            f.monthlyRent <= criteria.maxRent,
        )
        .map((f) => ({
          ...f,
          neighborhood: criteria.location,
          imageUrls: [],
          retrievedAt: now,
          sample: true,
        })),
    };
  },
  async status() {
    throw new ApiError("Sample searches complete immediately.", 400);
  },
};
