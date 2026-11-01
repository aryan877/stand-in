import { describe, expect, it } from "vitest";

import { actionItemMachine, meetingMachine } from "./machines";

describe("meetingMachine", () => {
  it("only starts a draft and only finishes a live call", () => {
    expect(meetingMachine.fromStates("start")).toEqual(["draft"]);
    expect(meetingMachine.transition("draft", "start")).toBe("live");
    expect(meetingMachine.fromStates("finish")).toEqual(["live"]);
    expect(meetingMachine.transition("live", "finish")).toBe("ended");
    expect(meetingMachine.isTerminal("ended")).toBe(true);
  });

  it("rejects unknown stored values", () => {
    expect(() => meetingMachine.parseState("paused")).toThrow();
  });
});

describe("actionItemMachine", () => {
  it("moves between proposed, approved and dismissed", () => {
    expect(actionItemMachine.transition("proposed", "approve")).toBe(
      "approved",
    );
    expect(actionItemMachine.transition("approved", "dismiss")).toBe(
      "dismissed",
    );
    expect(actionItemMachine.transition("dismissed", "reopen")).toBe(
      "proposed",
    );
    expect(actionItemMachine.can("approved", "approve")).toBe(false);
  });
});
