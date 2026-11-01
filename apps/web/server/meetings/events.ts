import { emit, registerEvent } from "@agent-native/core/event-bus";
import { z } from "zod";

import type { Meeting } from "../db/schema.js";

export const MEETING_ENDED = "meeting.ended";

registerEvent({
  name: MEETING_ENDED,
  description:
    "A call Stand-in attended has ended. Its transcript is ready for notes and follow-ups.",
  payloadSchema: z.object({
    meetingId: z.string(),
    title: z.string(),
    ownerName: z.string(),
  }),
  example: { meetingId: "meeting-id", title: "Launch sync", ownerName: "Maya" },
});

