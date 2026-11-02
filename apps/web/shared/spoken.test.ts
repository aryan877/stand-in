import { describe, expect, it } from "vitest";

import { introduction, noteForOwner, splitFacts, spokenKind } from "./spoken";

describe("splitFacts", () => {
  it("keeps each line whole and drops list markers", () => {
    expect(
      splitFacts(
        "- The launch is Thursday. It moves if QA fails.\n\n2) Hiring is paused\r\n* 40 people joined",
      ),
    ).toEqual([
      "The launch is Thursday. It moves if QA fails.",
      "Hiring is paused",
      "40 people joined",
    ]);
  });

  it("keeps a number that starts an answer", () => {
    expect(splitFacts("5 people are coming")).toEqual(["5 people are coming"]);
  });

  it("returns nothing for an empty briefing", () => {
    expect(splitFacts("  \n ")).toEqual([]);
  });
});

describe("spokenKind", () => {
  const meeting = {
    ownerName: "Maya",
    mayShare: "- The launch is Thursday.\nPriya owns the notes.",
  };

  it("names each line Stand-in is allowed to say", () => {
    expect(spokenKind(meeting, introduction(meeting))).toBe("introduction");
    expect(spokenKind(meeting, noteForOwner(meeting))).toBe("note");
    expect(spokenKind(meeting, "The launch is Thursday.")).toBe("answer");
  });

  it("names nothing else", () => {
    expect(spokenKind(meeting, "The launch is Friday.")).toBeNull();
    expect(spokenKind(meeting, "the launch is thursday.")).toBeNull();
  });
});
