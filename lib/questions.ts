export type Question = {
  id: string;
  label: string;
  kind: "time" | "scale" | "binary";
  options?: string[];
};
// Ordered options run from lowest to highest frequency/intensity. Equal weights.
export const structured: Question[] = [
  {
    id: "bedtime",
    label: "What time do you usually go to sleep on weekdays?",
    kind: "time",
  },
  {
    id: "wake",
    label: "What time do you usually wake up on weekdays?",
    kind: "time",
  },
  {
    id: "work",
    label: "Where do you usually work or study?",
    kind: "scale",
    options: ["Mostly outside the home", "Hybrid", "Mostly at home"],
  },
  {
    id: "noise",
    label: "What noise level feels comfortable at home?",
    kind: "scale",
    options: [
      "Near silence",
      "Mostly quiet, occasional calls",
      "Music and conversation are fine",
      "A lively home",
    ],
  },
  {
    id: "clean",
    label: "How soon should shared cooking mess be cleaned?",
    kind: "scale",
    options: [
      "Immediately",
      "Within a few hours",
      "By the end of the day",
      "By the following day",
    ],
  },
  {
    id: "visitors",
    label: "How often are small groups of visitors welcome?",
    kind: "scale",
    options: [
      "Once a month or less",
      "A few times a month",
      "Once or twice a week",
      "Three or more times a week",
    ],
  },
  {
    id: "overnight",
    label: "How often are overnight guests welcome?",
    kind: "scale",
    options: [
      "Never",
      "One or two nights a month",
      "One or two nights a week",
      "Three or more nights a week",
    ],
  },
  {
    id: "smoking",
    label: "Is smoking or vaping inside the home acceptable?",
    kind: "binary",
    options: ["No", "Yes, in agreed areas"],
  },
  {
    id: "pets",
    label: "Are you comfortable sharing a home with pets?",
    kind: "binary",
    options: ["No, I need a pet-free home", "Yes"],
  },
  {
    id: "relationship",
    label: "What kind of roommate relationship would you like?",
    kind: "scale",
    options: [
      "Friendly but mostly independent",
      "Occasional socializing",
      "A close friendship",
    ],
  },
];
export const openQuestions = [
  {
    id: "evening",
    label: "A weekday in your life",
    description:
      "Describe a typical weekday evening at home, including how you wind down.",
  },
  {
    id: "dishes",
    label: "Cleanliness in practice",
    description:
      "What would you do if a roommate repeatedly left dirty dishes overnight?",
  },
  {
    id: "guests",
    label: "Overnight guests",
    description:
      "What notice, frequency, and shared-space boundaries would you want around overnight guests?",
  },
  {
    id: "disagreements",
    label: "Handling disagreements",
    description:
      "How would you discuss a disagreement, such as conflicting plans for the living room?",
  },
  {
    id: "chores",
    label: "Sharing the responsibilities",
    description:
      "How would you divide cleaning and household responsibilities?",
  },
  {
    id: "boundaries",
    label: "Flexibility and boundaries",
    description:
      "What habit or preference should a roommate understand about you? Explain where you can compromise and where you cannot.",
  },
];
export function answerLabel(id: string, value: string) {
  const q = structured.find((q) => q.id === id);
  return q?.options?.[Number(value)] ?? value;
}
