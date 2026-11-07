import { cn } from "@/lib/utils";

import type {
  Meeting,
  Question,
  TranscriptSegment,
} from "../../../../server/db/schema";
import { STAND_IN_SPEAKER } from "../../../../shared/meetings";
import { type SpokenKind, spokenKind } from "../../../../shared/spoken";
import { timeOf } from "./format";

const SPOKEN_TAG: Record<SpokenKind, string> = {
  introduction: "Says it's an AI",
  answer: "Your answer, word for word",
  note: "Its one fixed line",
};

const asked = (speaker: string, body: string) => `${speaker}\n${body}`;

export function Transcript({
  lines,
  meeting,
  questions,
}: {
  lines: TranscriptSegment[];
  meeting: Pick<Meeting, "ownerName" | "mayShare">;
  questions: Pick<Question, "askedBy" | "body">[];
}) {
  const saved = new Set(
    questions.map((question) => asked(question.askedBy, question.body)),
  );

  return (
    <ol className="space-y-5">
      {lines.map((line) => {
        const standIn = line.speaker === STAND_IN_SPEAKER;
        const kind = standIn ? spokenKind(meeting, line.body) : null;
        const tag = kind
          ? SPOKEN_TAG[kind]
          : saved.has(asked(line.speaker, line.body))
            ? "Saved for you to answer"
            : null;
        return (
          <li
            key={line.id}
            className={cn(
              "animate-rise",
              standIn && "border-l-2 border-brand pl-3.5",
            )}
          >
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <span className={cn("font-medium", standIn && "text-brand")}>
                {line.speaker}
              </span>
              <time
                dateTime={line.spokenAt}
                className="text-[13px] text-muted-foreground"
              >
                {timeOf(line.spokenAt)}
              </time>
              {tag ? (
                <span
                  className={cn(
                    "rounded-full px-2 text-[13px] leading-[22px]",
                    standIn ? "bg-brand/10" : "bg-muted",
                  )}
                >
                  {tag}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-base leading-[26px] [overflow-wrap:anywhere]">
              {line.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
