import { defineAction } from "@agent-native/core/action";
import { writeAppStateForCurrentTab } from "@agent-native/core/application-state";
import { z } from "zod";

import { approveWhenModelCalls } from "../server/meetings/approval.js";
import {
  requireJoinableMeeting,
  requireOwner,
} from "../server/meetings/store.js";
import { JOIN_MEETING_COMMAND } from "../shared/meetings.js";

export default defineAction({
  description:
    "Send the stand-in into a call right now, from the browser the user has open. The stand-in introduces itself as soon as it's in.",
  http: false,
  mcpTool: false,
  needsApproval: approveWhenModelCalls,
  schema: z.object({ id: z.string().describe("Meeting id") }),
  outputSchema: z.string(),
  run: async ({ id }, ctx) => {
    const { meetUrl, title } = await requireJoinableMeeting(
      requireOwner(ctx?.userEmail),
      id,
    );
    await writeAppStateForCurrentTab(JOIN_MEETING_COMMAND, {
      meetingId: id,
      meetUrl,
      _writeId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    return `Asked this browser to join ${title}.`;
  },
});
