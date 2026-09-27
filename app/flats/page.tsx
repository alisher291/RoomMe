"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDemo } from "@/components/DemoProvider";
import { FlatCard } from "@/components/FlatCard";
import type { Listing, SearchResult } from "@/lib/types";
import { listingSchema } from "@/lib/validation";
function Results() {
  const { state, setState } = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const search = params.get("search");
  const [criteria] = useState(state.criteria);
  const [flats, setFlats] = useState<Listing[]>([]);
  const [busy, setBusy] = useState(!!search);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("Starting your search…");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!search) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const started = Date.now();
    const cacheKey = `roommate-search:${search}`;
    const save = (value: unknown) => {
      sessionStorage.setItem(cacheKey, JSON.stringify(value));
    };
    const run = async (jobId?: string) => {
      try {
        if (Date.now() - started > 330000)
          throw Error(
            "The search took too long. Check your Apify run before starting another paid search.",
          );
        const response = await fetch(
          jobId
            ? `/api/listings/status/${encodeURIComponent(jobId)}`
            : "/api/listings/search",
          {
            method: jobId ? "GET" : "POST",
            headers: { "Content-Type": "application/json" },
            body: jobId ? undefined : JSON.stringify(criteria),
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(25000),
            ]),
            cache: "no-store",
          },
        );
        const data = (await response.json()) as SearchResult & {
          error?: string;
        };
        if (!response.ok)
          throw Error(data.error ?? "Search failed. Please try again.");
        if (stopped) return;
        if (data.status === "pending") {
          save(data);
          setProgress(data.progress ?? "Apify is retrieving listings…");
          timer = setTimeout(() => void run(data.jobId), 2500);
        } else if (data.status === "failed") throw Error(data.error);
        else {
          const listings = listingSchema.array().parse(data.listings);
          save({ status: "complete", listings });
          setFlats(listings);
          setBusy(false);
        }
      } catch (err) {
        if (stopped) return;
        const message =
          err instanceof Error && err.name === "TimeoutError"
            ? "Search request timed out. Check Apify before retrying."
            : err instanceof Error
              ? err.message
              : "Unable to retrieve listings.";
        setBusy(false);
        setError(message);
        try {
          save({ status: "failed", error: message });
        } catch {
          /* Keep the visible error if storage is blocked. */
        }
      }
    };
    // Start only after commit. Persist the start marker BEFORE POST to avoid a paid repeat on refresh.
    timer = setTimeout(() => {
      setBusy(true);
      setError("");
      setFlats([]);
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          if (data.status === "complete") {
            setFlats(listingSchema.array().parse(data.listings));
            setBusy(false);
            return;
          }
          if (data.status === "pending" && typeof data.jobId === "string") {
            void run(data.jobId);
            return;
          }
          throw Error(
            data.error ??
              "A previous search was interrupted while starting. Check Apify before requesting another paid search.",
          );
        }
        save({ status: "starting" });
        void run();
      } catch (err) {
        setBusy(false);
        setError(
          err instanceof Error
            ? err.message
            : "Session storage is required to prevent duplicate searches. Enable browser storage and try again.",
        );
      }
    }, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, retry, criteria]);
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">STEP 01 · FIND YOUR FLAT</span>
          <h1>A place to start.</h1>
          <p>
            {criteria.location} · ${criteria.minRent.toLocaleString()}–$
            {criteria.maxRent.toLocaleString()} total monthly rent
          </p>
        </div>
        <Link className="button secondary" href="/">
          Edit search
        </Link>
      </div>
      {criteria.sample && (
        <p className="notice">
          Sample mode · These flats are fictional and cannot be rented.
        </p>
      )}
      {busy ? (
        <section className="empty" role="status">
          <div className="spinner" />
          <h2>{progress}</h2>
          <p>
            You can leave this page to stop checking. The provider run may
            continue in Apify.
          </p>
        </section>
      ) : error ? (
        <section className="empty">
          <h2>We couldn’t complete that search.</h2>
          <p className="error" role="alert">
            {error}
          </p>
          <button
            className="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(`roommate-search:${search}`);
                setRetry((r) => r + 1);
              } catch {
                setError("Enable browser storage before retrying.");
              }
            }}
          >
            Retry with a fresh search
          </button>
        </section>
      ) : !search ? (
        <section className="empty">
          <h2>Ready for a fresh search?</h2>
          <Link className="button" href="/">
            Set your preferences
          </Link>
        </section>
      ) : flats.length === 0 ? (
        <section className="empty">
          <h2>No flats in this range.</h2>
          <p>Try another neighborhood or widen your budget.</p>
          <Link className="button" href="/">
            Adjust search
          </Link>
        </section>
      ) : (
        <>
          <p className="results-count">
            {flats.length} flats retrieved · Select one to continue
          </p>
          <div className="grid flats">
            {flats.map((flat) => (
              <FlatCard
                key={flat.id}
                flat={flat}
                onSelect={() => {
                  setState((s) => ({ ...s, flat }));
                  router.push("/questionnaire");
                }}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
export default function Flats() {
  return (
    <Suspense fallback={<p>Loading search…</p>}>
      <Results />
    </Suspense>
  );
}
