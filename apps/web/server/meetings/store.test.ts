import { isActionContractError } from "@agent-native/core/action";
import { beforeAll, describe, expect, it } from "vitest";

import migrations from "../plugins/db";
import {
  answerQuestion,
  claimNextLine,
  createMeeting,
  createQuestion,
  deleteMeeting,
  dueMeetings,
  finishMeeting,
  getMeeting,
  getMeetingDetail,
  leaveAt,
  listFollowUps,
  listMeetings,
  queueLine,
  releaseLine,
  saveNotes,
  startMeeting,
  updateActionItem,
} from "./store";

const MAYA = "maya@example.com";
const TOM = "tom@example.com";

const briefing = {
  title: "Launch sync",
  ownerName: "Maya",
  meetUrl: "https://meet.google.com/abc-defg-hij",
  agenda: "",
  mayShare: "",
  mustAsk: "",
  startsAt: "2026-11-09T09:00:00.000Z",
  durationMinutes: 30,
};

const at = (iso: string) => Date.parse(iso);

async function errorCodeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (isActionContractError(error)) return error.errorCode;
    throw error;
  }
  return null;
}

async function liveMeeting() {
  const id = await createMeeting(MAYA, briefing);
  await startMeeting(MAYA, id);
  return getMeeting(MAYA, id);
}

beforeAll(async () => {
  await (migrations as unknown as (app: null) => Promise<void>)(null);
});

describe("meeting store", () => {
  it("keeps each person's meetings private", async () => {
    const id = await createMeeting(MAYA, briefing);
    expect(await errorCodeOf(getMeeting(TOM, id))).toBe("not_found");
    expect(await errorCodeOf(deleteMeeting(TOM, id))).toBe("not_found");
  });

  it("starts once, treats a rejoin as already live, and never reopens", async () => {
    const id = await createMeeting(MAYA, briefing);
    expect(await startMeeting(MAYA, id)).toBe(true);
    expect(await startMeeting(MAYA, id)).toBe(false);
    expect(await finishMeeting(MAYA, id)).toBe(true);
    expect(await finishMeeting(MAYA, id)).toBe(false);
    expect(await errorCodeOf(startMeeting(MAYA, id))).toBe("conflict");
  });

  it("won't finish a call that never started", async () => {
    const id = await createMeeting(MAYA, briefing);
    expect(await errorCodeOf(finishMeeting(MAYA, id))).toBe("conflict");
  });

  it("hands each queued line to exactly one caller", async () => {
    const meeting = await liveMeeting();
    await queueLine(meeting, "Hi, I'm Maya's AI stand-in.");
    const claims = await Promise.all([
      claimNextLine(meeting),
      claimNextLine(meeting),
      claimNextLine(meeting),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const { transcript } = await getMeetingDetail(MAYA, meeting.id);
    expect(transcript.map((line) => line.body)).toEqual([
      "Hi, I'm Maya's AI stand-in.",
    ]);
  });

  it("answers a question only once", async () => {
    const meeting = await liveMeeting();
    await createQuestion(meeting, "Priya", "Can we move to Friday?", ["Yes"]);
    const [question] = (await getMeetingDetail(MAYA, meeting.id)).questions;
    await answerQuestion(MAYA, question!.id, "Yes, Friday works.");
    expect(await errorCodeOf(answerQuestion(MAYA, question!.id, "No"))).toBe(
      "conflict",
    );
    expect(await errorCodeOf(answerQuestion(TOM, question!.id, "No"))).toBe(
      "not_found",
    );
  });

  it("saves notes, then moves action items through their states", async () => {
    const meeting = await liveMeeting();
    await saveNotes(MAYA, meeting.id, "Decisions\n- Launch Friday", [
      { body: "Update the press list", assignee: "Tom" },
    ]);
    const [item] = (await getMeetingDetail(MAYA, meeting.id)).actionItems;
    expect(item).toMatchObject({ status: "proposed", assignee: "Tom" });
    expect(
      (await updateActionItem(MAYA, item!.id, { event: "approve" })).status,
    ).toBe("approved");
    expect(
      await errorCodeOf(updateActionItem(MAYA, item!.id, { event: "approve" })),
    ).toBe("conflict");
    expect(
      (await updateActionItem(MAYA, item!.id, { event: "reopen" })).status,
    ).toBe("proposed");
  });

  it("deletes a meeting with everything in it", async () => {
    const meeting = await liveMeeting();
    await queueLine(meeting, "Hello");
    await claimNextLine(meeting);
    await finishMeeting(MAYA, meeting.id);
    await deleteMeeting(MAYA, meeting.id);
    expect(await errorCodeOf(getMeeting(MAYA, meeting.id))).toBe("not_found");
  });

  it("finds calls due to join, a minute early up to fifteen minutes late", async () => {
    const id = await createMeeting("dana@example.com", briefing);
    expect(
      (await dueMeetings("dana@example.com", at("2026-11-09T08:58:00Z"))).due,
    ).toEqual([]);
    expect(
      (await dueMeetings("dana@example.com", at("2026-11-09T08:59:30Z"))).due,
    ).toEqual([{ id, meetUrl: briefing.meetUrl }]);
    expect(
      (await dueMeetings("dana@example.com", at("2026-11-09T09:20:00Z"))).due,
    ).toEqual([]);
    expect(
      (await dueMeetings("dana@example.com", at("2026-11-08T21:00:00Z")))
        .nextStartsAt,
    ).toBe(briefing.startsAt);
    expect((await dueMeetings(TOM, at("2026-11-09T09:00:00Z"))).due).toEqual(
      [],
    );
  });

  it("leaves ten minutes after the booked end", async () => {
    const meeting = await getMeeting(MAYA, await createMeeting(MAYA, briefing));
    expect(leaveAt(meeting)).toBe("2026-11-09T09:40:00.000Z");
  });

  it("gives up on a line the voice service keeps rejecting", async () => {
    const meeting = await liveMeeting();
    await queueLine(meeting, "Hello");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const line = await claimNextLine(meeting);
      expect(line).not.toBeNull();
      await releaseLine(line!);
    }
    expect(await claimNextLine(meeting)).toBeNull();
  });

  it("lists questions left for the owner once the call is over", async () => {
    const meeting = await liveMeeting();
    await createQuestion(meeting, "Priya", "Can we cut the budget?", []);
    expect((await listFollowUps(MAYA)).followUps).not.toContainEqual(
      expect.objectContaining({ body: "Can we cut the budget?" }),
    );
    await finishMeeting(MAYA, meeting.id);
    expect((await listFollowUps(MAYA)).followUps).toContainEqual(
      expect.objectContaining({
        askedBy: "Priya",
        meetingTitle: "Launch sync",
      }),
    );
  });

  it("won't delete a call that's still live", async () => {
    const meeting = await liveMeeting();
    expect(await errorCodeOf(deleteMeeting(MAYA, meeting.id))).toBe("conflict");
  });
});

describe("paging", () => {
  let ownerNumber = 0;
  const newOwner = () => `paging-${(ownerNumber += 1)}@example.com`;
  const hourOf = (hour: number) =>
    new Date(Date.UTC(2036, 10, 20, hour)).toISOString();

  const titled = (owner: string, title: string, startsAt: string) =>
    createMeeting(owner, { ...briefing, title, startsAt });

  async function finishedCall(owner: string, title: string, startsAt: string) {
    const id = await titled(owner, title, startsAt);
    await startMeeting(owner, id);
    await finishMeeting(owner, id);
    return id;
  }

  async function callWithQuestions(owner: string, asked: string[]) {
    const id = await titled(owner, "Launch sync", hourOf(9));
    await startMeeting(owner, id);
    const meeting = await getMeeting(owner, id);
    for (const body of asked) await createQuestion(meeting, "Priya", body, []);
    await finishMeeting(owner, id);
    return id;
  }

  const titles = (page: { meetings: { title: string }[] }) =>
    page.meetings.map((meeting) => meeting.title);

  it("lists past calls newest first and walks every page once", async () => {
    const owner = newOwner();
    for (const hour of [1, 2, 3, 4, 5]) {
      await finishedCall(owner, `Call ${hour}`, hourOf(hour));
    }
    const first = await listMeetings(owner, { view: "past", limit: 2 });
    const second = await listMeetings(owner, {
      view: "past",
      limit: 2,
      offset: 2,
    });
    const last = await listMeetings(owner, {
      view: "past",
      limit: 2,
      offset: 4,
    });
    expect(titles(first)).toEqual(["Call 5", "Call 4"]);
    expect(first.hasMore).toBe(true);
    expect(titles(second)).toEqual(["Call 3", "Call 2"]);
    expect(second.hasMore).toBe(true);
    expect(titles(last)).toEqual(["Call 1"]);
    expect(last.hasMore).toBe(false);
  });

  it("has no more when the rows exactly fill the page", async () => {
    const owner = newOwner();
    await finishedCall(owner, "One", hourOf(1));
    await finishedCall(owner, "Two", hourOf(2));
    expect(await listMeetings(owner, { view: "past", limit: 2 })).toMatchObject(
      { hasMore: false, meetings: [{}, {}] },
    );
  });

  it("returns an empty page past the end", async () => {
    const owner = newOwner();
    await finishedCall(owner, "One", hourOf(1));
    expect(
      await listMeetings(owner, { view: "past", limit: 2, offset: 5 }),
    ).toEqual({ meetings: [], hasMore: false });
  });

  it("puts calls in progress first, then the soonest scheduled call", async () => {
    const owner = newOwner();
    await titled(owner, "Later", hourOf(9));
    await titled(owner, "Soonest", hourOf(7));
    await finishedCall(owner, "Over", hourOf(1));
    const live = await titled(owner, "In progress", hourOf(12));
    await startMeeting(owner, live);
    const upcoming = await listMeetings(owner, { view: "upcoming" });
    expect(titles(upcoming)).toEqual(["In progress", "Soonest", "Later"]);
    expect(titles(await listMeetings(owner, { view: "past" }))).toEqual([
      "Over",
    ]);
  });

  it("moves a call to missed once its join window has closed", async () => {
    const owner = newOwner();
    const now = Date.parse(hourOf(12));
    const minutesAgo = (minutes: number) =>
      new Date(now - minutes * 60_000).toISOString();
    await titled(owner, "Just closed", minutesAgo(16));
    await titled(owner, "Older", minutesAgo(120));
    await titled(owner, "Still open", minutesAgo(15));
    const joined = await titled(owner, "Joined late", minutesAgo(120));
    await startMeeting(owner, joined);
    await finishedCall(owner, "Over", minutesAgo(180));
    expect(titles(await listMeetings(owner, { view: "missed", now }))).toEqual([
      "Just closed",
      "Older",
    ]);
    expect(
      titles(await listMeetings(owner, { view: "upcoming", now })),
    ).toEqual(["Joined late", "Still open"]);
  });

  it("doesn't repeat or drop calls that start at the same time", async () => {
    const owner = newOwner();
    const ids: string[] = [];
    for (let call = 0; call < 7; call += 1) {
      ids.push(await titled(owner, `Call ${call}`, hourOf(9)));
    }
    const seen: string[] = [];
    for (let offset = 0; offset < 7; offset += 3) {
      const page = await listMeetings(owner, { limit: 3, offset });
      seen.push(...page.meetings.map((meeting) => meeting.id));
    }
    expect(seen).toHaveLength(7);
    expect(new Set(seen)).toEqual(new Set(ids));
  });

  it("only returns the owner's own meetings", async () => {
    const owner = newOwner();
    await titled(owner, "Mine", hourOf(9));
    await titled(newOwner(), "Someone else's", hourOf(8));
    expect(titles(await listMeetings(owner))).toEqual(["Mine"]);
  });

  it("counts the questions still waiting on each call", async () => {
    const owner = newOwner();
    const id = await callWithQuestions(owner, ["First?", "Second?"]);
    await finishedCall(owner, "Quiet", hourOf(1));
    const [question] = (await getMeetingDetail(owner, id)).questions;
    await answerQuestion(owner, question!.id, "Yes.");
    const { meetings } = await listMeetings(owner, { view: "past" });
    expect(
      meetings.map((meeting) => [meeting.title, meeting.waitingQuestions]),
    ).toEqual([
      ["Launch sync", 1],
      ["Quiet", 0],
    ]);
  });

  it("walks follow-ups a page at a time", async () => {
    const owner = newOwner();
    await callWithQuestions(owner, ["One?", "Two?", "Three?"]);
    const first = await listFollowUps(owner, { limit: 2 });
    const rest = await listFollowUps(owner, { limit: 2, offset: 2 });
    expect(first.followUps).toHaveLength(2);
    expect(first.hasMore).toBe(true);
    expect(rest.followUps).toHaveLength(1);
    expect(rest.hasMore).toBe(false);
    expect(
      new Set([...first.followUps, ...rest.followUps].map((row) => row.body)),
    ).toEqual(new Set(["One?", "Two?", "Three?"]));
  });

  it("keeps follow-ups private", async () => {
    await callWithQuestions(newOwner(), ["Private?"]);
    expect(await listFollowUps(newOwner())).toEqual({
      followUps: [],
      hasMore: false,
    });
  });
});
