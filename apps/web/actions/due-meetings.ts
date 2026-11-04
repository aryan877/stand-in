import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { dueMeetings, requireOwner } from "../server/meetings/store.js";

export default defineAction({
  description:
    "Calls whose start time has come, for the Chrome extension to join, and when the next one starts.",
  agentTool: false,
  schema: z.object({}),
  http: { method: "GET" },
  run: async (_args, ctx) => dueMeetings(requireOwner(ctx?.userEmail)),
});
