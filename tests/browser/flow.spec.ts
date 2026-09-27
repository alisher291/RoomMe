import { test, expect } from "@playwright/test";
import { candidates } from "../../lib/candidates";
import { emptyState, STORAGE_KEY } from "../../lib/storage";
const readyState = () => ({
  ...emptyState(),
  flat: {
    id: "sample",
    title: "Sample test flat",
    monthlyRent: 3200,
    imageUrls: [],
    retrievedAt: new Date().toISOString(),
    sample: true,
  },
  draft: candidates[0].answers,
  submitted: candidates[0].answers,
});
test("complete sample flow, refresh, shortlist, failed chat retry, and final selection", async ({
  page,
}, info) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  let searches = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/listings/search")) searches++;
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Where feels like home?" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-home.png`,
    fullPage: true,
  });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Search flats/ }).click();
  await expect(
    page.getByRole("button", { name: /Choose this flat/ }),
  ).toHaveCount(3);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Choose this flat/ }),
  ).toHaveCount(3);
  expect(searches).toBe(1);
  await page
    .getByRole("button", { name: /Choose this flat/ })
    .first()
    .click();
  await page.locator('input[type="time"]').nth(0).fill("22:30");
  await page.locator('input[type="time"]').nth(1).fill("06:30");
  for (const id of ["work", "noise", "clean"])
    await page.locator(`input[name="${id}"]`).first().check();
  await page.getByRole("button", { name: /Next/ }).click();
  for (const id of ["visitors", "overnight", "smoking", "pets", "relationship"])
    await page.locator(`input[name="${id}"]`).first().check();
  await page.getByRole("button", { name: /Next/ }).click();
  for (const field of await page.locator("textarea").all())
    await field.fill(
      "I prefer a quiet, clean home and an honest conversation about plans.",
    );
  await page.reload();
  await expect(page.locator('input[type="time"]').first()).toHaveValue("22:30");
  await page.getByRole("button", { name: /Next/ }).click();
  await page.getByRole("button", { name: /Next/ }).click();
  await expect(page.locator("textarea").first()).toHaveValue(/quiet/);
  await page.getByRole("button", { name: /Next/ }).click();
  await page.getByRole("button", { name: /See my matches/ }).click();
  await expect(page.locator(".candidate-card")).toHaveCount(15);
  await page.screenshot({
    path: `test-results/${info.project.name}-candidates.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /Add .* to shortlist/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Shortlisted/ }).click();
  await expect(page.locator(".candidate-card")).toHaveCount(1);
  await page.getByRole("link", { name: /View profile/ }).click();
  await expect(page.locator(".comparison")).toHaveCount(10);
  await expect(page.locator(".open-answers article")).toHaveCount(6);
  await page.getByRole("link", { name: /Start simulated chat/ }).click();
  let replies = 0;
  await page.route("**/api/chat/tenant", async (route) => {
    replies++;
    await route.fulfill({
      status: replies === 1 ? 503 : 200,
      json:
        replies === 1
          ? { error: "Test generation failure" }
          : {
              text: '<img src=x onerror="alert(1)"> I prefer notice for guests.',
            },
    });
  });
  await page
    .getByLabel("Your message")
    .fill("How much notice would you like before guests visit?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".chat-error [role=alert]")).toContainText(
    "Test generation failure",
  );
  await page.getByRole("button", { name: "Retry reply" }).click();
  await expect(page.locator(".message.tenant")).toHaveCount(1);
  await expect(page.locator(".message.user")).toHaveCount(1);
  await expect(page.locator(".message.tenant img")).toHaveCount(0);
  await expect(page.locator(".message.tenant")).toContainText("<img");
  await page.route("**/api/chat/facilitator", (route) =>
    route.fulfill({
      json: {
        text: "Could you agree on a day of notice for overnight visitors?",
      },
    }),
  );
  await page.getByRole("button", { name: /Ask AI facilitator/ }).click();
  await expect(page.locator(".message.facilitator")).toHaveCount(1);
  expect(replies).toBe(2);
  await page.screenshot({
    path: `test-results/${info.project.name}-chat.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Choose / }).click();
  await expect(
    page.getByText("YOUR DEMO ROOMMATE SELECTION", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".result-grid")).toContainText(
    "A sunny shared space",
  );
  await page.reload();
  await expect(page.locator(".result-grid")).toContainText(
    "A sunny shared space",
  );
  expect(failures).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("candidate chats stay separate and corruption recovers", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: STORAGE_KEY, state: readyState() },
  );
  await page.goto("/chat/maya");
  await page.route("**/api/chat/tenant", (route) =>
    route.fulfill({ json: { text: "A response for Maya only." } }),
  );
  await page
    .getByLabel("Your message")
    .fill("Hello Maya, tell me about your evenings.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".message.tenant")).toHaveCount(1);
  await page.goto("/chat/leo");
  await expect(page.getByText("Start with what matters to you.")).toBeVisible();
  await expect(page.locator(".message")).toHaveCount(0);
  await page.goto("/chat/maya");
  await expect(page.locator(".message")).toHaveCount(2);
  await page.evaluate(
    (key) => localStorage.setItem(key, "broken"),
    STORAGE_KEY,
  );
  await page.reload();
  await expect(
    page.getByText(
      "Saved progress could not be restored. A fresh demo is ready.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find a flat", exact: true }),
  ).toBeVisible();
});
test("invalid candidate route is rejected and missing credentials are clear", async ({
  page,
  request,
}) => {
  const response = await page.goto("/candidates/not-a-candidate");
  expect(response?.status()).toBe(404);
  const bad = await request.post("/api/chat/facilitator", {
    data: {
      candidateId: "invalid",
      answers: candidates[0].answers,
      history: [],
    },
  });
  expect(bad.status()).toBe(404);
  const missing = await request.post("/api/chat/facilitator", {
    data: { candidateId: "maya", answers: candidates[0].answers, history: [] },
  });
  expect(missing.status()).toBe(503);
  expect((await missing.json()).error).toContain("GEMINI_API_KEY");
  const search = await request.post("/api/listings/search", {
    data: { location: "Brooklyn", minRent: 2000, maxRent: 4000, sample: false },
  });
  expect(search.status()).toBe(503);
  expect((await search.json()).error).toContain("STREETEASY_SCRAPER_API_KEY");
});

test("retry results survive refresh and polling does not repeat paid starts", async ({
  page,
}) => {
  let starts = 0;
  let polls = 0;
  await page.route("**/api/listings/search", (route) => {
    starts++;
    return route.fulfill({
      status: starts === 1 ? 502 : 200,
      json:
        starts === 1
          ? { error: "Test scrape failure" }
          : {
              status: "pending",
              jobId: "test-job",
              progress: "Retrieving test listings",
            },
    });
  });
  await page.route("**/api/listings/status/*", (route) => {
    polls++;
    return route.fulfill({
      json: {
        status: "complete",
        listings: [
          {
            id: "live-test",
            title: "Provider test listing",
            monthlyRent: 3200,
            imageUrls: [],
            originalUrl: "https://streeteasy.com/rental/12345?source=original",
            retrievedAt: new Date().toISOString(),
            sample: false,
          },
        ],
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Search flats/ }).click();
  await expect(page.locator("p.error")).toContainText("Test scrape failure");
  await page.getByRole("button", { name: "Retry with a fresh search" }).click();
  await expect(
    page.getByRole("button", { name: /Choose this flat/ }),
  ).toBeVisible();
  expect(starts).toBe(2);
  expect(polls).toBe(1);
  await expect(
    page.getByRole("link", { name: /Original listing/ }),
  ).toHaveAttribute(
    "href",
    "https://streeteasy.com/rental/12345?source=original",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Choose this flat/ }),
  ).toBeVisible();
  expect(starts).toBe(2);
  expect(polls).toBe(1);
});
