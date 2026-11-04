import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { requireOwner, updateActionItem } from "../server/meetings/store.js";

export default defineAction({
  description:
    "Edit, approve, dismiss or reopen an action item from a meeting.",
  mcpTool: true,
  mcpAnnotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: false,
  },
  schema: z
    .object({
      id: z.string().describe("Action item id"),
      body: z.string().trim().min(1).optional().describe("What needs doing"),
      assignee: z
        .string()
        .trim()
        .optional()
        .describe("Who does it. An empty string clears the name"),
      event: z
        .enum(["approve", "dismiss", "reopen"])
        .optional()
        .describe("Approve it, dismiss it, or reopen it as a proposal"),
    })
    .refine(
      ({ body, assignee, event }) =>
        [body, assignee, event].some((value) => value !== undefined),
      {
        message: "Change at least one thing.",
      },
    ),
  outputSchema: z.object({ id: z.string() }),
  run: async ({ id, ...patch }, ctx) => {
    await updateActionItem(requireOwner(ctx?.userEmail), id, patch);
    return { id };
  },
});
