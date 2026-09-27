"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/DemoProvider";
import { Gate } from "@/components/Shell";
import { structured, openQuestions, answerLabel } from "@/lib/questions";
import { answerSchema } from "@/lib/validation";
export default function Questionnaire() {
  const { state, setState } = useDemo();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();
  const answers = state.draft;
  function update(kind: "structured" | "open", id: string, value: string) {
    setState((s) => ({
      ...s,
      draft: { ...s.draft, [kind]: { ...s.draft[kind], [id]: value } },
    }));
  }
  return (
    <Gate>
      <div className="section-heading">
        <div>
          <span className="eyebrow">STEP 02 · YOUR EVERYDAY</span>
          <h1>It’s the little things.</h1>
          <p>Share how you live, and what makes a shared home work for you.</p>
        </div>
        <span className="pill">{step + 1} of 4</span>
      </div>
      <div className="question-layout">
        <aside className="question-aside">
          <h2>Your habits, honestly.</h2>
          <p>
            There are no right answers. A good match starts with knowing what
            matters to you.
          </p>
          <ol>
            {[
              "Daily rhythm",
              "Sharing a home",
              "In your own words",
              "Review your answers",
            ].map((label, i) => (
              <li key={label} className={step === i ? "current" : ""}>
                {label}
              </li>
            ))}
          </ol>
          <p className="hint">
            Drafts save in this browser. Only the 10 structured answers
            determine your score.
          </p>
        </aside>
        <form
          className="card questionnaire"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (step < 3) {
              setStep((s) => s + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            const parsed = answerSchema.safeParse(answers);
            if (!parsed.success) {
              setError(parsed.error.issues[0].message);
              return;
            }
            setState((s) => ({ ...s, submitted: parsed.data }));
            router.push("/candidates");
          }}
        >
          {step < 2 ? (
            structured.slice(step * 5, step * 5 + 5).map((q, i) => (
              <fieldset key={q.id}>
                <legend>
                  <span className="question-number">{step * 5 + i + 1}</span>
                  {q.label}
                </legend>
                {q.kind === "time" ? (
                  <input
                    aria-label={q.label}
                    type="time"
                    required
                    value={answers.structured[q.id] ?? ""}
                    onChange={(e) => update("structured", q.id, e.target.value)}
                  />
                ) : (
                  <div className="options">
                    {q.options?.map((option, index) => (
                      <label className="option" key={option}>
                        <input
                          type="radio"
                          name={q.id}
                          required
                          value={index}
                          checked={answers.structured[q.id] === String(index)}
                          onChange={(e) =>
                            update("structured", q.id, e.target.value)
                          }
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            ))
          ) : step === 2 ? (
            openQuestions.map((q) => (
              <label className="open-question" key={q.id}>
                <strong>{q.label}</strong>
                <span>{q.description}</span>
                <textarea
                  required
                  minLength={10}
                  maxLength={1200}
                  rows={4}
                  value={answers.open[q.id] ?? ""}
                  onChange={(e) => update("open", q.id, e.target.value)}
                />
                <small>
                  {answers.open[q.id]?.length ?? 0}/1200 · At least 10
                  characters
                </small>
              </label>
            ))
          ) : (
            <>
              <h2>Does this sound like you?</h2>
              <p>
                Review before seeing your matches. You can edit these later.
              </p>
              {structured.map((q) => (
                <div className="review-row" key={q.id}>
                  <strong>{q.label}</strong>
                  <span>{answerLabel(q.id, answers.structured[q.id])}</span>
                </div>
              ))}
              {openQuestions.map((q) => (
                <div className="review-row" key={q.id}>
                  <strong>{q.label}</strong>
                  <p className="preserve">{answers.open[q.id]}</p>
                </div>
              ))}
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="form-footer">
            {step > 0 ? (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setStep((s) => s - 1);
                  setError("");
                }}
              >
                &#8592; Back
              </button>
            ) : (
              <span />
            )}
            <button className="button" type="submit">
              {step === 3 ? "See my matches" : "Next"} &#8594;
            </button>
          </div>
        </form>
      </div>
    </Gate>
  );
}
