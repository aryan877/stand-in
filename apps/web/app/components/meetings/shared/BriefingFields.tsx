import { cn } from "@/lib/utils";

import { fromLocalInput, toLocalInput } from "./format";
import { FormGroup, Hint, Labeled, textFieldClass } from "./ui";

export type MeetingForm = {
  title: string;
  meetUrl: string;
  ownerName: string;
  startsAt: string;
  durationMinutes: number;
  agenda: string;
  mayShare: string;
  mustAsk: string;
  letPeopleIn: boolean;
};

type TextKey = "agenda" | "mayShare" | "mustAsk";

const BRIEFING: {
  key: TextKey;
  label: string;
  hint: string;
  example: string;
  rows: number;
  minHeight: string;
}[] = [
  {
    key: "agenda",
    label: "What is this call about?",
    hint: "Background only. Nobody on the call hears this.",
    example: "Weekly launch sync with Tom and Priya.",
    rows: 3,
    minHeight: "min-h-[84px]",
  },
  {
    key: "mayShare",
    label: "Answers Stand-in can read out",
    hint: "One per line, said word for word. The agent can write them too.",
    example: "The pricing page ships Thursday morning.",
    rows: 2,
    minHeight: "min-h-[62px]",
  },
  {
    key: "mustAsk",
    label: "Topics Stand-in must not answer",
    hint: "It says you will reply later and saves the question for you.",
    example: "Budget, hiring, the launch date.",
    rows: 1,
    minHeight: "min-h-10",
  },
];

const DURATIONS = [15, 30, 45, 60, 90];

