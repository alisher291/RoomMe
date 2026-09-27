import type { Answers, Candidate } from "./types";
import { structured } from "./questions";
// Circular distance is at most 12 hours. Agreement falls linearly from 1 to 0 over 12 hours.
export function timeAgreement(a: string, b: string) {
  const minutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const d = Math.abs(minutes(a) - minutes(b));
  return 1 - Math.min(d, 1440 - d) / 720;
}
export function compatibility(a: Answers, b: Answers) {
  const breakdown = structured.map((q) => {
    const av = a.structured[q.id],
      bv = b.structured[q.id];
    const score =
      q.kind === "time"
        ? timeAgreement(av, bv)
        : q.kind === "binary"
          ? Number(av === bv)
          : 1 -
            Math.abs(Number(av) - Number(bv)) / ((q.options?.length ?? 2) - 1);
    return { id: q.id, label: q.label, score };
  });
  return {
    total: Math.round(
      (100 * breakdown.reduce((sum, q) => sum + q.score, 0)) / 10,
    ),
    breakdown,
    similarities: [...breakdown]
      .filter((q) => q.score >= 0.75)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    differences: [...breakdown]
      .filter((q) => q.score < 1)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3),
  };
}
export function rankCandidates(answers: Answers, candidates: Candidate[]) {
  return candidates
    .map((candidate) => ({
      candidate,
      ...compatibility(answers, candidate.answers),
    }))
    .sort(
      (a, b) =>
        b.total - a.total || a.candidate.id.localeCompare(b.candidate.id),
    );
}
