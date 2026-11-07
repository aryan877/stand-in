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

function NextStep({
  active,
  waiting,
  toReview,
  notesReady,
  onSelect,
}: {
  active: TabId;
  waiting: number;
  toReview: number;
  notesReady: boolean;
  onSelect: (tab: TabId) => void;
}) {
  const step =
    waiting > 0
      ? {
          tab: "questions" as const,
          label: `Reply to ${plural(waiting, "question")}`,
        }
      : toReview > 0
        ? {
            tab: "todos" as const,
            label: `Review ${plural(toReview, "to-do")}`,
          }
        : null;

  if (step) {
    if (step.tab === active) return null;
    return (
      <ActionRow>
        <Button onClick={() => onSelect(step.tab)}>{step.label}</Button>
      </ActionRow>
    );
  }
  if (!notesReady) return null;
  return (
    <ActionRow>
      <Button asChild>
        <Link to={`${MEETINGS_PATH}/new`}>Schedule a call</Link>
      </Button>
    </ActionRow>
  );
}

function ToDos({
  items,
  notesReady,
}: {
  items: ActionItem[];
  notesReady: boolean;
}) {
  if (!items.length) {
    return (
      <EmptyNote>
        {notesReady
          ? "Nobody agreed to do anything on this call."
          : "To-dos appear here when the notes are ready."}
      </EmptyNote>
    );
  }
  return (
    <div>
      <Hint>
        Stand-in listed these from the call. Approve the ones you want to keep
        and remove the rest. Nothing is sent to anyone.
      </Hint>
      <ul className="mt-3 divide-y border-y">
        {items.map((item) => (
          <ToDoRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

const TO_DO_STATE: Record<ActionItem["status"], string> = {
  proposed: "Waiting for you to approve it.",
  approved: "You approved this.",
  dismissed: "You removed this.",
};

function ToDoRow({ item }: { item: ActionItem }) {
  const update = useActionMutation("update-action-item");
  const dismissed = item.status === "dismissed";
  const change = (event: "approve" | "dismiss" | "reopen") =>
    update.mutate({ id: item.id, event });

  return (
    <li className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className={cn("min-w-0 flex-1", dismissed && "opacity-60")}>
        <p
          className={cn(
            "text-[15px] leading-6 [overflow-wrap:anywhere]",
            dismissed && "line-through",
          )}
        >
          {item.body}
        </p>
        <p className="text-sm leading-[22px] text-muted-foreground">
          {item.assignee ? `For ${item.assignee}. ` : ""}
          {TO_DO_STATE[item.status]}
        </p>
        <ActionError
          error={update.error}
          fallback="Couldn't update this to-do."
        />
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {item.status === "proposed" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={update.isPending}
              onClick={() => change("approve")}
            >
              Approve to-do
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={update.isPending}
              onClick={() => change("dismiss")}
            >
              Remove to-do
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={update.isPending}
            onClick={() => change("reopen")}
          >
            {dismissed ? "Put to-do back" : "Undo approval"}
          </Button>
        )}
      </div>
    </li>
  );
}

function CopyReply({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-2"
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => setCopied(true))
      }
    >
      {copied ? "Copied" : "Copy reply"}
    </Button>
  );
}

function Questions({
  waiting,
  answered,
}: {
  waiting: Question[];
  answered: Question[];
}) {
  if (!waiting.length && !answered.length) {
    return <EmptyNote>Nobody left a question for you on this call.</EmptyNote>;
  }
  return (
    <div className="space-y-8">
      {waiting.length ? (
        <div>
          <Hint>
            Stand-in told these people you would reply later. Your reply is
            saved here. Stand-in does not send it to them.
          </Hint>
          <div className="mt-3 space-y-3">
            {waiting.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
        </div>
      ) : null}
      {answered.length ? (
        <Section
          title="Replies you saved"
          hint="Stand-in doesn't send these. Copy one and send it yourself."
        >
          <ul className="divide-y border-y">
            {answered.map((question) => (
              <li key={question.id} className="py-3.5">
                <p className="text-sm text-muted-foreground">
                  {question.askedBy} asked: {question.body}
                </p>
                <p className="mt-0.5 text-[15px] leading-6">
                  You replied: {question.answer}
                </p>
                {question.answer ? <CopyReply text={question.answer} /> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
