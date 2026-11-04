import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import {
  DEFAULT_PAGE_SIZE,
  listFollowUps,
  MAX_PAGE_SIZE,
  requireOwner,
} from "../server/meetings/store.js";

export default defineAction({
  description:
    "Questions people asked in past calls that the user still needs to reply to, newest first, one page at a time. Returns { followUps, hasMore }; while hasMore is true, call again with a higher offset.",
  mcpTool: true,
  schema: z.object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE)
      .describe("How many questions to return"),
    offset: z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("How many questions to skip"),
  }),
  http: { method: "GET" },
  run: async (page, ctx) => listFollowUps(requireOwner(ctx?.userEmail), page),
});
