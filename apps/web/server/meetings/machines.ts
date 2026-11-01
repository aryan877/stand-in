import { defineMachine } from "@agent-native/core/state-machine";

import { ACTION_ITEM_STATES, MEETING_STATES } from "../../shared/meetings.js";

export const meetingMachine = defineMachine({
  id: "meeting",
  states: MEETING_STATES,
  initial: "draft",
  terminal: ["ended"],
  transitions: {
    start: { from: ["draft"], to: "live" },
    finish: { from: ["live"], to: "ended" },
  },
});

