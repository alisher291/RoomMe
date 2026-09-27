import raw from "@/data/candidates.json";
import type { Candidate } from "./types";
export const candidates: Candidate[] = raw;
export const candidateById = (id: string) =>
  candidates.find((c) => c.id === id);
