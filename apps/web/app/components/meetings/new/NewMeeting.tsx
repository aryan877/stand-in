import {
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { MEETINGS_PATH } from "@/lib/chat-paths";

import { type MeetingForm, MeetingFields } from "../shared/BriefingFields";
import { briefingProblem, nextHour } from "../shared/format";
import {
  ActionError,
  ActionRow,
  BackToMeetings,
  Lead,
  meetingPath,
  Page,
  PageTitle,
} from "../shared/ui";

export function NewMeeting() {
  const navigate = useNavigate();
  const create = useActionMutation("create-meeting");
  const upcoming = useActionQuery("list-meetings", {
    view: "upcoming",
    limit: 1,
  });
  const past = useActionQuery("list-meetings", { view: "past", limit: 1 });
  const knownName =
    past.data?.meetings[0]?.ownerName ??
    upcoming.data?.meetings[0]?.ownerName ??
    "";
  const [typedName, setTypedName] = useState<string>();
  const [form, setForm] = useState<Omit<MeetingForm, "ownerName">>(() => ({
    title: "",
    meetUrl: "",
    startsAt: nextHour(),
    durationMinutes: 30,
    agenda: "",
    mayShare: "",
    mustAsk: "",
    letPeopleIn: false,
  }));
  const value = { ...form, ownerName: typedName ?? knownName };
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = briefingProblem(value);
    setProblem(found);
    if (found) return;
    create.mutate(
      { ...value, meetUrl: value.meetUrl.trim() },
      {
        onSuccess: ({ id }) => navigate(meetingPath(id), { replace: true }),
      },
    );
  };

  return (
    <Page>
      <BackToMeetings />
      <PageTitle>Schedule a call</PageTitle>
      <Lead>
        You won't be on this call. Stand-in only knows what you write here, and
        saves every other question for you to answer later.
      </Lead>
      <form onSubmit={submit} className="mt-4 space-y-5">
        <MeetingFields
          value={value}
          onChange={({ ownerName, ...patch }) => {
            setProblem(null);
            if (ownerName !== undefined) setTypedName(ownerName);
            setForm((current) => ({ ...current, ...patch }));
          }}
        />
        <ActionError
          problem={problem}
          error={create.error}
          fallback="Couldn't schedule this call."
        />
        <ActionRow>
          <Button type="submit" size="lg" disabled={create.isPending}>
            {create.isPending ? "Scheduling" : "Schedule this call"}
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link to={MEETINGS_PATH}>Cancel</Link>
          </Button>
        </ActionRow>
      </form>
    </Page>
  );
}
