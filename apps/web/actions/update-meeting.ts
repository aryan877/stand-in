import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { approveSpokenEdits } from "../server/meetings/approval.js";
import { requireOwner, updateMeeting } from "../server/meetings/store.js";

export default defineAction({
  description:
    "Edit a meeting's title, the user's name, start time, length, briefing, notes, or whether it lets in people who knock.",
  mcpTool: true,
  mcpAnnotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: true,
  },
  needsApproval: approveSpokenEdits,
  schema: z.object({
    id: z.string().describe("Meeting id"),
    title: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Short name for the call"),
    ownerName: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("The user's name, as the stand-in says it in the call"),
    startsAt: z
      .string()
      .datetime({ offset: true })
      .optional()
      .describe("When the call starts, as an ISO date and time with an offset"),
    durationMinutes: z
      .number()
      .int()
      .min(5)
      .max(240)
      .optional()
      .describe("How long the call is booked for"),
    agenda: z.string().optional().describe("What the call is about"),
    mayShare: z
      .string()
      .optional()
      .describe("Answers it may say, one per line"),
    mustAsk: z.string().optional().describe("Topics it must never answer"),
    letPeopleIn: z
      .boolean()
      .optional()
      .describe("Let people who knock into the call, for calls the user hosts"),
    notes: z.string().optional().describe("Notes from the call, as plain text"),
  }),
  outputSchema: z.object({ id: z.string() }),
  run: async ({ id, startsAt, ...patch }, ctx) => {
    await updateMeeting(requireOwner(ctx?.userEmail), id, {
      ...patch,
      ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
    });
    return { id };
  },
});
