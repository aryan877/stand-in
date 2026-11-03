import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { approveUnlessChat } from "../server/meetings/approval.js";
import { addNotesAutomation } from "../server/meetings/notes-automation.js";
import {
  createMeeting,
  isOnlyMeeting,
  requireOwner,
} from "../server/meetings/store.js";
import { MEET_URL } from "../shared/meetings.js";

export default defineAction({
  description:
    "Create a Google Meet call for the stand-in to attend, with its briefing.",
  mcpTool: true,
  mcpAnnotations: {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: true,
  },
  needsApproval: approveUnlessChat,
  schema: z.object({
    title: z.string().trim().min(1).describe("Short name for the call"),
    ownerName: z
      .string()
      .trim()
      .min(1)
      .describe("The user's name, as the stand-in says it in the call"),
    meetUrl: z
      .string()
      .trim()
      .regex(MEET_URL, "Use a meet.google.com link")
      .describe(
        "The Google Meet link, like https://meet.google.com/abc-defg-hij",
      ),
    startsAt: z
      .string()
      .datetime({ offset: true })
      .describe("When the call starts, as an ISO date and time with an offset"),
    durationMinutes: z
      .number()
      .int()
      .min(5)
      .max(240)
      .default(30)
      .describe("How long the call is booked for"),
    agenda: z.string().default("").describe("What the call is about"),
    mayShare: z
      .string()
      .default("")
      .describe("Answers the stand-in may say word for word, one per line"),
    mustAsk: z
      .string()
      .default("")
      .describe("Topics the stand-in must never answer for the user"),
    letPeopleIn: z
      .boolean()
      .default(false)
      .describe("Let people who knock into the call, for calls the user hosts"),
  }),
  outputSchema: z.object({ id: z.string() }),
  run: async ({ startsAt, ...fields }, ctx) => {
    const ownerEmail = requireOwner(ctx?.userEmail);
    const id = await createMeeting(ownerEmail, {
      ...fields,
      startsAt: new Date(startsAt).toISOString(),
    });
    if (await isOnlyMeeting(ownerEmail)) {
      await addNotesAutomation(ownerEmail);
    }
    return { id };
  },
});
