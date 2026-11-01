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

export const actionItemMachine = defineMachine({
  id: "action-item",
  states: ACTION_ITEM_STATES,
  initial: "proposed",
  terminal: [],
  transitions: {
    approve: { from: ["proposed", "dismissed"], to: "approved" },
    dismiss: { from: ["proposed", "approved"], to: "dismissed" },
    reopen: { from: ["approved", "dismissed"], to: "proposed" },
  },
});

export type ActionItemEvent = (typeof actionItemMachine.events)[number];
