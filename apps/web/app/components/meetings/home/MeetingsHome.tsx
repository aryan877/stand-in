import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { useStandInExtensionMissing } from "@/hooks/use-stand-in-extension";
import { MEETINGS_PATH } from "@/lib/chat-paths";

import type { Meeting } from "../../../../server/db/schema";
import {
  outcomeSentence,
  plural,
  statusSentence,
  wasMissed,
  whenPhrase,
} from "../shared/format";
import { GetExtensionButton } from "../shared/GetExtension";
import {
  ActionRow,
  EmptyNote,
  Lead,
  LiveBars,
  LoadingNote,
  meetingPath,
  Page,
  PageTitle,
  Section,
} from "../shared/ui";

const PAGE_SIZE = 20;

type MeetingView = "upcoming" | "missed" | "past";
type ListedMeeting = Meeting & { waitingQuestions: number };

const meetingPage = (view: MeetingView, page: number) => ({
  view,
  limit: PAGE_SIZE,
  offset: page * PAGE_SIZE,
});
const followUpPage = (page: number) => ({
  limit: PAGE_SIZE,
  offset: page * PAGE_SIZE,
});

export function MeetingsHome() {
  const upcoming = useActionQuery("list-meetings", meetingPage("upcoming", 0));
  const missed = useActionQuery("list-meetings", meetingPage("missed", 0));
  const past = useActionQuery("list-meetings", meetingPage("past", 0));
  const followUps = useActionQuery("list-follow-ups", followUpPage(0));

  const failed =
    upcoming.error ?? missed.error ?? past.error ?? followUps.error;
  const loaded = upcoming.data && missed.data && past.data && followUps.data;
  const isEmpty =
    loaded &&
    !upcoming.data?.meetings.length &&
    !missed.data?.meetings.length &&
    !past.data?.meetings.length;

  return (
    <Page>
      <header className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <PageTitle>Your calls</PageTitle>
          <Lead>
            Stand-in joins these Google Meet calls for you and writes the notes
            when each call ends.
          </Lead>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to={`${MEETINGS_PATH}/new`}>
            <IconPlus />
            Schedule a call
          </Link>
        </Button>
      </header>

      <ExtensionWarning />

      {failed ? (
        <p role="alert" className="mt-8 text-sm text-destructive">
          Your calls couldn't be loaded. Refresh this page to try again.
        </p>
      ) : !loaded ? (
        <div className="mt-8">
          <LoadingNote>Loading your calls.</LoadingNote>
        </div>
      ) : isEmpty ? (
        <HowItWorks />
      ) : (
        <div className="mt-10 space-y-10">
          <Section
            title="Upcoming calls"
            hint="Stand-in opens each of these by itself at the start time."
          >
            {upcoming.data?.meetings.length ? (
              <MeetingPages
                view="upcoming"
                moreLabel="Show later calls"
                loadingLabel="Loading later calls."
              />
            ) : (
              <EmptyNote>
                No calls scheduled. Schedule a call and Stand-in will join it
                for you.
              </EmptyNote>
            )}
          </Section>

          {followUps.data?.followUps.length ? (
            <Section
              title="Questions waiting for your reply"
              hint="Stand-in couldn't answer these, so it told people you would reply later."
            >
              <FollowUpPages />
            </Section>
          ) : null}

          {missed.data?.meetings.length ? (
            <Section
              title="Missed calls"
              hint="Stand-in didn't join these. Open one and choose a new time to try again."
            >
              <MeetingPages
                view="missed"
                moreLabel="Show more missed calls"
                loadingLabel="Loading more missed calls."
              />
            </Section>
          ) : null}

          {past.data?.meetings.length ? (
            <Section title="Past calls">
              <MeetingPages
                view="past"
                moreLabel="Show older calls"
                loadingLabel="Loading older calls."
              />
            </Section>
          ) : null}
        </div>
      )}
    </Page>
  );
}

function ExtensionWarning() {
  if (!useStandInExtensionMissing()) return null;
  return (
    <div className="mt-5 flex items-start gap-2.5 rounded-xl border bg-muted/50 px-4 py-3 text-sm leading-[22px]">
      <IconAlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p>
          <span className="font-medium">
            Stand-in can't join calls from this browser yet.
          </span>{" "}
          Add the Stand-in Chrome extension here so it can join from your
          signed-in Google account.
        </p>
        <div className="mt-3">
          <GetExtensionButton />
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "You brief it",
      text: "Add the Meet link, the time, and the answers Stand-in may read out.",
    },
    {
      title: "It joins by itself",
      text: "At the start time it opens the call in your Chrome, says it is an AI, and lets people in if you host.",
    },
    {
      title: "You get the notes",
      text: "When the call ends you get notes, to-dos, and every question people left for you.",
    },
  ];
  return (
    <div className="mt-10">
      <Section title="How Stand-in works">
        <ol className="grid gap-4 @3xl:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-xl border p-5">
              <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
                {index + 1}
              </span>
              <p className="mt-3 font-display text-lg leading-6 tracking-[-0.2px]">
                {step.title}
              </p>
              <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

