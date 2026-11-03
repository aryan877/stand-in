import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { getMeetingDetail, requireOwner } from "../server/meetings/store.js";

export default defineAction({
  description:
    "Get one meeting with its briefing, transcript, live questions, notes and action items.",
  mcpTool: true,
  schema: z.object({ id: z.string().describe("Meeting id") }),
  http: { method: "GET" },
  run: async ({ id }, ctx) =>
    getMeetingDetail(requireOwner(ctx?.userEmail), id),
});
