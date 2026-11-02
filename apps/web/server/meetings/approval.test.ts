import type { ActionCaller } from "@agent-native/core/action";
import { describe, expect, it } from "vitest";

import { approveUnlessChat, approveWhenModelCalls } from "./approval";

const asks = (caller: ActionCaller) =>
  approveWhenModelCalls({}, { caller, userEmail: "maya@example.com" });

describe("approveUnlessChat", () => {
  it.each(["mcp", "webmcp", "a2a", "automation", "cli"] as const)(
    "asks the owner before a %s caller schedules a call",
    (caller) => {
      expect(approveUnlessChat({}, { caller })).toBe(true);
    },
  );

  it.each(["tool", "frontend"] as const)(
    "lets a %s caller schedule a call for the owner to review",
    (caller) => {
      expect(approveUnlessChat({}, { caller })).toBe(false);
    },
  );
});

describe("approveWhenModelCalls", () => {
  it.each(["tool", "mcp", "webmcp", "a2a", "automation", "cli"] as const)(
    "asks the owner when a %s caller wants to speak",
    (caller) => {
      expect(asks(caller)).toBe(true);
    },
  );

  it.each(["frontend", "http"] as const)(
    "lets a %s caller through without asking",
    (caller) => {
      expect(asks(caller)).toBe(false);
    },
  );

  it("doesn't ask when no context was passed", () => {
    expect(approveWhenModelCalls({})).toBe(false);
  });

  it("decides from the caller alone, whatever the arguments are", () => {
    expect(
      approveWhenModelCalls({ text: "anything" }, { caller: "tool" }),
    ).toBe(true);
    expect(
      approveWhenModelCalls({ text: "anything" }, { caller: "frontend" }),
    ).toBe(false);
  });
});
