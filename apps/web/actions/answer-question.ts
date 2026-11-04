import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { answerQuestion, requireOwner } from "../server/meetings/store.js";

export default defineAction({
  description:
    "Save the user's reply to a question someone asked in a call. It is never said in the call.",
  mcpTool: true,
  mcpAnnotations: {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  schema: z.object({
    id: z.string().describe("Question id"),
    answer: z
      .string()
      .trim()
      .min(1)
      .describe("The user's answer, in their own words"),
  }),
  outputSchema: z.object({ id: z.string() }),
  run: async ({ id, answer }, ctx) => {
    await answerQuestion(requireOwner(ctx?.userEmail), id, answer);
    return { id };
  },
});
