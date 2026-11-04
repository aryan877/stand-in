import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { speechProvider } from "../server/lib/providers/speech.js";
import {
  claimNextLine,
  releaseLine,
  requireLiveMeeting,
  requireOwner,
} from "../server/meetings/store.js";

export default defineAction({
  description:
    "Hand the extension the next line to speak in a live call, with its audio.",
  agentTool: false,
  changeEvents: false,
  schema: z.object({ meetingId: z.string() }),
  outputSchema: z.object({
    line: z
      .object({
        body: z.string(),
        mimeType: z.string(),
        audioBase64: z.string(),
      })
      .nullable(),
  }),
  run: async ({ meetingId }, ctx) => {
    const meeting = await requireLiveMeeting(
      requireOwner(ctx?.userEmail),
      meetingId,
    );
    const line = await claimNextLine(meeting);
    if (!line) return { line: null };
    try {
      const { audio, mimeType } = await speechProvider().synthesize(line.body);
      return {
        line: {
          body: line.body,
          mimeType,
          audioBase64: Buffer.from(audio).toString("base64"),
        },
      };
    } catch (error) {
      await releaseLine(line);
      throw error;
    }
  },
});
