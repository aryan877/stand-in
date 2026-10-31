export const STAND_IN_SPEAKER = "Stand-in";
export const JOIN_MEETING_COMMAND = "join-meeting";

export const MEETING_STATES = ["draft", "live", "ended"] as const;
export type MeetingStatus = (typeof MEETING_STATES)[number];

