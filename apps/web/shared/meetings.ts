export const STAND_IN_SPEAKER = "Stand-in";
export const JOIN_MEETING_COMMAND = "join-meeting";

export const MEETING_STATES = ["draft", "live", "ended"] as const;
export type MeetingStatus = (typeof MEETING_STATES)[number];

export const QUESTION_STATES = ["pending", "answered"] as const;
export const UTTERANCE_STATES = ["queued", "spoken"] as const;

export const ACTION_ITEM_STATES = [
  "proposed",
  "approved",
  "dismissed",
] as const;

export const MEET_URL =
  /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(?:[?#].*)?$/;
