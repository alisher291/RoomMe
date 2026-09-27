import { z } from "zod";
import {
  answerSchema,
  criteriaSchema,
  listingSchema,
  messageSchema,
} from "./validation";
import { candidateById } from "./candidates";
import type { DemoState, Message } from "./types";
export const STORAGE_KEY = "roommate-match.v1";
export const emptyState = (): DemoState => ({
  version: 1,
  criteria: {
    location: "Brooklyn",
    minRent: 2000,
    maxRent: 4500,
    sample: false,
  },
  flat: null,
  draft: { structured: {}, open: {} },
  submitted: null,
  shortlist: [],
  chats: {},
  selected: null,
});
const id = z.string().refine((v) => !!candidateById(v));
const schema = z
  .object({
    version: z.literal(1),
    criteria: criteriaSchema,
    flat: listingSchema.nullable(),
    draft: z.object({
      structured: z.record(z.string(), z.string().max(100)),
      open: z.record(z.string(), z.string().max(1200)),
    }),
    submitted: answerSchema.nullable(),
    shortlist: z.array(id),
    chats: z.record(id, z.array(messageSchema)),
    selected: id.nullable(),
  })
  .refine((s) =>
    Object.entries(s.chats).every(([id, messages]) =>
      messages.every((m) => m.candidateId === id),
    ),
  );
export function restoreState(raw: string | null): {
  state: DemoState;
  notice: string;
} {
  if (!raw) return { state: emptyState(), notice: "" };
  try {
    const parsed = schema.parse(JSON.parse(raw));
    for (const messages of Object.values(parsed.chats))
      for (const m of messages) if (m.status === "pending") m.status = "failed";
    return { state: parsed, notice: "" };
  } catch {
    return {
      state: emptyState(),
      notice: "Saved progress could not be restored. A fresh demo is ready.",
    };
  }
}
export function putMessage(state: DemoState, message: Message): DemoState {
  const messages = state.chats[message.candidateId] ?? [];
  return {
    ...state,
    chats: {
      ...state.chats,
      [message.candidateId]: [
        ...messages.filter((m) => m.id !== message.id),
        message,
      ],
    },
  };
}
export function toggleShortlist(state: DemoState, id: string): DemoState {
  return {
    ...state,
    shortlist: state.shortlist.includes(id)
      ? state.shortlist.filter((v) => v !== id)
      : [...state.shortlist, id],
  };
}
