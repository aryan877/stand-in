import { useActionMutation } from "@agent-native/core/client/hooks";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { MEETINGS_PATH } from "@/lib/chat-paths";
import { cn } from "@/lib/utils";

import type { ActionItem, Question } from "../../../../server/db/schema";
import type { MeetingDetail } from "../../../../server/meetings/store";
import { STAND_IN_SPEAKER } from "../../../../shared/meetings";
import { spokenKind } from "../../../../shared/spoken";
import { plural, someoneElseSpoke } from "../shared/format";
import { QuestionCard } from "../shared/QuestionCard";
import { Transcript } from "../shared/Transcript";
import {
  ActionError,
  ActionRow,
  EmptyNote,
  Hint,
  Section,
  type TabItem,
  Tabs,
} from "../shared/ui";
import { NotesDoc } from "./NotesDoc";

const TAB_IDS = ["summary", "todos", "questions", "transcript"] as const;
type TabId = (typeof TAB_IDS)[number];

const asTab = (value: string | null): TabId =>
  TAB_IDS.find((tab) => tab === value) ?? "summary";

export function EndedView({ detail }: { detail: MeetingDetail }) {
  const { meeting, actionItems, transcript, questions } = detail;
  const [params, setParams] = useSearchParams();
  const active = asTab(params.get("tab"));
  const select = (tab: TabId) =>
    setParams(tab === "summary" ? {} : { tab }, { replace: true });

  const waiting = questions.filter((question) => question.status === "pending");
  const answered = questions.filter(
    (question) => question.status !== "pending",
  );
  const toReview = actionItems.filter((item) => item.status === "proposed");
  const anyoneSpoke = someoneElseSpoke(transcript);

  const tabs: TabItem<TabId>[] = [
    { id: "summary", label: "Summary" },
    {
      id: "todos",
      label: "To-dos",
      count: actionItems.filter((item) => item.status !== "dismissed").length,
    },
    { id: "questions", label: "Questions for you", count: waiting.length },
    { id: "transcript", label: "Transcript" },
  ];

  return (
    <div className="space-y-6">
      {anyoneSpoke ? (
        <Recap
          answersRead={
            transcript.filter(
              (line) =>
                line.speaker === STAND_IN_SPEAKER &&
                spokenKind(meeting, line.body) === "answer",
            ).length
          }
          questions={questions.length}
          toDos={tabs[1]?.count ?? 0}
        />
      ) : null}
      <NextStep
        active={active}
        waiting={waiting.length}
        toReview={toReview.length}
        notesReady={meeting.notes !== null}
        onSelect={select}
      />
      <div>
        <Tabs items={tabs} active={active} onSelect={select} />
        <div role="tabpanel" className="pt-6">
          {active === "summary" ? (
            <NotesDoc meeting={meeting} anyoneSpoke={anyoneSpoke} />
          ) : active === "todos" ? (
            <ToDos items={actionItems} notesReady={meeting.notes !== null} />
          ) : active === "questions" ? (
            <Questions waiting={waiting} answered={answered} />
          ) : transcript.length ? (
            <Transcript
              lines={transcript}
              meeting={meeting}
              questions={questions}
            />
          ) : (
            <EmptyNote>Nothing was said on this call.</EmptyNote>
          )}
        </div>
      </div>
    </div>
  );
}

function Recap({
  answersRead,
  questions,
  toDos,
}: {
  answersRead: number;
  questions: number;
  toDos: number;
}) {
  const cells = [
    { count: answersRead, label: "of your answers read out" },
    {
      count: questions,
      label: `${questions === 1 ? "question" : "questions"} saved for you`,
    },
    {
      count: toDos,
      label: `${toDos === 1 ? "to-do" : "to-dos"} from the call`,
    },
  ];
  return (
    <dl className="grid grid-cols-3 divide-x rounded-xl border">
      {cells.map((cell) => (
        <div key={cell.label} className="flex flex-col-reverse px-5 py-4">
          <dt className="mt-0.5 text-sm leading-[22px] text-muted-foreground">
            {cell.label}
          </dt>
          <dd className="font-display text-[28px] leading-8 tracking-[-0.4px] tabular-nums">
            {cell.count}
          </dd>
        </div>
      ))}
    </dl>
  );
}

