import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { z } from "zod";

import { meetingOnScreen } from "../server/meetings/store.js";

export default defineAction({
  description:
    "Read the app's current navigation state and, on a meeting page, that meeting's id, title, status and counts. Basic navigation is already included in <current-screen>; use this action only when you need a fresh read.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async (_args, ctx) => {
    const navigation = await readAppState("navigation");

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;

    if (ctx?.userEmail && typeof navigation?.meetingId === "string") {
      const meeting = await meetingOnScreen(
        ctx.userEmail,
        navigation.meetingId,
      );
      if (meeting) screen.meeting = meeting;
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
