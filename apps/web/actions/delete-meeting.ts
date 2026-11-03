import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { approveWhenModelCalls } from "../server/meetings/approval.js";
import { deleteMeeting, requireOwner } from "../server/meetings/store.js";

export default defineAction({
  description: "Delete a meeting with its transcript, questions and notes.",
  mcpAnnotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: false,
  },
  needsApproval: approveWhenModelCalls,
  schema: z.object({ id: z.string().describe("Meeting id") }),
  outputSchema: z.object({ id: z.string() }),
  run: async ({ id }, ctx) => {
    await deleteMeeting(requireOwner(ctx?.userEmail), id);
    return { id };
  },
});
