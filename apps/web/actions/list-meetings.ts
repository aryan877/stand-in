import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import {
  DEFAULT_PAGE_SIZE,
  listMeetings,
  MAX_PAGE_SIZE,
  MEETING_VIEWS,
  requireOwner,
} from "../server/meetings/store.js";

export default defineAction({
  description:
    'List the user\'s meetings one page at a time. "upcoming" has calls in progress first, then scheduled calls, soonest first. "missed" has calls the stand-in never joined, newest first. "past" has finished calls, newest first. Returns { meetings, hasMore }; while hasMore is true, call again with a higher offset.',
  mcpTool: true,
  schema: z.object({
    view: z
      .enum(MEETING_VIEWS)
      .default("upcoming")
      .describe("Which meetings to list"),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE)
      .describe("How many meetings to return"),
    offset: z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("How many meetings to skip"),
  }),
  http: { method: "GET" },
  run: async (page, ctx) => listMeetings(requireOwner(ctx?.userEmail), page),
});
