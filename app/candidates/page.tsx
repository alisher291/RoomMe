"use client";
import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/components/DemoProvider";
import { Gate } from "@/components/Shell";
import { candidates } from "@/lib/candidates";
import { rankCandidates } from "@/lib/matching";
import { answerLabel } from "@/lib/questions";
import { toggleShortlist } from "@/lib/storage";
export default function Candidates() {
  const { state, setState } = useDemo();
  const [saved, setSaved] = useState(false);
  const ranked = state.submitted
    ? rankCandidates(state.submitted, candidates)
    : [];
  return (
    <Gate answers>
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            STEP 03 · MEET YOUR POTENTIAL ROOMMATES
          </span>
          <h1>Different people. Common ground.</h1>
          <p>
            15 fictional people, ranked by agreement with your everyday habits.
          </p>
        </div>
        <Link className="text-link" href="/questionnaire">
          Edit my answers
        </Link>
      </div>
      <div className="list-toolbar">
        <div className="tabs">
          <button
            aria-pressed={!saved}
            className={!saved ? "selected" : ""}
            onClick={() => setSaved(false)}
          >
            All roommates <span>15</span>
          </button>
          <button
            aria-pressed={saved}
            className={saved ? "selected" : ""}
            onClick={() => setSaved(true)}
          >
            Shortlisted <span>{state.shortlist.length}</span>
          </button>
        </div>
        <span className="hint">Highest agreement first</span>
      </div>
      <p className="score-note">
        Scores compare 10 equally weighted answers. They are questionnaire
        agreement, not a prediction of successful cohabitation.
      </p>
      <div className="grid candidates">
        {ranked
          .filter(
            ({ candidate: c }) => !saved || state.shortlist.includes(c.id),
          )
          .map(({ candidate: c, total, similarities }, index) => (
            <article className="card candidate-card" key={c.id}>
              <div className="candidate-top">
                <span className={`avatar tone-${index % 4}`}>{c.initials}</span>
                <div className="score">
                  <strong>{total}%</strong>
                  <small>agreement</small>
                </div>
              </div>
              <h2>{c.name}</h2>
              <p className="bio">{c.intro}</p>
              <div className="similarities">
                <small>COMMON GROUND</small>
                {similarities.length ? (
                  similarities.slice(0, 3).map((q) => (
                    <span key={q.id}>
                      &#10003; {answerLabel(q.id, c.answers.structured[q.id])}
                      {q.id === "bedtime"
                        ? " bedtime"
                        : q.id === "wake"
                          ? " wake-up"
                          : ""}
                    </span>
                  ))
                ) : (
                  <p>
                    Several habits to talk through. Open the full breakdown.
                  </p>
                )}
              </div>
              <div className="actions">
                <Link className="button secondary" href={`/candidates/${c.id}`}>
                  View profile &#8594;
                </Link>
                <button
                  className={`save-button ${state.shortlist.includes(c.id) ? "saved" : ""}`}
                  aria-label={`${state.shortlist.includes(c.id) ? "Remove" : "Add"} ${c.name} ${state.shortlist.includes(c.id) ? "from" : "to"} shortlist`}
                  aria-pressed={state.shortlist.includes(c.id)}
                  onClick={() => setState((s) => toggleShortlist(s, c.id))}
                >
                  {state.shortlist.includes(c.id) ? "★" : "☆"}
                </button>
              </div>
            </article>
          ))}
      </div>
      {saved && state.shortlist.length === 0 && (
        <div className="empty">
          <h2>Your shortlist starts here.</h2>
          <p>
            Use the star on any profile to save someone you want to get to know.
          </p>
          <button className="button" onClick={() => setSaved(false)}>
            Explore roommates
          </button>
        </div>
      )}
    </Gate>
  );
}
