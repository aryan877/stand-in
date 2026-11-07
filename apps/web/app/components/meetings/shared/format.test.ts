import { describe, expect, it } from "vitest";

import {
  dayLabel,
  fromLocalInput,
  outcomeSentence,
  parseNotes,
  plural,
  refreshEvery,
  someoneElseSpoke,
  startsIn,
  briefingProblem,
  statusSentence,
  toLocalInput,
  wasMissed,
  whenPhrase,
} from "./format";

const local = (...parts: [number, number, number, number?, number?]) =>
  new Date(...(parts as [number, number, number, number, number]));

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("dayLabel", () => {
  const now = local(2026, 10, 9, 12, 0);

  it("says Today from the first to the last minute of the day", () => {
    expect(dayLabel(local(2026, 10, 9, 0, 0).toISOString(), now)).toBe("Today");
    expect(dayLabel(local(2026, 10, 9, 23, 59).toISOString(), now)).toBe(
      "Today",
    );
  });

  it("says Tomorrow as soon as the date rolls over", () => {
    expect(dayLabel(local(2026, 10, 10, 0, 0).toISOString(), now)).toBe(
      "Tomorrow",
    );
    expect(dayLabel(local(2026, 10, 10, 23, 59).toISOString(), now)).toBe(
      "Tomorrow",
    );
  });

  it("says Yesterday for the whole previous date", () => {
    expect(dayLabel(local(2026, 10, 8, 23, 59).toISOString(), now)).toBe(
      "Yesterday",
    );
    expect(dayLabel(local(2026, 10, 8, 0, 0).toISOString(), now)).toBe(
      "Yesterday",
    );
  });

  it("uses a short date beyond a day either way", () => {
    for (const date of [local(2026, 10, 11, 9), local(2026, 10, 7, 9)]) {
      expect(dayLabel(date.toISOString(), now)).toBe(
        date.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      );
    }
  });

  it("counts calendar days across a month and a year boundary", () => {
    expect(
      dayLabel(
        local(2027, 0, 1, 0, 30).toISOString(),
        local(2026, 11, 31, 23, 30),
      ),
    ).toBe("Tomorrow");
    expect(
      dayLabel(
        local(2026, 11, 31, 23, 30).toISOString(),
        local(2027, 0, 1, 0, 30),
      ),
    ).toBe("Yesterday");
  });

  it("stays right on every day of the year, daylight saving included", () => {
    for (let day = 0; day < 365; day += 1) {
      const today = local(2026, 0, 1 + day, 12);
      const tomorrow = local(2026, 0, 2 + day, 0, 30);
      expect(dayLabel(tomorrow.toISOString(), today)).toBe("Tomorrow");
    }
  });

  it("defaults to the current time", () => {
    expect(dayLabel(new Date().toISOString())).toBe("Today");
  });
});

describe("startsIn", () => {
  const now = Date.parse("2026-11-09T09:00:00.000Z");
  const after = (ms: number) => new Date(now + ms).toISOString();

  it("says now for anything already started or under half a minute away", () => {
    expect(startsIn(after(0), now)).toBe("now");
    expect(startsIn(after(-5 * HOUR), now)).toBe("now");
    expect(startsIn(after(29_000), now)).toBe("now");
  });

  it("counts minutes inside the hour", () => {
    expect(startsIn(after(MINUTE), now)).toBe("in 1 minute");
    expect(startsIn(after(5 * MINUTE), now)).toBe("in 5 minutes");
    expect(startsIn(after(59 * MINUTE), now)).toBe("in 59 minutes");
  });

  it("shows hours and minutes inside the day", () => {
    expect(startsIn(after(HOUR), now)).toBe("in 1 hour");
    expect(startsIn(after(2 * HOUR + 14 * MINUTE), now)).toBe(
      "in 2 hours 14 minutes",
    );
    expect(startsIn(after(23 * HOUR + 59 * MINUTE), now)).toBe(
      "in 23 hours 59 minutes",
    );
  });

  it("rolls 59.6 minutes up into an hour, not 60 minutes", () => {
    expect(startsIn(after(59 * MINUTE + 36_000), now)).toBe("in 1 hour");
  });

  it("switches to days at a full day, with the right plural", () => {
    expect(startsIn(after(DAY), now)).toBe("in 1 day");
    expect(startsIn(after(2 * DAY), now)).toBe("in 2 days");
    expect(startsIn(after(10 * DAY), now)).toBe("in 10 days");
  });

  it("defaults to the current time", () => {
    expect(startsIn(new Date(Date.now() + 5 * MINUTE).toISOString())).toBe(
      "in 5 minutes",
    );
  });
});

describe("toLocalInput", () => {
  it("writes the local wall clock in datetime-local form", () => {
    expect(toLocalInput(local(2026, 0, 5, 7, 3).toISOString())).toBe(
      "2026-01-05T07:03",
    );
    expect(toLocalInput(local(2026, 10, 19, 23, 59).toISOString())).toBe(
      "2026-11-19T23:59",
    );
  });

  it("round trips through fromLocalInput", () => {
    for (const date of [
      local(2026, 0, 1, 0, 0),
      local(2026, 5, 15, 12, 30),
      local(2026, 11, 31, 23, 59),
    ]) {
      const iso = date.toISOString();
      expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    }
  });

  it("drops seconds, since the input only holds minutes", () => {
    const withSeconds = new Date(2026, 5, 15, 12, 30, 45, 500).toISOString();
    expect(fromLocalInput(toLocalInput(withSeconds))).toBe(
      local(2026, 5, 15, 12, 30).toISOString(),
    );
  });
});

describe("whenPhrase", () => {
  const now = local(2026, 10, 9, 12, 0);
  const clock = (date: Date) =>
    date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  it("reads as part of a sentence", () => {
    const today = local(2026, 10, 9, 15, 30);
    expect(whenPhrase(today.toISOString(), now)).toBe(
      `today at ${clock(today)}`,
    );
    const tomorrow = local(2026, 10, 10, 9, 0);
    expect(whenPhrase(tomorrow.toISOString(), now)).toBe(
      `tomorrow at ${clock(tomorrow)}`,
    );
  });

  it("says on for dates further away", () => {
    const later = local(2026, 10, 20, 9, 0);
    expect(whenPhrase(later.toISOString(), now)).toBe(
      `on ${dayLabel(later.toISOString(), now)} at ${clock(later)}`,
    );
  });
});

describe("statusSentence", () => {
  const now = local(2026, 10, 9, 12, 0);
  const base = {
    startedAt: null,
    endedAt: null,
    createdAt: local(2026, 10, 1).toISOString(),
  };
  const draftAt = (ms: number) => ({
    ...base,
    status: "draft" as const,
    startsAt: new Date(now.getTime() + ms).toISOString(),
  });

  it("names when Stand-in joins a scheduled call", () => {
    expect(statusSentence(draftAt(2 * HOUR), now)).toMatch(
      /^Scheduled\. Stand-in joins today at .+\.$/,
    );
  });

  it("says a call is starting inside the join window", () => {
    expect(statusSentence(draftAt(0), now)).toBe(
      "Starting now. Stand-in should join within a minute.",
    );
    expect(statusSentence(draftAt(-15 * MINUTE), now)).toBe(
      "Starting now. Stand-in should join within a minute.",
    );
  });

  it("says a call was missed once the join window has passed", () => {
    const missed = draftAt(-16 * MINUTE);
    expect(wasMissed(missed, now)).toBe(true);
    expect(statusSentence(missed, now)).toMatch(
      /^Missed\. Stand-in did not join today at .+\.$/,
    );
  });

  it("describes a call in progress", () => {
    expect(statusSentence({ ...draftAt(-HOUR), status: "live" }, now)).toBe(
      "Stand-in is in this call now.",
    );
  });

  it("uses the actual end time of a finished call", () => {
    const endedAt = local(2026, 10, 8, 9, 30).toISOString();
    expect(
      statusSentence({ ...draftAt(-DAY), status: "ended", endedAt }, now),
    ).toBe(`Finished ${whenPhrase(endedAt, now)}.`);
  });

  it("falls back to the booked start for a finished call with no end", () => {
    const meeting = { ...draftAt(-DAY), status: "ended" as const };
    expect(statusSentence(meeting, now)).toBe(
      `Finished ${whenPhrase(meeting.startsAt, now)}.`,
    );
  });

  it("never counts a live or finished call as missed", () => {
    const old = draftAt(-DAY);
    expect(wasMissed({ ...old, status: "live" }, now)).toBe(false);
    expect(wasMissed({ ...old, status: "ended" }, now)).toBe(false);
  });
});

describe("outcomeSentence", () => {
  it("reports notes and waiting questions with the right plural", () => {
    expect(outcomeSentence(true, 0)).toBe("Notes ready.");
    expect(outcomeSentence(true, 1)).toBe("Notes ready, 1 question for you.");
    expect(outcomeSentence(true, 2)).toBe("Notes ready, 2 questions for you.");
    expect(outcomeSentence(false, 0)).toBe("Notes not written yet.");
  });
});

describe("plural", () => {
  it("adds an s except for one", () => {
    expect(plural(0, "to-do")).toBe("0 to-dos");
    expect(plural(1, "to-do")).toBe("1 to-do");
  });
});

describe("parseNotes", () => {
  it("turns headings and dashes into blocks", () => {
    expect(
      parseNotes(
        "Decisions\n- Launch Friday\n- Tom owns it\n\nKey points\n- Budget held",
      ),
    ).toEqual([
      { kind: "heading", text: "Decisions" },
      { kind: "bullets", items: ["Launch Friday", "Tom owns it"] },
      { kind: "heading", text: "Key points" },
      { kind: "bullets", items: ["Budget held"] },
    ]);
  });

  it("cleans up markdown headings and trailing colons", () => {
    expect(parseNotes("## Decisions:\n* Ship it")).toEqual([
      { kind: "heading", text: "Decisions" },
      { kind: "bullets", items: ["Ship it"] },
    ]);
  });

  it("keeps full sentences as paragraphs", () => {
    expect(parseNotes("The team agreed to ship on Friday.")).toEqual([
      { kind: "paragraph", text: "The team agreed to ship on Friday." },
    ]);
  });

  it("returns nothing for blank notes", () => {
    expect(parseNotes("\n  \n")).toEqual([]);
  });
});

describe("briefingProblem", () => {
  const now = Date.parse("2026-11-09T09:00:00.000Z");
  const good = {
    title: "Launch sync",
    meetUrl: "https://meet.google.com/abc-defg-hij",
    ownerName: "Maya",
    startsAt: new Date(now + MINUTE).toISOString(),
  };

  it("accepts a complete briefing", () => {
    expect(briefingProblem(good, true, now)).toBeNull();
  });

  it("explains a link that isn't Google Meet", () => {
    expect(
      briefingProblem({ ...good, meetUrl: "https://zoom.us/j/1" }, true, now),
    ).toContain("isn't a Google Meet link");
  });

  it("treats a name of only spaces as blank", () => {
    expect(briefingProblem({ ...good, title: "  " }, true, now)).toBe(
      "Give this call a name.",
    );
    expect(briefingProblem({ ...good, ownerName: " " }, true, now)).toBe(
      "Add your name.",
    );
  });

  it("refuses a past time only when the time has to be in the future", () => {
    const past = { ...good, startsAt: new Date(now - MINUTE).toISOString() };
    expect(briefingProblem(past, true, now)).toBe("Pick a time in the future.");
    expect(briefingProblem(past, false, now)).toBeNull();
  });
});

describe("refreshEvery", () => {
  const now = local(2026, 10, 9, 12, 0);
  const at = (ms: number) => new Date(now.getTime() + ms).toISOString();
  const draft = (startsIn: number) => ({
    status: "draft" as const,
    startsAt: at(startsIn),
    startedAt: null,
    endedAt: null,
    createdAt: at(-DAY),
    notes: null,
  });
  const ended = (endedAgo: number, notes: string | null) => ({
    ...draft(-HOUR),
    status: "ended" as const,
    endedAt: at(-endedAgo),
    notes,
  });

  it("keeps a live call fresh", () => {
    expect(refreshEvery({ ...draft(0), status: "live" }, true, now)).toBe(4000);
  });

  it("waits for the join window instead of polling a scheduled call", () => {
    expect(refreshEvery(draft(2 * HOUR), false, now)).toBe(2 * HOUR - MINUTE);
    expect(refreshEvery(draft(30 * DAY), false, now)).toBe(DAY);
  });

  it("polls a scheduled call while Stand-in can still join", () => {
    expect(refreshEvery(draft(30_000), false, now)).toBe(4000);
    expect(refreshEvery(draft(-15 * MINUTE), false, now)).toBe(4000);
  });

  it("stops once a call was missed", () => {
    expect(refreshEvery(draft(-16 * MINUTE), false, now)).toBe(false);
  });

  it("polls a finished call only while its notes are due", () => {
    expect(refreshEvery(ended(2 * MINUTE, null), true, now)).toBe(4000);
    expect(refreshEvery(ended(11 * MINUTE, null), true, now)).toBe(false);
    expect(refreshEvery(ended(2 * MINUTE, null), false, now)).toBe(false);
    expect(refreshEvery(ended(2 * MINUTE, "Decisions"), true, now)).toBe(false);
  });
});

describe("someoneElseSpoke", () => {
  it("ignores Stand-in's own lines", () => {
    expect(someoneElseSpoke([{ speaker: "Stand-in" }])).toBe(false);
    expect(
      someoneElseSpoke([{ speaker: "Stand-in" }, { speaker: "Maya" }]),
    ).toBe(true);
  });
});
