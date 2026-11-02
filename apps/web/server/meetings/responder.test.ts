import { generateText } from "ai";
import { asc, eq } from "drizzle-orm";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

import { STAND_IN_SPEAKER } from "../../shared/meetings";
import { introduction } from "../../shared/spoken";
import { getDb, schema } from "../db/index";
import type { Meeting } from "../db/schema";
import migrations from "../plugins/db";
import { notifyOwner } from "./notify-owner";
import { respondToLine } from "./responder";
import {
  appendTranscriptLine,
  createMeeting,
  getMeeting,
  getMeetingDetail,
  startMeeting,
} from "./store";

vi.mock("zod", async (importOriginal) => {
  const actual = await importOriginal<typeof import("zod")>();
  return { ...actual, z: actual.default };
});

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));

vi.mock("../lib/providers/llm.js", () => ({ chatModel: () => "test-model" }));

vi.mock("./notify-owner.js", () => ({ notifyOwner: vi.fn() }));

type ToolName = "stay_quiet" | "say_answer" | "note_for_owner";
type ToolCall = [ToolName, unknown];
type FakeTool = {
  execute: (input: unknown, options: unknown) => Promise<string>;
  inputSchema: { safeParse: (value: unknown) => { success: boolean } };
};
type GenerateArgs = {
  model: unknown;
  system: string;
  prompt: string;
  toolChoice: string;
  tools: Record<ToolName, FakeTool>;
};

const generate = generateText as unknown as Mock<
  (args: GenerateArgs) => Promise<unknown>
>;

const MAY_SHARE =
  "Launch is on Friday, at 10:00 sharp.\nThe budget is $40k — approved by finance!";
const FIRST_FACT = "Launch is on Friday, at 10:00 sharp.";
const SECOND_FACT = "The budget is $40k — approved by finance!";
const NOTE_LINE =
  "Maya can't answer that today. I've noted it, and Maya will get back to you after the call.";

const briefing = {
  title: "Launch sync",
  ownerName: "Maya",
  meetUrl: "https://meet.google.com/abc-defg-hij",
  agenda: "Ship date",
  mayShare: MAY_SHARE,
  mustAsk: "Salaries",
  startsAt: "2026-11-09T09:00:00.000Z",
  durationMinutes: 30,
};

let ownerNumber = 0;

async function liveMeeting(overrides: Partial<typeof briefing> = {}) {
  ownerNumber += 1;
  const owner = `owner-${ownerNumber}@example.com`;
  const id = await createMeeting(owner, { ...briefing, ...overrides });
  await startMeeting(owner, id);
  return getMeeting(owner, id);
}

async function said(meeting: Meeting, speaker: string, body: string) {
  const id = await appendTranscriptLine(meeting, speaker, body);
  await new Promise((resolve) => setTimeout(resolve, 2));
  return id;
}

const queuedLines = async (meetingId: string) =>
  (
    await getDb()
      .select()
      .from(schema.utterances)
      .where(eq(schema.utterances.meetingId, meetingId))
      .orderBy(asc(schema.utterances.createdAt))
  ).map((line) => line.body);

const questionsOf = async ({ id, ownerEmail }: Meeting) =>
  (await getMeetingDetail(ownerEmail, id)).questions;

function modelCalls(...calls: ToolCall[]) {
  const results: string[] = [];
  generate.mockImplementationOnce(async ({ tools }) => {
    for (const [name, input] of calls) {
      results.push(await tools[name].execute(input, {}));
    }
    return {};
  });
  return results;
}

function deferred() {
  let release = () => {};
  const until = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { until, release };
}

const lastOf = <T>(items: T[]) => items[items.length - 1];

const lastRequest = () => lastOf(generate.mock.calls)![0];

let quietErrors: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  await (migrations as unknown as (app: null) => Promise<void>)(null);
});

beforeEach(() => {
  generate.mockReset();
  quietErrors = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  quietErrors.mockRestore();
});

describe("introduction", () => {
  it("names the owner and says it's an AI", async () => {
    const meeting = await liveMeeting();
    expect(introduction(meeting)).toBe(
      "Hi, I'm Maya's AI stand-in. Maya can't join today. I'm taking notes, I can answer a few things Maya prepared, and I'll pass everything else on.",
    );
  });
});

describe("the request sent to the model", () => {
  it("forces one of exactly three tools", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "When do we launch?");
    modelCalls(["stay_quiet", {}]);
    await respondToLine(meeting, id);
    const request = lastRequest();
    expect(request.toolChoice).toBe("required");
    expect(request.model).toBe("test-model");
    expect(Object.keys(request.tools).sort()).toEqual([
      "note_for_owner",
      "say_answer",
      "stay_quiet",
    ]);
  });

  it("numbers the prepared answers and lists the off-limits topics", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "When do we launch?");
    modelCalls(["stay_quiet", {}]);
    await respondToLine(meeting, id);
    const { system } = lastRequest();
    expect(system).toContain(`1. ${FIRST_FACT}`);
    expect(system).toContain(`2. ${SECOND_FACT}`);
    expect(system).toContain("Salaries");
    expect(system).toContain("Launch sync");
  });

  it("marks empty briefing sections as none", async () => {
    const meeting = await liveMeeting({
      agenda: "",
      mayShare: "",
      mustAsk: "",
    });
    const id = await said(meeting, "Priya", "When do we launch?");
    modelCalls(["stay_quiet", {}]);
    await respondToLine(meeting, id);
    expect(lastRequest().system.match(/\(none\)/g)).toHaveLength(3);
  });

  it("shows the call up to the line being handled and nothing after it", async () => {
    const meeting = await liveMeeting();
    await said(meeting, "Tom", "Morning all.");
    const id = await said(meeting, "Priya", "When do we launch?");
    await said(meeting, "Tom", "Later remark.");
    modelCalls(["stay_quiet", {}]);
    await respondToLine(meeting, id);
    expect(lastRequest().prompt).toBe(
      "Tom: Morning all.\nPriya: When do we launch?",
    );
  });

  it("keeps only the latest thirty lines of context", async () => {
    const meeting = await liveMeeting();
    let last = "";
    for (let line = 1; line <= 32; line += 1) {
      last = await said(meeting, "Tom", `Line ${line}`);
    }
    modelCalls(["stay_quiet", {}]);
    await respondToLine(meeting, last);
    const lines = lastRequest().prompt.split("\n");
    expect(lines).toHaveLength(30);
    expect(lines[0]).toBe("Tom: Line 3");
    expect(lastOf(lines)).toBe("Tom: Line 32");
  });
});

describe("say_answer", () => {
  it("queues exactly the prepared sentence, word for word", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "What's the budget?");
    const results = modelCalls(["say_answer", { answer: 2 }]);
    await respondToLine(meeting, id);
    expect(await queuedLines(meeting.id)).toEqual([SECOND_FACT]);
    expect(results).toEqual(["done"]);
    expect(await questionsOf(meeting)).toEqual([]);
  });

  it.each([0, 3, 99, -1])("ignores the bad index %i", async (answer) => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "What's the budget?");
    modelCalls(["say_answer", { answer }]);
    await respondToLine(meeting, id);
    expect(await queuedLines(meeting.id)).toEqual([]);
    expect(await questionsOf(meeting)).toEqual([]);
  });

  it("says nothing when no answers were prepared", async () => {
    const meeting = await liveMeeting({ mayShare: "" });
    const id = await said(meeting, "Priya", "What's the budget?");
    modelCalls(["say_answer", { answer: 1 }]);
    await respondToLine(meeting, id);
    expect(await queuedLines(meeting.id)).toEqual([]);
  });

  it("only accepts a whole number inside the prepared range", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "What's the budget?");
    modelCalls(["stay_quiet", {}]);
    await respondToLine(meeting, id);
    const { inputSchema } = lastRequest().tools.say_answer;
    expect(inputSchema.safeParse({ answer: 1 }).success).toBe(true);
    expect(inputSchema.safeParse({ answer: 2 }).success).toBe(true);
    for (const answer of [0, 3, 1.5, "1"]) {
      expect(inputSchema.safeParse({ answer }).success).toBe(false);
    }
  });
});

describe("note_for_owner", () => {
  it("tells the owner who is waiting, once the line is queued", async () => {
    vi.mocked(notifyOwner).mockClear();
    const meeting = await liveMeeting();
    modelCalls(["note_for_owner", { replies: [] }]);
    const id = await appendTranscriptLine(meeting, "Priya", "Is Friday okay?");
    await respondToLine(meeting, id);
    expect(notifyOwner).toHaveBeenCalledWith(
      meeting.ownerEmail,
      meeting.id,
      "Priya asked something only you can answer.",
      "Is Friday okay?",
    );
  });

  it("saves the question with its asker and queues the can't-answer line", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "Can we move to Friday?");
    const results = modelCalls([
      "note_for_owner",
      { replies: ["Yes, Friday works", "No, keep Thursday"] },
    ]);
    await respondToLine(meeting, id);

    expect(await queuedLines(meeting.id)).toEqual([NOTE_LINE]);
    expect(results).toEqual(["done"]);
    const questions = await questionsOf(meeting);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      askedBy: "Priya",
      body: "Can we move to Friday?",
      status: "pending",
      ownerEmail: meeting.ownerEmail,
    });
    expect(JSON.parse(questions[0]!.suggestedRepliesJson)).toEqual([
      "Yes, Friday works",
      "No, keep Thursday",
    ]);
  });

  it("saves the newest line's question, not an earlier one", async () => {
    const meeting = await liveMeeting();
    await said(meeting, "Tom", "Is the deck ready?");
    const id = await said(meeting, "Priya", "Can we move to Friday?");
    modelCalls(["note_for_owner", { replies: [] }]);
    await respondToLine(meeting, id);
    const [question] = await questionsOf(meeting);
    expect(question).toMatchObject({
      askedBy: "Priya",
      body: "Can we move to Friday?",
    });
  });

  it("allows at most two non-empty suggested replies", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "Can we move to Friday?");
    modelCalls(["stay_quiet", {}]);
    await respondToLine(meeting, id);
    const { inputSchema } = lastRequest().tools.note_for_owner;
    expect(inputSchema.safeParse({ replies: [] }).success).toBe(true);
    expect(inputSchema.safeParse({ replies: ["a", "b"] }).success).toBe(true);
    expect(inputSchema.safeParse({ replies: ["a", "b", "c"] }).success).toBe(
      false,
    );
    expect(inputSchema.safeParse({ replies: [""] }).success).toBe(false);
  });
});

describe("stay_quiet", () => {
  it("queues nothing and saves nothing", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "Nice weather today.");
    const results = modelCalls(["stay_quiet", {}]);
    await respondToLine(meeting, id);
    expect(await queuedLines(meeting.id)).toEqual([]);
    expect(await questionsOf(meeting)).toEqual([]);
    expect(results).toEqual(["done"]);
  });
});

describe("a response with several tool calls", () => {
  it("acts on say_answer alone when it comes first", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "What's the budget?");
    const results = modelCalls(
      ["say_answer", { answer: 1 }],
      ["note_for_owner", { replies: [] }],
      ["say_answer", { answer: 2 }],
    );
    await respondToLine(meeting, id);
    expect(await queuedLines(meeting.id)).toEqual([FIRST_FACT]);
    expect(await questionsOf(meeting)).toEqual([]);
    expect(results).toEqual(["done", "ignored", "ignored"]);
  });

  it("lets a leading stay_quiet silence everything after it", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "What's the budget?");
    const results = modelCalls(
      ["stay_quiet", {}],
      ["say_answer", { answer: 1 }],
      ["note_for_owner", { replies: [] }],
    );
    await respondToLine(meeting, id);
    expect(await queuedLines(meeting.id)).toEqual([]);
    expect(await questionsOf(meeting)).toEqual([]);
    expect(results).toEqual(["done", "ignored", "ignored"]);
  });

  it("acts once even when the calls run at the same time", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "What's the budget?");
    generate.mockImplementationOnce(async ({ tools }) => {
      const results = await Promise.all([
        tools.note_for_owner.execute({ replies: [] }, {}),
        tools.say_answer.execute({ answer: 1 }, {}),
        tools.say_answer.execute({ answer: 2 }, {}),
      ]);
      expect(results).toEqual(["done", "ignored", "ignored"]);
      return {};
    });
    await respondToLine(meeting, id);
    expect(await queuedLines(meeting.id)).toEqual([NOTE_LINE]);
    expect(await questionsOf(meeting)).toHaveLength(1);
  });
});

describe("lines it doesn't respond to", () => {
  it("ignores a line spoken by the stand-in itself", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, STAND_IN_SPEAKER, "Can I help with that?");
    await respondToLine(meeting, id);
    expect(generate).not.toHaveBeenCalled();
    expect(await queuedLines(meeting.id)).toEqual([]);
  });

  it("ignores a line id that isn't in the recent transcript", async () => {
    const meeting = await liveMeeting();
    await said(meeting, "Priya", "Hello?");
    await respondToLine(meeting, "no-such-line");
    expect(generate).not.toHaveBeenCalled();
  });

  it("ignores a line that has scrolled out of the context window", async () => {
    const meeting = await liveMeeting();
    const old = await said(meeting, "Priya", "An old question?");
    for (let line = 0; line < 30; line += 1) {
      await said(meeting, "Tom", `Line ${line}`);
    }
    await respondToLine(meeting, old);
    expect(generate).not.toHaveBeenCalled();
  });

  it("can't see another meeting's lines", async () => {
    const meeting = await liveMeeting();
    const other = await liveMeeting();
    const id = await said(other, "Priya", "Hello?");
    await respondToLine(meeting, id);
    expect(generate).not.toHaveBeenCalled();
  });
});

describe("ordering within a meeting", () => {
  it("handles one line at a time, in the order they arrived", async () => {
    const meeting = await liveMeeting();
    const first = await said(meeting, "Priya", "First?");
    const second = await said(meeting, "Tom", "Second?");
    const third = await said(meeting, "Dana", "Third?");

    const gate = deferred();
    const seen: string[] = [];
    generate.mockImplementationOnce(async ({ prompt, tools }) => {
      seen.push(lastOf(prompt.split("\n"))!);
      await gate.until;
      await tools.say_answer.execute({ answer: 1 }, {});
      return {};
    });
    generate.mockImplementationOnce(async ({ prompt, tools }) => {
      seen.push(lastOf(prompt.split("\n"))!);
      await tools.say_answer.execute({ answer: 2 }, {});
      return {};
    });
    generate.mockImplementationOnce(async ({ prompt, tools }) => {
      seen.push(lastOf(prompt.split("\n"))!);
      await tools.stay_quiet.execute({}, {});
      return {};
    });

    const responses = [
      respondToLine(meeting, first),
      respondToLine(meeting, second),
      respondToLine(meeting, third),
    ];

    await vi.waitFor(() => expect(seen).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(seen).toEqual(["Priya: First?"]);
    expect(await queuedLines(meeting.id)).toEqual([]);

    gate.release();
    await Promise.all(responses);

    expect(seen).toEqual(["Priya: First?", "Tom: Second?", "Dana: Third?"]);
    expect(await queuedLines(meeting.id)).toEqual([FIRST_FACT, SECOND_FACT]);
  });

  it("doesn't make one meeting wait for another", async () => {
    const slow = await liveMeeting();
    const fast = await liveMeeting();
    const slowLine = await said(slow, "Priya", "Slow?");
    const fastLine = await said(fast, "Tom", "Fast?");

    const gate = deferred();
    generate.mockImplementationOnce(async () => {
      await gate.until;
      return {};
    });
    const stalled = respondToLine(slow, slowLine);
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));

    modelCalls(["say_answer", { answer: 1 }]);
    await respondToLine(fast, fastLine);
    expect(await queuedLines(fast.id)).toEqual([FIRST_FACT]);

    gate.release();
    await stalled;
  });
});

describe("when the model fails", () => {
  it("resolves instead of throwing, and logs which meeting failed", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "What's the budget?");
    generate.mockRejectedValueOnce(new Error("provider down"));
    await expect(respondToLine(meeting, id)).resolves.toBeUndefined();
    expect(await queuedLines(meeting.id)).toEqual([]);
    expect(quietErrors).toHaveBeenCalledWith(
      `[stand-in] responder failed for ${meeting.id}`,
      expect.objectContaining({ message: "provider down" }),
    );
  });

  it("keeps handling the next line for that meeting", async () => {
    const meeting = await liveMeeting();
    const first = await said(meeting, "Priya", "First?");
    const second = await said(meeting, "Tom", "Second?");
    generate.mockRejectedValueOnce(new Error("provider down"));
    modelCalls(["say_answer", { answer: 1 }]);
    await Promise.all([
      respondToLine(meeting, first),
      respondToLine(meeting, second),
    ]);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await queuedLines(meeting.id)).toEqual([FIRST_FACT]);
  });

  it("also contains a failure thrown while a tool is acting", async () => {
    const meeting = await liveMeeting();
    const id = await said(meeting, "Priya", "What's the budget?");
    generate.mockImplementationOnce(async () => {
      throw new TypeError("bad tool arguments");
    });
    await expect(respondToLine(meeting, id)).resolves.toBeUndefined();
    expect(quietErrors).toHaveBeenCalledTimes(1);
  });
});
