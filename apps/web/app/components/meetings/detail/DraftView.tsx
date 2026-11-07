import {
  sendToAgentChat,
  sendToAgentChatAndConfirm,
} from "@agent-native/core/client/agent-chat";
import { useActionMutation } from "@agent-native/core/client/hooks";
import {
  IconAlertCircle,
  IconCheck,
  IconDeviceLaptop,
  IconPuzzle,
} from "@tabler/icons-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  joinMeetingNow,
  useStandInExtension,
  useStandInExtensionMissing,
} from "@/hooks/use-stand-in-extension";

import type { Meeting } from "../../../../server/db/schema";
import { splitFacts } from "../../../../shared/spoken";
import { type MeetingForm, MeetingFields } from "../shared/BriefingFields";
import {
  briefingProblem,
  dayLabel,
  startOf,
  startsIn,
  timeOf,
  wasMissed,
} from "../shared/format";
import { GetExtensionButton } from "../shared/GetExtension";
import {
  ActionError,
  ActionRow,
  AgentChangedNotice,
  EmptyNote,
  Fact,
  Hint,
  OpenInGoogleMeet,
  SavedNote,
  SectionTitle,
} from "../shared/ui";

export function DraftView({ meeting }: { meeting: Meeting }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  if (editing) {
    return (
      <EditMeeting
        meeting={meeting}
        onSaved={() => {
          setEditing(false);
          setSaved(true);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  const hasAnswers = splitFacts(meeting.mayShare).length > 0;
  return (
    <div className="space-y-5">
      {saved ? <SavedNote /> : null}
      <Readiness meeting={meeting}>
        <Actions
          meeting={meeting}
          primary={hasAnswers || wasMissed(meeting)}
          onEdit={() => {
            setSaved(false);
            setEditing(true);
          }}
        />
      </Readiness>
      <CanSay meeting={meeting} />
      <CallFacts meeting={meeting} />
    </div>
  );
}

function Need({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[3px] shrink-0 [&_svg]:size-4">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function Readiness({
  meeting,
  children,
}: {
  meeting: Meeting;
  children: ReactNode;
}) {
  const extensionReady = useStandInExtension();
  const extensionMissing = useStandInExtensionMissing();
  const start = startOf(meeting);

  if (wasMissed(meeting)) {
    return (
      <section className="rounded-xl border bg-muted/50 p-5 text-[15px] leading-6">
        <p>
          Stand-in only joins in the first 15 minutes of a call, and it wasn't
          able to join this one. To try again, choose a new time.
        </p>
        <div className="mt-4">{children}</div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-muted/50 p-5">
      <h2 className="font-display text-xl leading-7 tracking-[-0.2px]">
        Stand-in joins {startsIn(start)}.
      </h2>
      <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-[15px] leading-6 @3xl:grid-cols-2">
        <Need
          icon={
            extensionReady ? (
              <IconCheck />
            ) : extensionMissing ? (
              <IconAlertCircle />
            ) : (
              <IconPuzzle />
            )
          }
        >
          {extensionReady
            ? "The Chrome extension is connected in this browser."
            : extensionMissing
              ? "The Chrome extension is not connected yet. Add Stand-in to this browser."
              : "Checking this browser for the Chrome extension."}
        </Need>
        <Need icon={<IconDeviceLaptop />}>
          Keep this computer on, with Chrome open, at {timeOf(start)}.
        </Need>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {extensionMissing ? <GetExtensionButton /> : null}
        {children}
      </div>
    </section>
  );
}

const PREPARE_WAIT_MS = 120_000;

async function prepareAnswers(meeting: Meeting) {
  const request = {
    message: `Prepare the answers Stand-in can read out on my call "${meeting.title}".`,
    context: JSON.stringify({ meetingId: meeting.id }),
    submit: true,
    openSidebar: true,
    chatTarget: "local" as const,
  };
  const { delivered } = await sendToAgentChatAndConfirm(request);
  if (!delivered) sendToAgentChat(request);
}

function Actions({
  meeting,
  primary,
  onEdit,
}: {
  meeting: Meeting;
  primary: boolean;
  onEdit: () => void;
}) {
  const extensionReady = useStandInExtension();
  const [sent, setSent] = useState(false);

  return (
    <>
      <Button variant={primary ? "default" : "outline"} onClick={onEdit}>
        {wasMissed(meeting) ? "Choose a new time" : "Edit this call"}
      </Button>
      {extensionReady ? (
        <Button
          variant="outline"
          disabled={sent}
          onClick={() => {
            joinMeetingNow(meeting.id, meeting.meetUrl);
            setSent(true);
          }}
        >
          {sent ? "Stand-in is joining" : "Send Stand-in to this call now"}
        </Button>
      ) : null}
      <OpenInGoogleMeet url={meeting.meetUrl} />
    </>
  );
}

function CanSay({ meeting }: { meeting: Meeting }) {
  const answers = splitFacts(meeting.mayShare);
  const [askedWith, setAskedWith] = useState<string | null>(null);
  const preparing = askedWith === meeting.mayShare;

  useEffect(() => {
    if (askedWith === null) return;
    const timer = setTimeout(() => setAskedWith(null), PREPARE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [askedWith]);

  return (
    <section className="rounded-xl border">
      <header className="flex flex-col gap-3 px-5 pt-5 @3xl:flex-row @3xl:items-start @3xl:justify-between @3xl:gap-6">
        <div>
          <SectionTitle>What Stand-in can say</SectionTitle>
          <Hint>
            It reads these answers out word for word. Anything else it saves for
            you.
          </Hint>
        </div>
        {wasMissed(meeting) ? null : (
          <Button
            variant={answers.length ? "outline" : "default"}
            disabled={preparing}
            className="shrink-0"
            onClick={() => {
              setAskedWith(meeting.mayShare);
              void prepareAnswers(meeting);
            }}
          >
            Prepare answers with the agent
          </Button>
        )}
      </header>
      <div className="px-5 pt-4 pb-5">
        {answers.length ? (
          <ol className="space-y-2.5">
            {answers.map((answer, index) => (
              <li
                key={answer}
                style={{ animationDelay: `${index * 140}ms` }}
                className="animate-rise border-l-2 border-brand py-0.5 pl-3.5 text-[17px] leading-7 [overflow-wrap:anywhere]"
              >
                {answer}
              </li>
            ))}
          </ol>
        ) : preparing ? null : (
          <EmptyNote>
            No answers yet. Until you add some, Stand-in tells people you will
            reply later.
          </EmptyNote>
        )}
        {preparing ? (
          <p
            role="status"
            className="mt-3 flex items-center gap-2.5 text-[15px] leading-6 text-muted-foreground first:mt-0"
          >
            <span className="size-2 shrink-0 animate-beat rounded-full bg-brand" />
            The agent is writing answers from what you told it.
          </p>
        ) : null}
      </div>
      <dl className="grid gap-x-8 gap-y-4 border-t px-5 py-4 @3xl:grid-cols-2">
        <Fact label="Topics it must not answer">
          <Written
            text={meeting.mustAsk}
            empty="None listed. It still only says the answers above."
          />
        </Fact>
        <Fact label="What this call is about">
          <Written text={meeting.agenda} empty="You didn't add this." />
        </Fact>
      </dl>
    </section>
  );
}

function Written({ text, empty }: { text: string; empty: string }) {
  const trimmed = text.trim();
  if (!trimmed) return <span className="text-muted-foreground">{empty}</span>;
  return <span className="whitespace-pre-line">{trimmed}</span>;
}

function CallFacts({ meeting }: { meeting: Meeting }) {
  const start = startOf(meeting);
  return (
    <section className="rounded-xl border px-5 py-4">
      <dl className="grid gap-x-8 gap-y-4 @xl:grid-cols-2 @3xl:grid-cols-4">
        <Fact label="Google Meet link" className="@3xl:col-span-2">
          <a
            href={meeting.meetUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            {meeting.meetUrl}
          </a>
        </Fact>
        <Fact label="Date and start time">
          {dayLabel(start)} at {timeOf(start)}
        </Fact>
        <Fact label="Length of the call">
          {meeting.durationMinutes} minutes
        </Fact>
        <Fact label="Stand-in speaks for" className="@3xl:col-span-2">
          {meeting.ownerName}
        </Fact>
        <Fact label="People who knock" className="@3xl:col-span-2">
          {meeting.letPeopleIn
            ? "Stand-in lets them in."
            : "Stand-in leaves them waiting."}
        </Fact>
      </dl>
    </section>
  );
}

const formOf = (meeting: Meeting): MeetingForm => ({
  title: meeting.title,
  meetUrl: meeting.meetUrl,
  ownerName: meeting.ownerName,
  startsAt: startOf(meeting),
  durationMinutes: meeting.durationMinutes,
  agenda: meeting.agenda,
  mayShare: meeting.mayShare,
  mustAsk: meeting.mustAsk,
  letPeopleIn: meeting.letPeopleIn,
});

const sameForm = (a: MeetingForm, b: MeetingForm) =>
  (Object.keys(a) as (keyof MeetingForm)[]).every((key) => a[key] === b[key]);

function EditMeeting({
  meeting,
  onSaved,
  onCancel,
}: {
  meeting: Meeting;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const update = useActionMutation("update-meeting");
  const [base, setBase] = useState(() => formOf(meeting));
  const [form, setForm] = useState(base);
  const [problem, setProblem] = useState<string | null>(null);
  const latest = formOf(meeting);
  const changedElsewhere =
    !sameForm(base, latest) && !update.isPending && !update.isSuccess;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = briefingProblem(
      form,
      form.startsAt !== base.startsAt || wasMissed(meeting),
    );
    setProblem(found);
    if (found) return;
    const { meetUrl: _unchangeable, ...fields } = form;
    update.mutate({ id: meeting.id, ...fields }, { onSuccess: onSaved });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {changedElsewhere ? (
        <AgentChangedNotice
          onReload={() => {
            setBase(latest);
            setForm(latest);
          }}
        />
      ) : null}
      <MeetingFields
        linkLocked
        value={form}
        onChange={(patch) => {
          setProblem(null);
          setForm((current) => ({ ...current, ...patch }));
        }}
      />
      <ActionError
        problem={problem}
        error={update.error}
        fallback="Couldn't save your changes."
      />
      <ActionRow>
        <Button
          type="submit"
          size="lg"
          disabled={update.isPending || changedElsewhere}
        >
          {update.isPending ? "Saving" : "Save changes"}
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={onCancel}>
          Discard changes
        </Button>
      </ActionRow>
    </form>
  );
}
