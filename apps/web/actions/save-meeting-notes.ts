import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { notifyOwner } from "../server/meetings/notify-owner.js";
import { requireOwner, saveNotes } from "../server/meetings/store.js";

export default defineAction({
  description:
    "Save the notes and action items for a meeting, replacing any earlier ones.",
  mcpTool: true,
  mcpAnnotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: false,
  },
  schema: z.object({
    id: z.string().describe("Meeting id"),
    notes: z
      .string()
      .trim()
      .min(1)
      .describe('Plain text: a "Decisions" list, then a "Key points" list'),
    actionItems: z
      .array(
        z.object({
          body: z.string().trim().min(1).describe("What needs doing"),
          assignee: z.string().trim().min(1).optional().describe("Who does it"),
        }),
      )
      .describe("Follow-ups people agreed to on the call"),
  }),
  outputSchema: z.object({ id: z.string() }),
  run: async ({ id, notes, actionItems }, ctx) => {
    const ownerEmail = requireOwner(ctx?.userEmail);
    const { title } = await saveNotes(ownerEmail, id, notes, actionItems);
    notifyOwner(
      ownerEmail,
      id,
      `Notes are ready for ${title}.`,
      "Stand-in saved the notes and to-dos from this call.",
    );
    return { id };
  },
});
