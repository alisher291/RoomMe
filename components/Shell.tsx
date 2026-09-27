"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDemo } from "./DemoProvider";
import { emptyState } from "@/lib/storage";
export function Shell({ children }: { children: React.ReactNode }) {
  const { state, setState, ready, notice } = useDemo();
  const path = usePathname();
  const router = useRouter();
  const step =
    path === "/" || path === "/flats"
      ? 0
      : path === "/questionnaire"
        ? 1
        : path.startsWith("/candidates")
          ? 2
          : path.startsWith("/chat")
            ? 3
            : 4;
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brandmark">rm</span> RoommateMatch
          <span className="demo-tag">NYC EDITION</span>
        </Link>
        <button
          className="text-button"
          onClick={() => {
            if (
              confirm(
                "Reset this demo? This removes your answers, shortlist, chats, and selection from this browser.",
              )
            ) {
              setState(emptyState());
              router.push("/");
            }
          }}
        >
          Reset demo
        </button>
      </header>
      <div className="page">
        <nav aria-label="Your progress" className="steps">
          {[
            "Find a flat",
            "Your habits",
            "Meet roommates",
            "Talk it through",
            "Your choice",
          ].map((label, i) => (
            <span
              key={label}
              aria-current={step === i ? "step" : undefined}
              className={step === i ? "active" : step > i ? "done" : ""}
            >
              <b>{step > i ? "✓" : i + 1}</b>
              {label}
            </span>
          ))}
        </nav>
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {ready && state.flat && step > 0 && (
          <aside className="flat-summary">
            <span className="house-icon">&#8962;</span>
            <div>
              <small>
                YOUR SELECTED FLAT{state.flat.sample ? " · SAMPLE" : ""}
              </small>
              <strong>{state.flat.title}</strong>
            </div>
            <span>
              ${state.flat.monthlyRent.toLocaleString()}{" "}
              <small>/ month total</small>
            </span>
            <Link href="/flats">Change</Link>
          </aside>
        )}
        {ready ? (
          children
        ) : (
          <p className="loading" role="status">
            Restoring your progress…
          </p>
        )}
      </div>
      <footer>
        A place that fits. People who understand you.
        <span>RoommateMatch · Hackathon demo</span>
      </footer>
    </>
  );
}
export function Gate({
  answers = false,
  children,
}: {
  answers?: boolean;
  children: React.ReactNode;
}) {
  const { state } = useDemo();
  if (!state.flat)
    return (
      <section className="empty">
        <h1>Start with a place to call home.</h1>
        <p>Select a flat before meeting potential roommates.</p>
        <Link className="button" href="/">
          Find a flat
        </Link>
      </section>
    );
  if (answers && !state.submitted)
    return (
      <section className="empty">
        <h1>Let’s learn your living habits.</h1>
        <p>Complete your questionnaire to see compatible roommates.</p>
        <Link className="button" href="/questionnaire">
          Answer the questions
        </Link>
      </section>
    );
  return children;
}
