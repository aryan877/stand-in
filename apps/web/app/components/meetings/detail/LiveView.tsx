import { useActionMutation } from "@agent-native/core/client/hooks";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import type { MeetingDetail } from "../../../../server/meetings/store";
import { STAND_IN_SPEAKER } from "../../../../shared/meetings";
import { spokenKind } from "../../../../shared/spoken";
import { plural, statusSentence } from "../shared/format";
import { QuestionCard } from "../shared/QuestionCard";
import { Transcript } from "../shared/Transcript";
import { EmptyNote, LiveBars, OpenInGoogleMeet, Section } from "../shared/ui";

export function LiveView({ detail }: { detail: MeetingDetail }) {
  const { meeting, transcript, questions } = detail;
  const waiting = questions.filter((question) => question.status === "pending");
  const answersRead = transcript.filter(
    (line) =>
      line.speaker === STAND_IN_SPEAKER &&
      spokenKind(meeting, line.body) === "answer",
  ).length;
  const progress = [
    answersRead ? `read out ${plural(answersRead, "prepared answer")}` : null,
    questions.length
      ? `saved ${plural(questions.length, "question")} for you`
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-live/25 bg-live/[0.06] px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 text-[15px] font-medium">
            <LiveBars />
            {statusSentence(meeting)}
          </p>
          <p className="mt-0.5 text-[15px] leading-6">
            {progress.length
              ? `It has ${progress.join(" and ")}.`
              : "It reads out only your prepared answers and saves every other question for you."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EndCallButton meetingId={meeting.id} />
          <OpenInGoogleMeet url={meeting.meetUrl} size="sm" />
        </div>
      </div>
      <div className="grid items-start gap-6 @4xl:grid-cols-[1fr_340px]">
        <Section title="What is being said" className="min-w-0">
          <LiveTranscript detail={detail} />
        </Section>
        <Section
          title="Questions saved for you"
          hint="Only you can answer these. You can reply now or after the call."
          className="min-w-0"
        >
          <div className="space-y-3">
            {waiting.length ? (
              waiting.map((question) => (
                <QuestionCard key={question.id} question={question} />
              ))
            ) : (
              <EmptyNote>
                Nothing yet. When someone asks something only you can answer, it
                appears here.
              </EmptyNote>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function EndCallButton({ meetingId }: { meetingId: string }) {
  const finish = useActionMutation("finish-meeting");
  return (
    <Button
      size="sm"
      disabled={finish.isPending}
      onClick={() => {
        if (window.confirm("End this call? Stand-in will leave right away."))
          finish.mutate({ id: meetingId });
      }}
    >
      {finish.isPending ? "Ending this call" : "End this call"}
    </Button>
  );
}

function LiveTranscript({ detail }: { detail: MeetingDetail }) {
  const { meeting, transcript, questions } = detail;
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript.length, questions.length]);

  return (
    <div
      ref={scroller}
      className="h-[calc(100dvh-23rem)] min-h-64 overflow-y-auto rounded-xl border p-5"
    >
      {transcript.length ? (
        <Transcript
          lines={transcript}
          meeting={meeting}
          questions={questions}
        />
      ) : (
        <p className="text-[15px] text-muted-foreground">
          Nobody has spoken yet. New lines appear here as people speak.
        </p>
      )}
    </div>
  );
}
