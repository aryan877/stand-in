import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import {
  getMeeting,
  leaveAt,
  queueLine,
  requireOwner,
  startMeeting,
} from "../server/meetings/store.js";
import { introduction } from "../shared/spoken.js";

export default defineAction({
  description:
    "Mark a meeting live once the extension has joined, and queue the stand-in's introduction.",
  agentTool: false,
  schema: z.object({ id: z.string().describe("Meeting id") }),
  outputSchema: z.object({
    id: z.string(),
    leaveAt: z.string(),
    letPeopleIn: z.boolean(),
  }),
  run: async ({ id }, ctx) => {
    const ownerEmail = requireOwner(ctx?.userEmail);
    const firstJoin = await startMeeting(ownerEmail, id);
    const meeting = await getMeeting(ownerEmail, id);
    if (firstJoin) await queueLine(meeting, introduction(meeting));
    return {
      id,
      leaveAt: leaveAt(meeting),
      letPeopleIn: meeting.letPeopleIn,
    };
  },
});
