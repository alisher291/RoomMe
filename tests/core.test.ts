import { test } from "node:test";
import assert from "node:assert/strict";
import { candidates } from "../lib/candidates";
import { compatibility, rankCandidates, timeAgreement } from "../lib/matching";
import { answerSchema, criteriaSchema, safeUrl } from "../lib/validation";
import {
  emptyState,
  putMessage,
  restoreState,
  toggleShortlist,
} from "../lib/storage";
import { normalizeListings } from "../lib/scraper/normalize";
import { apifyProvider } from "../lib/scraper/provider";
import { chatHandler } from "../lib/gemini";
import type { Message } from "../lib/types";
test("all 15 canonical profiles are complete and score 100 against themselves", () => {
  assert.equal(candidates.length, 15);
  assert.equal(new Set(candidates.map((c) => c.id)).size, 15);
  for (const c of candidates) {
    assert.ok(answerSchema.safeParse(c.answers).success);
    assert.equal(compatibility(c.answers, c.answers).total, 100);
  }
});
test("time agreement crosses midnight and normalizes over 12 hours", () => {
  assert.equal(timeAgreement("23:30", "00:30"), 11 / 12);
  assert.equal(timeAgreement("00:00", "12:00"), 0);
});
test("only structured answers affect score and all 15 sort stably", () => {
  const a = candidates[0].answers;
  const changed = {
    ...a,
    open: { ...a.open, evening: "Completely different written answer" },
  };
  assert.deepEqual(compatibility(a, a), compatibility(a, changed));
  const different = {
    ...a,
    structured: {
      ...a.structured,
      smoking: a.structured.smoking === "0" ? "1" : "0",
    },
  };
  assert.equal(compatibility(a, different).total, 90);
  const pool = candidates.map((c) => ({ ...c, answers: a }));
  assert.deepEqual(
    rankCandidates(a, pool).map((r) => r.candidate.id),
    pool.map((c) => c.id).sort(),
  );
  assert.equal(rankCandidates(a, candidates).length, 15);
});
test("shortlists and chats are isolated and retries replace message IDs", () => {
  let s = toggleShortlist(emptyState(), "maya");
  s = toggleShortlist(s, "leo");
  s = toggleShortlist(s, "maya");
  assert.deepEqual(s.shortlist, ["leo"]);
  const m: Message = {
    id: "1",
    candidateId: "maya",
    speaker: "user",
    text: "Hello there",
    timestamp: new Date().toISOString(),
    status: "failed",
  };
  s = putMessage(s, m);
  s = putMessage(s, { ...m, status: "sent" });
  s = putMessage(s, { ...m, id: "2", candidateId: "leo" });
  assert.equal(s.chats.maya.length, 1);
  assert.equal(s.chats.leo.length, 1);
  assert.equal(s.chats.maya[0].status, "sent");
});
test("progress round-trips, interrupted messages recover, and corrupt data resets", () => {
  const s = emptyState();
  s.flat = {
    id: "sample",
    title: "Sample",
    monthlyRent: 3000,
    imageUrls: [],
    retrievedAt: new Date().toISOString(),
    sample: true,
  };
  s.submitted = candidates[0].answers;
  s.draft = candidates[0].answers;
  s.selected = "maya";
  s.chats.maya = [
    {
      id: "1",
      candidateId: "maya",
      speaker: "user",
      text: "Hello there",
      timestamp: new Date().toISOString(),
      status: "pending",
    },
  ];
  const result = restoreState(JSON.stringify(s));
  assert.equal(result.state.selected, "maya");
  assert.deepEqual(result.state.flat, s.flat);
  assert.equal(result.state.chats.maya[0].status, "failed");
  assert.ok(restoreState("bad JSON").notice);
  assert.ok(restoreState(JSON.stringify({ ...s, version: 0 })).notice);
  assert.ok(restoreState(JSON.stringify({ ...s, selected: "unknown" })).notice);
});
test("listing normalizer preserves original URLs and omits absent fields", () => {
  const url = "https://streeteasy.com/building/example/2?source=test";
  const [listing] = normalizeListings([
    { id: "42", price: 3200, url, status: "ACTIVE", bedroomCount: 2 },
  ]);
  assert.equal(listing.originalUrl, url);
  assert.equal(listing.address, undefined);
  assert.equal(listing.bathrooms, undefined);
  assert.equal(listing.squareFeet, undefined);
  assert.deepEqual(listing.imageUrls, []);
  assert.equal(
    normalizeListings([
      {
        node: {
          id: "43",
          price: 3200,
          urlPath: "/rental/43",
          status: "ACTIVE",
        },
      },
    ])[0].originalUrl,
    "https://streeteasy.com/rental/43",
  );
  assert.throws(() => normalizeListings([{ unexpected: true }]));
  assert.equal(safeUrl("javascript:alert(1)"), false);
  assert.equal(
    criteriaSchema.safeParse({
      location: "Brooklyn",
      minRent: 499,
      maxRent: 15001,
      sample: false,
    }).success,
    false,
  );
});
test("Apify starts one run; polling never starts another; credentials and tampered jobs fail", async () => {
  const original = globalThis.fetch;
  const old = process.env.STREETEASY_SCRAPER_API_KEY;
  delete process.env.STREETEASY_SCRAPER_API_KEY;
  await assert.rejects(
    () =>
      apifyProvider.start({
        location: "Brooklyn",
        minRent: 2000,
        maxRent: 4000,
        sample: false,
      }),
    /not configured/,
  );
  process.env.STREETEASY_SCRAPER_API_KEY = "test-key";
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(`${init?.method} ${url}`);
    return Response.json(
      url.includes("datasets/")
        ? [{ id: "42", price: 3200, urlPath: "/rental/42", status: "ACTIVE" }]
        : {
            data: {
              id: "run123",
              status: init?.method === "POST" ? "RUNNING" : "SUCCEEDED",
              defaultDatasetId: "data123",
            },
          },
    );
  };
  try {
    const result = await apifyProvider.start({
      location: "Brooklyn",
      minRent: 2000,
      maxRent: 4000,
      sample: false,
    });
    assert.equal(result.status, "pending");
    if (result.status !== "pending") return;
    const complete = await apifyProvider.status(result.jobId);
    assert.equal(complete.status, "complete");
    assert.equal(calls.filter((c) => c.startsWith("POST")).length, 1);
    assert.equal(calls.length, 3);
    await assert.rejects(
      () => apifyProvider.status("tampered"),
      /invalid or expired/,
    );
  } finally {
    globalThis.fetch = original;
    if (old === undefined) delete process.env.STREETEASY_SCRAPER_API_KEY;
    else process.env.STREETEASY_SCRAPER_API_KEY = old;
  }
});
test("AI rejects invalid IDs, reports missing credentials, and keeps roles distinct", async () => {
  const original = globalThis.fetch;
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const body = {
    candidateId: "maya",
    answers: candidates[0].answers,
    history: [
      {
        id: "1",
        candidateId: "maya",
        speaker: "user",
        text: "What about guests?",
        timestamp: new Date().toISOString(),
        status: "sent",
      },
    ],
  };
  const req = (data: unknown) =>
    new Request("http://localhost/api/chat/tenant", {
      method: "POST",
      body: JSON.stringify(data),
    });
  try {
    assert.equal(
      (
        await chatHandler(
          req({ ...body, candidateId: "unknown", history: [] }),
          "facilitator",
        )
      ).status,
      404,
    );
    const missing = await chatHandler(req(body), "tenant");
    assert.equal(missing.status, 503);
    assert.match((await missing.json()).error, /GEMINI_API_KEY/);
    process.env.GEMINI_API_KEY = "test-key";
    const prompts: string[] = [];
    globalThis.fetch = async (_input, init) => {
      prompts.push(
        JSON.parse(String(init?.body)).systemInstruction.parts[0].text,
      );
      return Response.json({
        candidates: [{ content: { parts: [{ text: "A test reply" }] } }],
      });
    };
    assert.equal((await chatHandler(req(body), "tenant")).status, 200);
    assert.equal((await chatHandler(req(body), "facilitator")).status, 200);
    assert.match(prompts[0], /Speak only as/);
    assert.match(prompts[1], /neutral AI facilitator/);
    assert.notEqual(prompts[0], prompts[1]);
  } finally {
    globalThis.fetch = original;
    if (old === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = old;
  }
});

test("live flattened Apify fields retain images and do not duplicate unit markers", () => {
  const [listing] = normalizeListings([
    {
      id: "5089769",
      price: 2000,
      street: "1730 East 14th Street",
      unit: "#5M",
      urlPath: "/building/1730-east-14-street-brooklyn/5m",
      status: "ACTIVE",
      bedroomCount: 0,
      fullBathroomCount: 1,
      livingAreaSize: 0,
      images: ["https://photos.zillowstatic.com/fp/example-full.webp"],
    },
  ]);
  assert.equal(listing.title, "1730 East 14th Street #5M");
  assert.equal(listing.bedrooms, 0);
  assert.equal(listing.squareFeet, undefined);
  assert.equal(listing.imageUrls.length, 1);
});
