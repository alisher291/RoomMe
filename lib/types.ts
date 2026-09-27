export type Answers = {
  structured: Record<string, string>;
  open: Record<string, string>;
};
export type Candidate = {
  id: string;
  name: string;
  initials: string;
  intro: string;
  answers: Answers;
  boundaries: string[];
};
export type Listing = {
  id: string;
  sourceListingId?: string;
  title: string;
  neighborhood?: string;
  address?: string;
  monthlyRent: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  imageUrls: string[];
  originalUrl?: string;
  retrievedAt: string;
  sample: boolean;
};
export type SearchCriteria = {
  location: string;
  minRent: number;
  maxRent: number;
  sample: boolean;
};
export type Message = {
  id: string;
  candidateId: string;
  speaker: "user" | "tenant" | "facilitator";
  text: string;
  timestamp: string;
  status: "pending" | "sent" | "failed";
};
export type DemoState = {
  version: 1;
  criteria: SearchCriteria;
  flat: Listing | null;
  draft: Answers;
  submitted: Answers | null;
  shortlist: string[];
  chats: Record<string, Message[]>;
  selected: string | null;
};
export type SearchResult =
  | { status: "complete"; listings: Listing[] }
  | { status: "pending"; jobId: string; progress?: string }
  | { status: "failed"; error: string };
