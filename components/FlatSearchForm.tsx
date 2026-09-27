"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "./DemoProvider";
import { criteriaSchema } from "@/lib/validation";
export function FlatSearchForm() {
  const { state, setState } = useDemo();
  const [criteria, setCriteria] = useState(state.criteria);
  const [error, setError] = useState("");
  const router = useRouter();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="search-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting.current) return;
        const parsed = criteriaSchema.safeParse(criteria);
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        submitting.current = true;
        setBusy(true);
        setState((s) => ({ ...s, criteria: parsed.data }));
        router.push(`/flats?search=${crypto.randomUUID()}`);
      }}
    >
      <label className="location">
        Where in NYC?
        <input
          required
          minLength={2}
          maxLength={100}
          placeholder="e.g. Brooklyn or Astoria"
          value={criteria.location}
          onChange={(e) =>
            setCriteria({ ...criteria, location: e.target.value })
          }
        />
      </label>
      <div className="price-fields">
        <label>
          Minimum rent ($)
          <input
            type="number"
            required
            min={500}
            max={15000}
            value={criteria.minRent}
            onChange={(e) =>
              setCriteria({ ...criteria, minRent: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Maximum rent ($)
          <input
            type="number"
            required
            min={500}
            max={15000}
            value={criteria.maxRent}
            onChange={(e) =>
              setCriteria({ ...criteria, maxRent: Number(e.target.value) })
            }
          />
        </label>
      </div>
      <p className="hint">
        Total monthly flat rent, before splitting. $500–$15,000.
      </p>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={criteria.sample}
          onChange={(e) =>
            setCriteria({ ...criteria, sample: e.target.checked })
          }
        />{" "}
        Use clearly labeled sample flats to explore the demo
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" className="button wide" disabled={busy}>
        Search flats <span>&#8594;</span>
      </button>
      <p className="hint">
        {criteria.sample
          ? "Sample mode uses fictional flats. No scrape is requested."
          : "Each search starts a fresh StreetEasy scrape via Apify."}
      </p>
    </form>
  );
}
