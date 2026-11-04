import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { approveWhenModelCalls } from "../server/meetings/approval.js";
import { emitMeetingEnded } from "../server/meetings/events.js";
import {
  finishMeeting,
  getMeeting,
  heardAnyone,
  requireOwner,
} from "../server/meetings/store.js";

export default defineAction({
  description:
    "End a live meeting. The extension calls this when the stand-in leaves the call.",
  mcpTool: true,
  mcpAnnotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: true,
  },
  needsApproval: approveWhenModelCalls,
  schema: z.object({ id: z.string().describe("Meeting id") }),
  outputSchema: z.object({ id: z.string() }),
  run: async ({ id }, ctx) => {
    const ownerEmail = requireOwner(ctx?.userEmail);
    if ((await finishMeeting(ownerEmail, id)) && (await heardAnyone(id))) {
      emitMeetingEnded(await getMeeting(ownerEmail, id));
    }
    return { id };
  },
});
