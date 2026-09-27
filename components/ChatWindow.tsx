"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "./DemoProvider";
import { Gate } from "./Shell";
import { candidateById } from "@/lib/candidates";
import { compatibility } from "@/lib/matching";
import { putMessage } from "@/lib/storage";
import type { Message } from "@/lib/types";
export function ChatWindow({ id }: { id: string }) {
  const { state, setState } = useDemo();
  const router = useRouter();
  const c = candidateById(id);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"tenant" | "facilitator" | null>(null);
  const [error, setError] = useState("");
  const [retryRole, setRetryRole] = useState<"tenant" | "facilitator" | null>(
    null,
  );
  const locked = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const messages = state.chats[id] ?? [];
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, busy]);
  if (!c) return <h1>Candidate not found.</h1>;
  const match = state.submitted
    ? compatibility(state.submitted, c.answers)
    : null;
  async function generate(
    role: "tenant" | "facilitator",
    history: Message[],
    pending?: Message,
  ) {
    if (locked.current || !state.submitted) return;
    locked.current = true;
    setBusy(role);
    setError("");
    setRetryRole(null);
    controller.current = new AbortController();
    try {
      const response = await fetch(`/api/chat/${role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: id,
          answers: state.submitted,
          history: history.slice(-30),
        }),
        signal: AbortSignal.any([
          controller.current.signal,
          AbortSignal.timeout(45000),
        ]),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error ?? "Could not generate a reply.");
      if (typeof data.text !== "string" || !data.text.trim())
        throw Error("Gemini returned an empty reply. Try again.");
      const reply: Message = {
        id: crypto.randomUUID(),
        candidateId: id,
        speaker: role,
        text: data.text,
        timestamp: new Date().toISOString(),
        status: "sent",
      };
      setState((s) => {
        const next = pending
          ? {
              ...s,
              chats: {
                ...s.chats,
                [id]: (s.chats[id] ?? []).map((m) =>
                  m.id === pending.id ? { ...m, status: "sent" as const } : m,
                ),
              },
            }
          : s;
        return putMessage(next, reply);
      });
    } catch (err) {
      if (pending)
        setState((s) => ({
          ...s,
          chats: {
            ...s.chats,
            [id]: (s.chats[id] ?? []).map((m) =>
              m.id === pending.id ? { ...m, status: "failed" as const } : m,
            ),
          },
        }));
      setError(
        err instanceof Error && err.name === "TimeoutError"
          ? "Gemini took too long. Your message is saved; retry when ready."
          : err instanceof Error
            ? err.message
            : "Unable to generate a reply.",
      );
      setRetryRole(role);
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }
  const failed = messages.findLast(
    (m) => m.speaker === "user" && m.status === "failed",
  );
  return (
    <Gate answers>
      <div className="section-heading">
        <div>
          <span className="eyebrow">STEP 04 · TALK IT THROUGH</span>
          <h1>A conversation with {c.name.split(" ")[0]}.</h1>
          <p>Explore the routines, boundaries, and compromises that matter.</p>
        </div>
        <Link className="text-link" href={`/candidates/${id}`}>
          View full profile
        </Link>
      </div>
      <div className="chat-layout">
        <section className="card chat-panel">
          <div className="chat-header">
            <span className="avatar">{c.initials}</span>
            <div>
              <h2>{c.name}</h2>
              <small>Fictional tenant · Gemini simulation</small>
            </div>
            <span className="pill">{match?.total}% agreement</span>
          </div>
          <div
            className="messages"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <div className="chat-welcome">
                <span>&#10003;</span>
                <h3>Start with what matters to you.</h3>
                <p>
                  Ask about a habit you share, or one you see differently. The
                  AI facilitator can help you find a starting point.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <article className={`message ${m.speaker}`} key={m.id}>
                <small>
                  {m.speaker === "user"
                    ? "You"
                    : m.speaker === "tenant"
                      ? `${c.name} · Simulated tenant`
                      : "AI facilitator"}
                </small>
                <p>{m.text}</p>
                <time dateTime={m.timestamp}>
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {m.status === "failed" && (
                  <small className="delivery">
                    Reply failed · Your message is saved
                  </small>
                )}
              </article>
            ))}
            {busy && (
              <p className="typing" role="status">
                {busy === "tenant" ? c.name : "AI facilitator"} is thinking…
              </p>
            )}
            <div ref={bottom} />
          </div>
          {(error || failed) && !busy && (
            <div className="chat-error">
              <p role="alert">
                {error ||
                  "A previous reply was interrupted. Retry without sending your message again."}
              </p>
              <button
                className="text-button"
                onClick={() =>
                  void generate(
                    retryRole ?? "tenant",
                    messages,
                    (retryRole ?? "tenant") === "tenant" ? failed : undefined,
                  )
                }
              >
                Retry {retryRole === "facilitator" ? "facilitator" : "reply"}
              </button>
            </div>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim() || busy || failed) return;
              const m: Message = {
                id: crypto.randomUUID(),
                candidateId: id,
                speaker: "user",
                text: text.trim(),
                timestamp: new Date().toISOString(),
                status: "pending",
              };
              setState((s) => putMessage(s, m));
              setText("");
              void generate("tenant", [...messages, m], m);
            }}
          >
            <label className="sr-only" htmlFor="chat-input">
              Your message
            </label>
            <textarea
              id="chat-input"
              rows={2}
              maxLength={2000}
              required
              placeholder="What would you like to talk about?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!!busy || !!failed}
            />
            <button
              className="button"
              type="submit"
              disabled={!!busy || !!failed || !text.trim()}
            >
              Send
            </button>
          </form>
        </section>
        <aside>
          <section className="card card-body facilitator">
            <span className="eyebrow">A LITTLE HELP, WHEN YOU NEED IT</span>
            <h2>Find common ground.</h2>
            <p>
              The facilitator asks neutral questions and suggests ways to work
              through differences.
            </p>
            <button
              className="button secondary wide"
              disabled={!!busy || !!failed}
              onClick={() => void generate("facilitator", messages)}
            >
              Ask AI facilitator
            </button>
            <p className="hint">
              One response per click. It never changes your compatibility score.
            </p>
          </section>
          <section className="card card-body">
            <h3>Worth exploring</h3>
            {match?.differences.length === 0 && (
              <p>
                Your structured habits agree. Ask how those preferences work in
                everyday situations.
              </p>
            )}
            {match?.differences.slice(0, 2).map((d) => (
              <p key={d.id}>{d.label}</p>
            ))}
            <p className="hint">
              Your latest submitted answers are used for future replies.
              Previous messages stay as written.
            </p>
          </section>
          <section className="choice-box">
            <h3>Feel like a good fit?</h3>
            <p>Save your choice for this demo.</p>
            <button
              className="button wide"
              disabled={!!busy}
              onClick={() => {
                setState((s) => ({ ...s, selected: id }));
                router.push("/result");
              }}
            >
              Choose {c.name.split(" ")[0]} &#8594;
            </button>
          </section>
        </aside>
      </div>
    </Gate>
  );
}
