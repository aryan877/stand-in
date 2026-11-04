import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { respondToLine } from "../server/meetings/responder.js";
import {
  appendTranscriptLine,
  requireLiveMeeting,
  requireOwner,
} from "../server/meetings/store.js";

export default defineAction({
  description:
    "Record what someone said on a live call and let the stand-in respond.",
  agentTool: false,
  schema: z.object({
    meetingId: z.string(),
    speaker: z.string().trim().min(1),
    body: z.string().trim().min(1),
  }),
  outputSchema: z.object({ id: z.string() }),
  run: async ({ meetingId, speaker, body }, ctx) => {
    const meeting = await requireLiveMeeting(
      requireOwner(ctx?.userEmail),
      meetingId,
    );
    const id = await appendTranscriptLine(meeting, speaker, body);
    await respondToLine(meeting, id);
    return { id };
  },
});
