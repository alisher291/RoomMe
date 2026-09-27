"use client";
import Link from "next/link";
import { useDemo } from "./DemoProvider";
import { Gate } from "./Shell";
import { candidateById } from "@/lib/candidates";
import { compatibility } from "@/lib/matching";
import { structured, openQuestions, answerLabel } from "@/lib/questions";
import { toggleShortlist } from "@/lib/storage";
export function CandidateDetail({ id }: { id: string }) {
  const { state, setState } = useDemo();
  const c = candidateById(id);
  if (!c) return <h1>Candidate not found.</h1>;
  const match = state.submitted
    ? compatibility(state.submitted, c.answers)
    : null;
  return (
    <Gate answers>
      <Link className="text-link" href="/candidates">
        &#8592; All roommates
      </Link>
      <section className="profile-heading">
        <span className="avatar large">{c.initials}</span>
        <div>
          <span className="eyebrow">FICTIONAL ROOMMATE</span>
          <h1>{c.name}</h1>
          <p>{c.intro}</p>
        </div>
        <div className="score big">
          <strong>{match?.total}%</strong>
          <small>questionnaire agreement</small>
        </div>
      </section>
      <div className="actions profile-actions">
        <Link className="button" href={`/chat/${c.id}`}>
          Start simulated chat &#8594;
        </Link>
        <button
          className="button secondary"
          aria-pressed={state.shortlist.includes(c.id)}
          onClick={() => setState((s) => toggleShortlist(s, c.id))}
        >
          {state.shortlist.includes(c.id)
            ? "Saved to shortlist"
            : "Add to shortlist"}
        </button>
      </div>
      <div className="profile-grid">
        <section className="card card-body">
          <h2>How your habits compare</h2>
          <p className="hint">
            Each answer contributes equally. Open responses and chat never
            change this percentage.
          </p>
          <div className="comparison-head">
            <span>Living habit</span>
            <span>You</span>
            <span>{c.name.split(" ")[0]}</span>
          </div>
          {structured.map((q) => {
            const score =
              match?.breakdown.find((b) => b.id === q.id)?.score ?? 0;
            return (
              <div className="comparison" key={q.id}>
                <div>
                  <strong>{q.label}</strong>
                  <div className="meter">
                    <span style={{ width: `${score * 100}%` }} />
                  </div>
                  <small>{Math.round(score * 100)}% agreement</small>
                </div>
                <span>
                  {answerLabel(q.id, state.submitted?.structured[q.id] ?? "")}
                </span>
                <span>{answerLabel(q.id, c.answers.structured[q.id])}</span>
              </div>
            );
          })}
        </section>
        <aside className="card card-body discussion">
          <span className="eyebrow">MAKE ROOM FOR A CONVERSATION</span>
          <h2>Worth talking about</h2>
          {match?.differences.length ? (
            match.differences.map((d) => <p key={d.id}>{d.label}</p>)
          ) : (
            <p>
              Your structured answers agree. Explore expectations in more detail
              together.
            </p>
          )}
          <Link className="text-link" href={`/chat/${c.id}`}>
            Talk it through &#8594;
          </Link>
        </aside>
      </div>
      <section className="open-answers">
        <span className="eyebrow">IN THEIR OWN WORDS</span>
        <h2>Beyond the percentage.</h2>
        <div className="grid answers">
          {openQuestions.map((q) => (
            <article className="card card-body" key={q.id}>
              <h3>{q.label}</h3>
              <p className="hint">{q.description}</p>
              <p className="preserve">{c.answers.open[q.id]}</p>
            </article>
          ))}
        </div>
      </section>
    </Gate>
  );
}
