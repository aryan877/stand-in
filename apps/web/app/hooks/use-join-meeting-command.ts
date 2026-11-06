import { useSemanticNavigationState } from "@agent-native/core/client/navigation";

import { TAB_ID } from "@/lib/tab-id";

import { JOIN_MEETING_COMMAND } from "../../shared/meetings";
import { joinMeetingNow } from "./use-stand-in-extension";

interface JoinMeetingCommand {
  meetingId: string;
  meetUrl: string;
}

const COMMAND_POLL_MS = 3_000;

export function useJoinMeetingCommand() {
  useSemanticNavigationState<null, JoinMeetingCommand>({
    state: null,
    browserTabId: TAB_ID,
    requestSource: TAB_ID,
    navigationKeys: [],
    commandKeys: [`${JOIN_MEETING_COMMAND}:${TAB_ID}`],
    commandQueryKey: ["join-meeting-command", TAB_ID],
    commandRefetchInterval: COMMAND_POLL_MS,
    onCommand: ({ meetingId, meetUrl }) => joinMeetingNow(meetingId, meetUrl),
  });
}
