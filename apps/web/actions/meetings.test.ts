import {
  type ActionCaller,
  isActionContractError,
} from "@agent-native/core/action";
import {
  readAppState,
  writeAppStateForCurrentTab,
} from "@agent-native/core/application-state";
import { asc, eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getDb, schema } from "../server/db/index.js";
import { speechProvider } from "../server/lib/providers/speech.js";
import {
  approveSpokenEdits,
  approveWhenModelCalls,
} from "../server/meetings/approval.js";
import { emitMeetingEnded } from "../server/meetings/events.js";
import { addNotesAutomation } from "../server/meetings/notes-automation.js";
import { notifyOwner } from "../server/meetings/notify-owner.js";
import { respondToLine } from "../server/meetings/responder.js";
import {
  createMeeting,
  createQuestion,
  getMeeting,
  getMeetingDetail,
  listMeetings,
  queueLine,
  saveNotes,
  startMeeting,
} from "../server/meetings/store.js";
import migrations from "../server/plugins/db.js";
import { STAND_IN_SPEAKER } from "../shared/meetings.js";
import { introduction } from "../shared/spoken.js";
import addTranscriptLineAction from "./add-transcript-line";
import answerQuestionAction from "./answer-question";
import createMeetingAction from "./create-meeting";
import deleteMeetingAction from "./delete-meeting";
import dueMeetingsAction from "./due-meetings";
import finishMeetingAction from "./finish-meeting";
import getMeetingAction from "./get-meeting";
import joinMeetingNowAction from "./join-meeting-now";
import listFollowUpsAction from "./list-follow-ups";
import listMeetingsAction from "./list-meetings";
import nextUtteranceAction from "./next-utterance";
import saveMeetingNotesAction from "./save-meeting-notes";
import startMeetingAction from "./start-meeting";
import updateActionItemAction from "./update-action-item";
import updateMeetingAction from "./update-meeting";
import viewScreenAction from "./view-screen";

vi.mock("zod", async (importOriginal) => {
  const actual = await importOriginal<typeof import("zod")>();
  return { ...actual, z: actual.default };
});

vi.mock("../server/meetings/events.js", () => ({
  MEETING_ENDED: "meeting.ended",
  emitMeetingEnded: vi.fn(),
}));

vi.mock("../server/lib/providers/speech.js", () => ({
  speechProvider: vi.fn(),
}));

vi.mock("../server/meetings/notify-owner.js", () => ({ notifyOwner: vi.fn() }));

vi.mock("@agent-native/core/application-state", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@agent-native/core/application-state")
  >()),
  readAppState: vi.fn(),
  writeAppStateForCurrentTab: vi.fn(),
}));

vi.mock("../server/meetings/notes-automation.js", () => ({
  addNotesAutomation: vi.fn(),
}));

vi.mock("../server/meetings/responder.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/meetings/responder.js")>()),
  respondToLine: vi.fn(),
}));

const MEET_LINK = "https://meet.google.com/abc-defg-hij";
const STARTS_AT = "2036-11-09T09:00:00.000Z";

const briefing = {
  title: "Launch sync",
  ownerName: "Maya",
  meetUrl: MEET_LINK,
  agenda: "",
  mayShare: "",
  mustAsk: "",
  startsAt: STARTS_AT,
  durationMinutes: 30,
};

const createArgs = {
  title: "Launch sync",
  ownerName: "Maya",
  meetUrl: MEET_LINK,
  startsAt: STARTS_AT,
};

let userNumber = 0;

const newUser = () => {
  userNumber += 1;
  return `user-${userNumber}@example.com`;
};

const signedInAs = (userEmail: string, caller: ActionCaller = "frontend") => ({
  userEmail,
  caller,
});

const SIGNED_OUT = { caller: "http" } as const;

async function errorCodeOf(promise: unknown) {
  try {
    await promise;
  } catch (error) {
    if (isActionContractError(error)) return error.errorCode;
    throw error;
  }
  return null;
}

const draftMeeting = (owner: string) => createMeeting(owner, briefing);

async function liveMeeting(owner: string) {
  const id = await draftMeeting(owner);
  await startMeeting(owner, id);
  return getMeeting(owner, id);
}

async function liveMeetingWithQuestion(owner: string) {
  const meeting = await liveMeeting(owner);
  await createQuestion(meeting, "Priya", "Can we move to Friday?", ["Yes"]);
  const [question] = (await getMeetingDetail(owner, meeting.id)).questions;
  return { meeting, question: question! };
}

const queuedRows = (meetingId: string) =>
  getDb()
    .select()
    .from(schema.utterances)
    .where(eq(schema.utterances.meetingId, meetingId))
    .orderBy(asc(schema.utterances.createdAt));

const queuedBodies = async (meetingId: string) =>
  (await queuedRows(meetingId)).map((row) => row.body);

const synthesize = vi.fn();

beforeAll(async () => {
  await (migrations as unknown as (app: null) => Promise<void>)(null);
});

beforeEach(() => {
  vi.mocked(emitMeetingEnded).mockReset();
  vi.mocked(addNotesAutomation).mockReset();
  vi.mocked(respondToLine).mockReset();
  vi.mocked(respondToLine).mockResolvedValue(undefined);
  synthesize.mockReset();
  vi.mocked(speechProvider).mockReset();
  vi.mocked(speechProvider).mockReturnValue({ synthesize });
});

describe("a signed-out caller", () => {
  const someId = "00000000-0000-0000-0000-000000000000";

  it.each([
    ["list-meetings", () => listMeetingsAction.run({}, SIGNED_OUT)],
    ["get-meeting", () => getMeetingAction.run({ id: someId }, SIGNED_OUT)],
    ["list-follow-ups", () => listFollowUpsAction.run({}, SIGNED_OUT)],
    ["due-meetings", () => dueMeetingsAction.run({}, SIGNED_OUT)],
    ["create-meeting", () => createMeetingAction.run(createArgs, SIGNED_OUT)],
    [
      "update-meeting",
      () => updateMeetingAction.run({ id: someId, title: "X" }, SIGNED_OUT),
    ],
    [
      "delete-meeting",
      () => deleteMeetingAction.run({ id: someId }, SIGNED_OUT),
    ],
    ["start-meeting", () => startMeetingAction.run({ id: someId }, SIGNED_OUT)],
    [
      "finish-meeting",
      () => finishMeetingAction.run({ id: someId }, SIGNED_OUT),
    ],
    [
      "add-transcript-line",
      () =>
        addTranscriptLineAction.run(
          { meetingId: someId, speaker: "Priya", body: "Hi" },
          SIGNED_OUT,
        ),
    ],
    [
      "next-utterance",
      () => nextUtteranceAction.run({ meetingId: someId }, SIGNED_OUT),
    ],
    [
      "answer-question",
      () => answerQuestionAction.run({ id: someId, answer: "Yes" }, SIGNED_OUT),
    ],
    [
      "save-meeting-notes",
      () =>
        saveMeetingNotesAction.run(
          { id: someId, notes: "Decisions", actionItems: [] },
          SIGNED_OUT,
        ),
    ],
    [
      "update-action-item",
      () =>
        updateActionItemAction.run(
          { id: someId, event: "approve" },
          SIGNED_OUT,
        ),
    ],
  ])("is rejected by %s", async (_name, call) => {
    expect(await errorCodeOf(call())).toBe("unauthenticated");
  });

  it("is rejected with a blank email too", async () => {
    expect(
      await errorCodeOf(
        listMeetingsAction.run({}, { userEmail: "", caller: "http" }),
      ),
    ).toBe("unauthenticated");
  });

  it("is rejected with a no-context call", async () => {
    expect(await errorCodeOf(listMeetingsAction.run({}))).toBe(
      "unauthenticated",
    );
  });

  it("creates nothing", async () => {
    const before = (await getDb().select().from(schema.meetings)).length;
    await errorCodeOf(createMeetingAction.run(createArgs, SIGNED_OUT));
    expect((await getDb().select().from(schema.meetings)).length).toBe(before);
    expect(addNotesAutomation).not.toHaveBeenCalled();
  });
});

describe("one user's data, seen from another account", () => {
  let maya: string;
  let tom: string;
  let tomCtx: ReturnType<typeof signedInAs>;

  beforeEach(() => {
    maya = newUser();
    tom = newUser();
    tomCtx = signedInAs(tom);
  });

  it("can't be read", async () => {
    const id = await draftMeeting(maya);
    expect(await errorCodeOf(getMeetingAction.run({ id }, tomCtx))).toBe(
      "not_found",
    );
    expect(await listMeetingsAction.run({}, tomCtx)).toEqual({
      meetings: [],
      hasMore: false,
    });
  });

  it("doesn't show up in follow-ups", async () => {
    const { meeting } = await liveMeetingWithQuestion(maya);
    await finishMeetingAction.run({ id: meeting.id }, signedInAs(maya));
    expect(await listFollowUpsAction.run({}, tomCtx)).toEqual({
      followUps: [],
      hasMore: false,
    });
    expect(
      (await listFollowUpsAction.run({}, signedInAs(maya))).followUps,
    ).toHaveLength(1);
  });

  it("doesn't show up as due", async () => {
    await createMeeting(maya, {
      ...briefing,
      startsAt: new Date().toISOString(),
    });
    expect(
      (await dueMeetingsAction.run({}, signedInAs(maya))).due,
    ).toHaveLength(1);
    expect((await dueMeetingsAction.run({}, tomCtx)).due).toEqual([]);
  });

  it("can't be edited", async () => {
    const id = await draftMeeting(maya);
    expect(
      await errorCodeOf(
        updateMeetingAction.run({ id, title: "Hijacked" }, tomCtx),
      ),
    ).toBe("not_found");
    expect((await getMeeting(maya, id)).title).toBe("Launch sync");
  });

  it("can't have its notes replaced", async () => {
    const meeting = await liveMeeting(maya);
    await saveNotes(maya, meeting.id, "Real notes", [{ body: "Real item" }]);
    expect(
      await errorCodeOf(
        saveMeetingNotesAction.run(
          { id: meeting.id, notes: "Forged", actionItems: [] },
          tomCtx,
        ),
      ),
    ).toBe("not_found");
    const detail = await getMeetingDetail(maya, meeting.id);
    expect(detail.meeting.notes).toBe("Real notes");
    expect(detail.actionItems).toHaveLength(1);
  });

  it("can't have its action items changed", async () => {
    const meeting = await liveMeeting(maya);
    await saveNotes(maya, meeting.id, "Notes", [{ body: "Real item" }]);
    const [item] = (await getMeetingDetail(maya, meeting.id)).actionItems;
    expect(
      await errorCodeOf(
        updateActionItemAction.run({ id: item!.id, event: "approve" }, tomCtx),
      ),
    ).toBe("not_found");
    expect(
      await errorCodeOf(
        updateActionItemAction.run({ id: item!.id, body: "Forged" }, tomCtx),
      ),
    ).toBe("not_found");
    const [after] = (await getMeetingDetail(maya, meeting.id)).actionItems;
    expect(after).toMatchObject({ status: "proposed", body: "Real item" });
  });

  it("can't be started", async () => {
    const id = await draftMeeting(maya);
    expect(await errorCodeOf(startMeetingAction.run({ id }, tomCtx))).toBe(
      "not_found",
    );
    expect((await getMeeting(maya, id)).status).toBe("draft");
    expect(await queuedBodies(id)).toEqual([]);
  });

  it("can't be finished", async () => {
    const meeting = await liveMeeting(maya);
    expect(
      await errorCodeOf(finishMeetingAction.run({ id: meeting.id }, tomCtx)),
    ).toBe("not_found");
    expect((await getMeeting(maya, meeting.id)).status).toBe("live");
    expect(emitMeetingEnded).not.toHaveBeenCalled();
  });

  it("can't be deleted", async () => {
    const id = await draftMeeting(maya);
    expect(await errorCodeOf(deleteMeetingAction.run({ id }, tomCtx))).toBe(
      "not_found",
    );
    expect((await getMeeting(maya, id)).id).toBe(id);
  });

  it("can't have its questions answered", async () => {
    const { meeting, question } = await liveMeetingWithQuestion(maya);
    expect(
      await errorCodeOf(
        answerQuestionAction.run({ id: question.id, answer: "No" }, tomCtx),
      ),
    ).toBe("not_found");
    const [after] = (await getMeetingDetail(maya, meeting.id)).questions;
    expect(after).toMatchObject({ status: "pending", answer: null });
    expect(await queuedBodies(meeting.id)).toEqual([]);
  });

  it("can't take the next line to speak", async () => {
    const meeting = await liveMeeting(maya);
    await queueLine(meeting, "Private line");
    expect(
      await errorCodeOf(
        nextUtteranceAction.run({ meetingId: meeting.id }, tomCtx),
      ),
    ).toBe("not_found");
    expect(synthesize).not.toHaveBeenCalled();
    expect((await queuedRows(meeting.id))[0]!.status).toBe("queued");
  });

  it("can't add to the transcript", async () => {
    const meeting = await liveMeeting(maya);
    expect(
      await errorCodeOf(
        addTranscriptLineAction.run(
          { meetingId: meeting.id, speaker: "Mallory", body: "Say this" },
          tomCtx,
        ),
      ),
    ).toBe("not_found");
    expect((await getMeetingDetail(maya, meeting.id)).transcript).toEqual([]);
    expect(respondToLine).not.toHaveBeenCalled();
  });
});

describe("list paging arguments", () => {
  it("defaults to the first 20 upcoming meetings", async () => {
    const owner = newUser();
    for (let call = 0; call < 21; call += 1) await draftMeeting(owner);
    const page = await listMeetingsAction.run({}, signedInAs(owner));
    expect(page.meetings).toHaveLength(20);
    expect(page.hasMore).toBe(true);
  });

  it("reads numbers sent as query string text", async () => {
    const owner = newUser();
    await draftMeeting(owner);
    await draftMeeting(owner);
    const page = await listMeetingsAction.run(
      { view: "upcoming", limit: "1", offset: "1" } as never,
      signedInAs(owner),
    );
    expect(page.meetings).toHaveLength(1);
    expect(page.hasMore).toBe(false);
  });

  it.each([
    ["a limit over 100", { limit: 101 }],
    ["a zero limit", { limit: 0 }],
    ["a negative offset", { offset: -1 }],
  ])("rejects %s", async (_label, args) => {
    const owner = newUser();
    await expect(
      listMeetingsAction.run(args, signedInAs(owner)),
    ).rejects.toThrow();
    await expect(
      listFollowUpsAction.run(args, signedInAs(owner)),
    ).rejects.toThrow();
  });

  it("rejects an unknown view", async () => {
    await expect(
      listMeetingsAction.run(
        { view: "archived" } as never,
        signedInAs(newUser()),
      ),
    ).rejects.toThrow();
  });
});

describe("create-meeting", () => {
  it.each([
    ["a Zoom link", "https://zoom.us/j/123456789"],
    ["plain http", "http://meet.google.com/abc-defg-hij"],
    ["a lookalike host", "https://meet.google.com.evil.example/abc-defg-hij"],
    ["a bad meeting code", "https://meet.google.com/abc"],
    ["an uppercase meeting code", "https://meet.google.com/ABC-DEFG-HIJ"],
    ["extra path segments", "https://meet.google.com/abc-defg-hij/extra"],
    ["not a link at all", "tomorrow at nine"],
  ])("rejects %s and creates nothing", async (_label, meetUrl) => {
    const owner = newUser();
    await expect(
      createMeetingAction.run({ ...createArgs, meetUrl }, signedInAs(owner)),
    ).rejects.toThrow(/meet\.google\.com/);
    expect((await listMeetings(owner)).meetings).toEqual([]);
    expect(addNotesAutomation).not.toHaveBeenCalled();
  });

  it("accepts a valid link and fills in the briefing defaults", async () => {
    const owner = newUser();
    const { id } = await createMeetingAction.run(createArgs, signedInAs(owner));
    expect(await getMeeting(owner, id)).toMatchObject({
      ownerEmail: owner,
      title: "Launch sync",
      ownerName: "Maya",
      meetUrl: MEET_LINK,
      status: "draft",
      agenda: "",
      mayShare: "",
      mustAsk: "",
      durationMinutes: 30,
      startsAt: STARTS_AT,
    });
  });

  it("accepts a link with a query string and trims whitespace", async () => {
    const owner = newUser();
    const meetUrl = `${MEET_LINK}?authuser=1`;
    const { id } = await createMeetingAction.run(
      { ...createArgs, title: "  Launch sync  ", meetUrl: ` ${meetUrl} ` },
      signedInAs(owner),
    );
    expect(await getMeeting(owner, id)).toMatchObject({
      meetUrl,
      title: "Launch sync",
    });
  });

  it("stores the start time in UTC, whatever offset it arrives with", async () => {
    const owner = newUser();
    const { id } = await createMeetingAction.run(
      { ...createArgs, startsAt: "2036-11-09T14:30:00+05:30" },
      signedInAs(owner),
    );
    expect((await getMeeting(owner, id)).startsAt).toBe(STARTS_AT);
  });

  it.each([
    ["too short", { durationMinutes: 4 }],
    ["too long", { durationMinutes: 241 }],
    ["a blank title", { title: "   " }],
    ["a start time without an offset", { startsAt: "2026-11-09T09:00:00" }],
  ])("rejects %s", async (_label, change) => {
    const owner = newUser();
    await expect(
      createMeetingAction.run({ ...createArgs, ...change }, signedInAs(owner)),
    ).rejects.toThrow();
    expect((await listMeetings(owner)).meetings).toEqual([]);
  });

  it("adds the notes automation only with the first meeting", async () => {
    const owner = newUser();
    await createMeetingAction.run(createArgs, signedInAs(owner));
    expect(addNotesAutomation).toHaveBeenCalledTimes(1);
    expect(addNotesAutomation).toHaveBeenCalledWith(owner);
    await createMeetingAction.run(createArgs, signedInAs(owner));
    expect(addNotesAutomation).toHaveBeenCalledTimes(1);
  });
});

describe("update-meeting", () => {
  it("changes only what was sent, and normalizes the start time", async () => {
    const owner = newUser();
    const id = await draftMeeting(owner);
    await updateMeetingAction.run(
      {
        id,
        agenda: "New agenda",
        durationMinutes: 45,
        startsAt: "2026-11-10T14:30:00+05:30",
      },
      signedInAs(owner),
    );
    expect(await getMeeting(owner, id)).toMatchObject({
      title: "Launch sync",
      agenda: "New agenda",
      durationMinutes: 45,
      startsAt: "2026-11-10T09:00:00.000Z",
    });
  });
});

describe("start-meeting", () => {
  it("queues the introduction on the first join only", async () => {
    const owner = newUser();
    const id = await draftMeeting(owner);
    await startMeetingAction.run({ id }, signedInAs(owner));
    const meeting = await getMeeting(owner, id);
    expect(meeting.status).toBe("live");
    expect(await queuedBodies(id)).toEqual([introduction(meeting)]);

    await startMeetingAction.run({ id }, signedInAs(owner));
    expect(await queuedBodies(id)).toEqual([introduction(meeting)]);
  });

  it("tells the extension when to leave, on a rejoin too", async () => {
    const owner = newUser();
    const id = await draftMeeting(owner);
    const expected = {
      id,
      leaveAt: "2036-11-09T09:40:00.000Z",
      letPeopleIn: false,
    };
    expect(await startMeetingAction.run({ id }, signedInAs(owner))).toEqual(
      expected,
    );
    expect(await startMeetingAction.run({ id }, signedInAs(owner))).toEqual(
      expected,
    );
  });

  it("won't reopen a finished call or queue anything for it", async () => {
    const owner = newUser();
    const id = await draftMeeting(owner);
    await startMeetingAction.run({ id }, signedInAs(owner));
    await finishMeetingAction.run({ id }, signedInAs(owner));
    const before = await queuedBodies(id);
    expect(
      await errorCodeOf(startMeetingAction.run({ id }, signedInAs(owner))),
    ).toBe("conflict");
    expect(await queuedBodies(id)).toEqual(before);
  });
});

describe("finish-meeting", () => {
  it("emits meeting.ended once someone other than Stand-in spoke", async () => {
    const owner = newUser();
    const meeting = await liveMeeting(owner);
    await addTranscriptLineAction.run(
      { meetingId: meeting.id, speaker: "Priya", body: "Hello" },
      signedInAs(owner),
    );
    expect(
      await finishMeetingAction.run({ id: meeting.id }, signedInAs(owner)),
    ).toEqual({ id: meeting.id });
    expect(emitMeetingEnded).toHaveBeenCalledTimes(1);
    expect(vi.mocked(emitMeetingEnded).mock.calls[0]![0]).toMatchObject({
      id: meeting.id,
      ownerEmail: owner,
      status: "ended",
    });
  });

  it("stays silent when only Stand-in spoke", async () => {
    const owner = newUser();
    const meeting = await liveMeeting(owner);
    await addTranscriptLineAction.run(
      { meetingId: meeting.id, speaker: STAND_IN_SPEAKER, body: "Hi, all." },
      signedInAs(owner),
    );
    await finishMeetingAction.run({ id: meeting.id }, signedInAs(owner));
    expect((await getMeeting(owner, meeting.id)).status).toBe("ended");
    expect(emitMeetingEnded).not.toHaveBeenCalled();
  });

  it("stays silent when nobody spoke", async () => {
    const owner = newUser();
    const meeting = await liveMeeting(owner);
    await finishMeetingAction.run({ id: meeting.id }, signedInAs(owner));
    expect(emitMeetingEnded).not.toHaveBeenCalled();
  });

  it("doesn't emit twice when the call is finished again", async () => {
    const owner = newUser();
    const meeting = await liveMeeting(owner);
    await addTranscriptLineAction.run(
      { meetingId: meeting.id, speaker: "Priya", body: "Hello" },
      signedInAs(owner),
    );
    await finishMeetingAction.run({ id: meeting.id }, signedInAs(owner));
    await finishMeetingAction.run({ id: meeting.id }, signedInAs(owner));
    expect(emitMeetingEnded).toHaveBeenCalledTimes(1);
  });

  it("refuses a call that never started, without emitting", async () => {
    const owner = newUser();
    const id = await draftMeeting(owner);
    expect(
      await errorCodeOf(finishMeetingAction.run({ id }, signedInAs(owner))),
    ).toBe("conflict");
    expect(emitMeetingEnded).not.toHaveBeenCalled();
  });
});

describe("answer-question", () => {
  it("records the answer during a live call without speaking it", async () => {
    const owner = newUser();
    const { meeting, question } = await liveMeetingWithQuestion(owner);
    await expect(
      answerQuestionAction.run(
        { id: question.id, answer: "  Yes, Friday works.  " },
        signedInAs(owner),
      ),
    ).resolves.toEqual({ id: question.id });
    expect(await queuedBodies(meeting.id)).toEqual([]);
    const [saved] = (await getMeetingDetail(owner, meeting.id)).questions;
    expect(saved).toMatchObject({
      status: "answered",
      answer: "Yes, Friday works.",
    });
    expect(saved!.answeredAt).toEqual(expect.any(String));
  });

  it("only records the reply once the call has ended", async () => {
    const owner = newUser();
    const { meeting, question } = await liveMeetingWithQuestion(owner);
    await finishMeetingAction.run({ id: meeting.id }, signedInAs(owner));
    await answerQuestionAction.run(
      { id: question.id, answer: "Yes." },
      signedInAs(owner),
    );
    expect(await queuedBodies(meeting.id)).toEqual([]);
    const [saved] = (await getMeetingDetail(owner, meeting.id)).questions;
    expect(saved).toMatchObject({ status: "answered", answer: "Yes." });
    expect(
      (await listFollowUpsAction.run({}, signedInAs(owner))).followUps,
    ).toEqual([]);
  });

  it("refuses a second answer to the same question", async () => {
    const owner = newUser();
    const { meeting, question } = await liveMeetingWithQuestion(owner);
    await answerQuestionAction.run(
      { id: question.id, answer: "Yes." },
      signedInAs(owner),
    );
    expect(
      await errorCodeOf(
        answerQuestionAction.run(
          { id: question.id, answer: "No." },
          signedInAs(owner),
        ),
      ),
    ).toBe("conflict");
    expect(await queuedBodies(meeting.id)).toEqual([]);
  });

  it("rejects a blank answer", async () => {
    const owner = newUser();
    const { meeting, question } = await liveMeetingWithQuestion(owner);
    await expect(
      answerQuestionAction.run(
        { id: question.id, answer: "   " },
        signedInAs(owner),
      ),
    ).rejects.toThrow();
    const [after] = (await getMeetingDetail(owner, meeting.id)).questions;
    expect(after!.status).toBe("pending");
  });
});

describe("next-utterance", () => {
  const audio = new Uint8Array([104, 105]);

  it("hands over the oldest line with its audio", async () => {
    const owner = newUser();
    const meeting = await liveMeeting(owner);
    await queueLine(meeting, "Hello there");
    synthesize.mockResolvedValueOnce({ audio, mimeType: "audio/mpeg" });
    await expect(
      nextUtteranceAction.run({ meetingId: meeting.id }, signedInAs(owner)),
    ).resolves.toEqual({
      line: {
        body: "Hello there",
        mimeType: "audio/mpeg",
        audioBase64: Buffer.from(audio).toString("base64"),
      },
    });
    expect(synthesize).toHaveBeenCalledWith("Hello there");
    expect((await queuedRows(meeting.id))[0]!.status).toBe("spoken");
    const { transcript } = await getMeetingDetail(owner, meeting.id);
    expect(transcript).toHaveLength(1);
    expect(transcript[0]).toMatchObject({
      speaker: STAND_IN_SPEAKER,
      body: "Hello there",
    });
  });

  it("returns no line when nothing is queued", async () => {
    const owner = newUser();
    const meeting = await liveMeeting(owner);
    await expect(
      nextUtteranceAction.run({ meetingId: meeting.id }, signedInAs(owner)),
    ).resolves.toEqual({ line: null });
    expect(speechProvider).not.toHaveBeenCalled();
  });

  it("puts the line back when speech synthesis fails", async () => {
    const owner = newUser();
    const meeting = await liveMeeting(owner);
    await queueLine(meeting, "Hello there");
    synthesize.mockRejectedValueOnce(new Error("Speech failed (503)"));

    await expect(
      nextUtteranceAction.run({ meetingId: meeting.id }, signedInAs(owner)),
    ).rejects.toThrow("Speech failed (503)");

    const [row] = await queuedRows(meeting.id);
    expect(row).toMatchObject({
      status: "queued",
      spokenAt: null,
      attempts: 1,
    });
    expect((await getMeetingDetail(owner, meeting.id)).transcript).toEqual([]);

    synthesize.mockResolvedValueOnce({ audio, mimeType: "audio/mpeg" });
    const retried = await nextUtteranceAction.run(
      { meetingId: meeting.id },
      signedInAs(owner),
    );
    expect(retried.line?.body).toBe("Hello there");
  });

  it("puts the line back when the voice service isn't configured", async () => {
    const owner = newUser();
    const meeting = await liveMeeting(owner);
    await queueLine(meeting, "Hello there");
    vi.mocked(speechProvider).mockImplementationOnce(() => {
      throw new Error("Set OPENROUTER_VOICE_API_KEY.");
    });
    await expect(
      nextUtteranceAction.run({ meetingId: meeting.id }, signedInAs(owner)),
    ).rejects.toThrow("OPENROUTER_VOICE_API_KEY");
    expect((await queuedRows(meeting.id))[0]!.status).toBe("queued");
  });

  it("refuses a call that isn't live", async () => {
    const owner = newUser();
    const id = await draftMeeting(owner);
    expect(
      await errorCodeOf(
        nextUtteranceAction.run({ meetingId: id }, signedInAs(owner)),
      ),
    ).toBe("conflict");
  });
});

describe("add-transcript-line", () => {
  it("stores the line and hands it to the responder", async () => {
    const owner = newUser();
    const meeting = await liveMeeting(owner);
    const { id } = await addTranscriptLineAction.run(
      { meetingId: meeting.id, speaker: " Priya ", body: " Any news? " },
      signedInAs(owner),
    );
    const { transcript } = await getMeetingDetail(owner, meeting.id);
    expect(transcript).toHaveLength(1);
    expect(transcript[0]).toMatchObject({
      id,
      speaker: "Priya",
      body: "Any news?",
    });
    expect(respondToLine).toHaveBeenCalledTimes(1);
    expect(vi.mocked(respondToLine).mock.calls[0]![1]).toBe(id);
  });

  it("refuses a call that isn't live", async () => {
    const owner = newUser();
    const id = await draftMeeting(owner);
    expect(
      await errorCodeOf(
        addTranscriptLineAction.run(
          { meetingId: id, speaker: "Priya", body: "Hi" },
          signedInAs(owner),
        ),
      ),
    ).toBe("conflict");
    expect(respondToLine).not.toHaveBeenCalled();
  });
});

describe("actions that need the owner's approval", () => {
  it.each([
    ["delete-meeting", deleteMeetingAction],
    ["finish-meeting", finishMeetingAction],
    ["join-meeting-now", joinMeetingNowAction],
  ])("%s asks for approval when a model calls it", (_name, action) => {
    expect(action.needsApproval).toBe(approveWhenModelCalls);
  });

  describe("update-meeting", () => {
    const edit = { mayShare: "New answer" };
    const asks = (id: string, owner: string, caller: ActionCaller) =>
      approveSpokenEdits({ id, ...edit }, signedInAs(owner, caller));

    it("uses the spoken edit gate", () => {
      expect(updateMeetingAction.needsApproval).toBe(approveSpokenEdits);
    });

    it("lets chat edit the words on a draft", async () => {
      const owner = newUser();
      expect(await asks(await draftMeeting(owner), owner, "tool")).toBe(false);
    });

    it("asks chat before editing the words on a live call", async () => {
      const owner = newUser();
      expect(await asks((await liveMeeting(owner)).id, owner, "tool")).toBe(
        true,
      );
    });

    it.each(["automation", "mcp", "webmcp", "a2a", "cli"] as const)(
      "always asks a %s caller, even on a draft",
      async (caller) => {
        const owner = newUser();
        expect(await asks(await draftMeeting(owner), owner, caller)).toBe(true);
      },
    );

    it.each(["ownerName", "mustAsk"] as const)(
      "treats %s as a change to what gets spoken",
      async (field) => {
        const owner = newUser();
        const { id } = await liveMeeting(owner);
        expect(
          await approveSpokenEdits(
            { id, [field]: "Changed" },
            signedInAs(owner, "tool"),
          ),
        ).toBe(true);
      },
    );

    it("doesn't ask when the words stay the same", async () => {
      const owner = newUser();
      const { id } = await liveMeeting(owner);
      expect(
        await approveSpokenEdits({ id }, signedInAs(owner, "automation")),
      ).toBe(false);
    });

    it("doesn't ask the owner using the screens", async () => {
      const owner = newUser();
      expect(await asks((await liveMeeting(owner)).id, owner, "frontend")).toBe(
        false,
      );
    });
  });
});

describe("join-meeting-now", () => {
  it("is out of reach of external agents", () => {
    expect(joinMeetingNowAction.mcpTool).toBe(false);
  });

  it("sends the open tab the call to join", async () => {
    const owner = newUser();
    const id = await draftMeeting(owner);
    vi.mocked(writeAppStateForCurrentTab).mockClear();
    await joinMeetingNowAction.run({ id }, signedInAs(owner));
    expect(writeAppStateForCurrentTab).toHaveBeenCalledWith(
      "join-meeting",
      expect.objectContaining({ meetingId: id, meetUrl: MEET_LINK }),
    );
  });

  it("won't join a finished call", async () => {
    const owner = newUser();
    const { id } = await liveMeeting(owner);
    await finishMeetingAction.run({ id }, signedInAs(owner));
    expect(
      await errorCodeOf(joinMeetingNowAction.run({ id }, signedInAs(owner))),
    ).toBe("conflict");
  });

  it("won't join someone else's call", async () => {
    const id = await draftMeeting(newUser());
    expect(
      await errorCodeOf(
        joinMeetingNowAction.run({ id }, signedInAs(newUser())),
      ),
    ).toBe("not_found");
  });
});

describe("view-screen", () => {
  it("adds the meeting on screen with counts and no transcript", async () => {
    const owner = newUser();
    const { meeting } = await liveMeetingWithQuestion(owner);
    await addTranscriptLineAction.run(
      { meetingId: meeting.id, speaker: "Priya", body: "Private words" },
      signedInAs(owner),
    );
    vi.mocked(readAppState).mockResolvedValue({ meetingId: meeting.id });
    const screen = await viewScreenAction.run({}, signedInAs(owner, "tool"));
    expect(screen).toMatchObject({
      meeting: {
        id: meeting.id,
        title: "Launch sync",
        status: "live",
        questionsWaiting: 1,
        toDos: 0,
      },
    });
    expect(JSON.stringify(screen)).not.toContain("Private words");
  });

  it("shows nothing about another owner's meeting", async () => {
    const { id } = await liveMeeting(newUser());
    vi.mocked(readAppState).mockResolvedValue({ meetingId: id });
    expect(
      await viewScreenAction.run({}, signedInAs(newUser(), "tool")),
    ).not.toHaveProperty("meeting");
  });
});

describe("save-meeting-notes", () => {
  it("tells the owner the notes are ready", async () => {
    const owner = newUser();
    const { id } = await liveMeeting(owner);
    vi.mocked(notifyOwner).mockClear();
    await saveMeetingNotesAction.run(
      { id, notes: "Key points", actionItems: [] },
      signedInAs(owner, "automation"),
    );
    expect(notifyOwner).toHaveBeenCalledWith(
      owner,
      id,
      "Notes are ready for Launch sync.",
      expect.any(String),
    );
  });
});
