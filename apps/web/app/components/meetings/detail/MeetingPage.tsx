import {
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { MEETINGS_PATH } from "@/lib/chat-paths";

import type { Meeting } from "../../../../server/db/schema";
import {
  refreshEvery,
  someoneElseSpoke,
  statusSentence,
} from "../shared/format";
import {
  ActionError,
  BackToMeetings,
  friendlyError,
  Lead,
  LoadingNote,
  Page,
  PageTitle,
} from "../shared/ui";
import { DraftView } from "./DraftView";
import { EndedView } from "./EndedView";
import { LiveView } from "./LiveView";

export function MeetingPage({ id }: { id: string }) {
  const { data, error } = useActionQuery(
    "get-meeting",
    { id },
    {
      refetchInterval: ({ state: { data } }) =>
        data
          ? refreshEvery(data.meeting, someoneElseSpoke(data.transcript))
          : false,
    },
  );

  if (error) {
    return (
      <Page>
        <BackToMeetings />
        <p className="pt-4 text-sm text-muted-foreground">
          {friendlyError(error, "This call couldn't be loaded.")}
        </p>
      </Page>
    );
  }
  if (!data) {
    return (
      <Page>
        <BackToMeetings />
        <LoadingNote>Loading this call.</LoadingNote>
      </Page>
    );
  }

  const { meeting } = data;
  return (
    <Page>
      <BackToMeetings />
      <header className="mt-2 mb-6">
        <PageTitle>{meeting.title}</PageTitle>
        {meeting.status === "live" ? null : (
          <Lead>{statusSentence(meeting)}</Lead>
        )}
      </header>
      {meeting.status === "draft" ? (
        <DraftView key={meeting.id} meeting={meeting} />
      ) : meeting.status === "live" ? (
        <LiveView detail={data} />
      ) : (
        <EndedView detail={data} />
      )}
      {meeting.status === "live" ? null : (
        <footer className="mt-12 border-t pt-5">
          <DeleteMeetingButton meeting={meeting} />
        </footer>
      )}
    </Page>
  );
}

