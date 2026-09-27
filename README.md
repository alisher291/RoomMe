# RoommateMatch

A local hackathon MVP: choose a NYC flat, answer questions, compare 15 fictional roommates, discuss differences with Gemini, and save a demo choice.

## Start on Windows

Node.js LTS was installed during setup. **Restart the VS Code terminal** if `node` or `npm` is not recognized.

From this folder in PowerShell:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Only copy the environment file if `.env.local` does not already exist. Open http://localhost:3000. `npm.cmd` avoids PowerShell script execution-policy issues.

In VS Code, open `.env.local` and enter keys locally:

```dotenv
GEMINI_API_KEY=your_private_gemini_key
GEMINI_MODEL=gemini-3.8-flash
STREETEASY_SCRAPER_API_KEY=your_private_apify_api_token
```

Get Gemini credentials from https://aistudio.google.com/apikey and an Apify API token from https://console.apify.com/settings/integrations. Never paste keys into chat, browser localStorage, or a `NEXT_PUBLIC_` variable. `.env.local` is ignored by Git. Restart the server after editing it.

No database, account system, Python service, or Docker is needed.

## Use the demo

1. Enter a NYC borough/neighborhood and **total monthly flat rent** between $500 and $15,000. Click Search once.
2. Select a retrieved flat. To explore without Apify credentials, explicitly check **Use clearly labeled sample flats** before searching. Sample flats have no rental links.
3. Complete 10 structured and 6 written questions, then review and submit. Drafts save after each edit.
4. Compare all 15 profiles, inspect the per-question breakdown and original written answers, and shortlist any number.
5. Open a simulated chat. Each sent message triggers one tenant reply. **Ask AI facilitator** triggers one separate facilitator reply. There is no AI-to-AI loop.
6. Choose a roommate and review the flat alongside that fictional person. Open the original listing to continue externally.

The selection is not a booking or another person's acceptance. Renting is outside this app. Missing Gemini credentials produce a configuration error; no canned response is presented as Gemini output.

Use **Reset demo** in the header and confirm to clear local progress. Data stays in this browser; it is not shared across devices. Avoid using separate tabs to edit the same demo concurrently.

## Apify integration

Provider: [`memo23/apify-streeteasy-cheerio`](https://apify.com/memo23/apify-streeteasy-cheerio). API calls use the server-only token above. The Actor may require an active rental subscription in your Apify account.

- `POST /api/listings/search` starts a fresh asynchronous Actor run. The server constructs a StreetEasy rental search URL from a neighborhood slug and price range. Examples: Brooklyn, Astoria, Upper West Side. It never fetches a user-supplied URL.
- Input: `startUrls`, `monitoringMode:false`, `flattenDatasetItems:true`, `enrichEmails:false`, up to 15 items, concurrency 10, and 3 retries. No address filter is added to general apartment searches.
- The run has a 300-second provider timeout. The browser polls our status route every 2.5 seconds, stopping after completion, failure, five and a half minutes, or navigation away. Polling never starts another Actor run.
- The job token is authenticated and encrypted using a key derived from the API credential. It expires after 15 minutes. No database or job registry is needed.
- Refresh resumes polling or restores results from sessionStorage. An interrupted start is flagged for manual retry, avoiding automatic paid resubmission. A retry deliberately starts a new search; check the Apify console if the previous start timed out.
- The adapter maps documented rental search fields (`price`, `street`, `unit`, `areaName`, `bedroomCount`, `fullBathroomCount`, `halfBathroomCount`, `livingAreaSize`, `urlPath`). It preserves absolute source URLs or resolves source-supplied relative paths against StreetEasy. Missing images are shown as placeholders; photo keys are not invented into image URLs.
- Unsupported result shapes produce an explicit error. A live 15-listing run was verified successfully. The adapter also uses source-supplied image URLs in the flattened `images` field. Adapt `lib/scraper/normalize.ts` if the provider changes its schema.
- Price is the listed monthly rent, not net-effective promotional rent. Results are filtered to the requested range. Retrieval time is shown; availability is not guaranteed.
- `ScraperProvider` also supports immediate results, demonstrated by the explicit sample adapter.

The backend is intended for a local hackathon demo. Do not expose a credential-backed instance publicly without adding appropriate abuse controls.

### Apify MCP in Codex

The exact requested server was added globally and OAuth login succeeded:

```text
https://mcp.apify.com/?tools=actors%2Cdocs%2Cmemo23%2Fapify-streeteasy-cheerio
```

Reload VS Code (`Ctrl+Shift+P` → **Developer: Reload Window**) so a new Codex session can discover the tools. The running build conversation could not dynamically load the new tools. The requested Actor run and dataset summary were therefore not performed.

Apify's MCP documentation says rental Actors are excluded, and this Actor is listed as a monthly rental. If it does not appear after reload, check this restriction and your Actor subscription. The app uses the REST API independently; Codex's OAuth login does not populate `.env.local`. The exact URL was kept unchanged, so no additional storage-tool category was silently added.

## Matching

Definitions live in `lib/questions.ts`; canonical profiles in `data/candidates.json`. The implementation follows the final questionnaire specification in the brief: concrete bedtime/wake times, ordered work/noise/cleaning/guest/social scales, binary smoking and pets, and six written questions.

`round(100 * sum(questionAgreement) / 10)`

- Ordered scales: `1 - abs(indexA - indexB)/(numberOfOptions - 1)`.
- Binary preferences: 1 for agreement, 0 otherwise.
- Time: shortest circular distance across a 24-hour clock, normalized over **12 hours**. Agreement is `1 - distanceMinutes/720`. Thus 23:30 and 00:30 are one hour apart and score 91.67% for that question.
- Stable ties use candidate ID. All 15 profiles remain eligible.
- Written answers and messages never affect the score. Editing and resubmitting structured answers recalculates it.

This is agreement on preferences, not a scientifically validated prediction.

## Gemini roles

`lib/gemini.ts` calls the documented Gemini `generateContent` REST API with a 35-second timeout and configurable model. Both routes load the canonical candidate on the server, validate submitted questionnaire/history, and send at most 30 recent messages. Each message is labeled with its speaker.

- `/api/chat/tenant`: speaks only as the fictional candidate and preserves their stated boundaries.
- `/api/chat/facilitator`: identifies grounded differences, asks neutral questions, and explores compromises without asserting unsupported agreements.

Both system instructions treat written answers/history as untrusted data. Responses render as React text, never HTML. A failed tenant reply keeps the human message with a retry action. Updating answers affects future requests without rewriting existing conversations.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Browser tests use locally installed Google Chrome, with desktop and iPhone-sized viewports. They run a local production server, so build first and keep port 3000 free. The browser test server explicitly disables API credentials so tests cannot start paid scrapes or generations. Browser tests mock successful AI responses and do not verify Gemini's live service. Unit tests mock Apify and Gemini HTTP calls and never start paid scrapes.

Manual check: use sample mode, complete all questions, inspect 15 results, save multiple profiles, refresh, check chat retry with missing credentials, choose a roommate, and confirm the same flat appears on the result page. After entering credentials, repeat with live scraping and both Gemini buttons.

## Documentation consulted

- [Next.js App Router installation](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [Gemini Generate Content API](https://ai.google.dev/gemini-api/docs/generate-content/text-generation)
- [Apify API workflow](https://docs.apify.com/api/v2/getting-started)
- [Actor inputs and output schema](https://apify.com/memo23/apify-streeteasy-cheerio)
- [Apify MCP](https://docs.apify.com/integrations/mcp)
- [Codex MCP setup](https://developers.openai.com/codex/mcp)

### Verified during implementation

TypeScript, ESLint, 9 focused tests, and the production build passed. The earlier full browser suite passed 8 tests across desktop/mobile viewports. Next.js logs an internal NoFallbackError during the unknown-route test, but returns HTTP 404 correctly.

Live tenant and facilitator responses were verified through the app; some Gemini requests required retry. After the Apify token and Actor subscription were configured, a live Brooklyn search ($2,000-$4,500) completed successfully and returned 15 normalized listings with images and original source links. Searches now request 15 flats with a five-minute Actor timeout after the original 100-item search exceeded three minutes.
