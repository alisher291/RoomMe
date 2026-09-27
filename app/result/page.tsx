"use client";
import Link from "next/link";
import { useDemo } from "@/components/DemoProvider";
import { Gate } from "@/components/Shell";
import { FlatCard } from "@/components/FlatCard";
import { candidateById } from "@/lib/candidates";
export default function Result() {
  const { state } = useDemo();
  const c = state.selected ? candidateById(state.selected) : null;
  return (
    <Gate answers>
      {c ? (
        <>
          <section className="result-heading">
            <span className="success-mark">&#10003;</span>
            <span className="eyebrow">YOUR DEMO ROOMMATE SELECTION</span>
            <h1>A promising next chapter.</h1>
            <p>
              You chose {c.name}. Here’s the flat and roommate you brought
              together.
            </p>
          </section>
          <div className="result-grid">
            <section className="card card-body selected-person">
              <span className="avatar large">{c.initials}</span>
              <span className="eyebrow">YOUR CHOSEN ROOMMATE</span>
              <h2>{c.name}</h2>
              <p>{c.intro}</p>
              <Link className="button secondary" href={`/chat/${c.id}`}>
                Return to conversation
              </Link>
            </section>
            {state.flat && <FlatCard flat={state.flat} />}
          </div>
          <section className="next-step">
            <h2>Your next step happens outside RoommateMatch.</h2>
            <p>
              This is a demo choice of a fictional roommate. It is not a
              booking, rental agreement, or acceptance by another person.
            </p>
            {state.flat?.originalUrl ? (
              <a
                className="button"
                href={state.flat.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open rental listing &#8594;
              </a>
            ) : (
              <p className="notice">
                Your selected flat is a sample. Search real listings to continue
                renting externally.
              </p>
            )}
            <Link className="text-link" href="/candidates">
              Review other roommates
            </Link>
          </section>
        </>
      ) : (
        <section className="empty">
          <h1>Your choice is still ahead.</h1>
          <p>Open a conversation and choose a roommate to complete the demo.</p>
          <Link className="button" href="/candidates">
            Explore roommates
          </Link>
        </section>
      )}
    </Gate>
  );
}
