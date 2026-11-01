import { randomUUID } from "node:crypto";

import { fail } from "@agent-native/core/action";
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { STAND_IN_SPEAKER } from "../../shared/meetings.js";
import { getDb, schema } from "../db/index.js";
import type { Meeting } from "../db/schema.js";
import {
  type ActionItemEvent,
  actionItemMachine,
  meetingMachine,
} from "./machines.js";

const { actionItems, meetings, questions, transcriptSegments, utterances } =
  schema;

const newId = () => randomUUID();
const isoNow = () => new Date().toISOString();

export function requireOwner(email: string | undefined): string {
  if (!email)
    fail("Sign in first.", { errorCode: "unauthenticated", statusCode: 401 });
  return email;
}

const notFound = (what: string): never =>
  fail(`${what} not found.`, { errorCode: "not_found", statusCode: 404 });

const conflict = (message: string): never =>
  fail(message, { errorCode: "conflict", statusCode: 409 });

const MINUTE_MS = 60_000;
const JOIN_EARLY_MS = MINUTE_MS;
const JOIN_LATE_MS = 15 * MINUTE_MS;
const LEAVE_GRACE_MS = 10 * MINUTE_MS;
const MAX_SPEAK_ATTEMPTS = 3;

export async function getMeeting(ownerEmail: string, id: string) {
  const [meeting] = await getDb()
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.ownerEmail, ownerEmail)));
  return meeting ?? notFound("Meeting");
}

export const MEETING_VIEWS = ["upcoming", "missed", "past"] as const;
export type MeetingView = (typeof MEETING_VIEWS)[number];
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

type PageRequest = { limit?: number; offset?: number };

function meetingsInView(view: MeetingView, now: number) {
  const joinClosedAt = new Date(now - JOIN_LATE_MS).toISOString();
  if (view === "past") return eq(meetings.status, "ended");
  if (view === "missed") {
    return and(
      eq(meetings.status, "draft"),
      lt(meetings.startsAt, joinClosedAt),
    );
  }
  return or(
    eq(meetings.status, "live"),
    and(
      eq(meetings.status, "draft"),
      or(isNull(meetings.startsAt), gte(meetings.startsAt, joinClosedAt)),
    ),
  );
}

async function waitingQuestionCounts(ownerEmail: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, number>();
  const rows = await getDb()
    .select({ meetingId: questions.meetingId, waiting: count() })
    .from(questions)
    .where(
      and(
        eq(questions.ownerEmail, ownerEmail),
        eq(questions.status, "pending"),
        inArray(questions.meetingId, ids),
      ),
    )
    .groupBy(questions.meetingId);
  return new Map(rows.map((row) => [row.meetingId, Number(row.waiting)]));
}

export async function listMeetings(
  ownerEmail: string,
  {
    view = "upcoming",
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
    now = Date.now(),
  }: PageRequest & { view?: MeetingView; now?: number } = {},
) {
  const rows = await getDb()
    .select()
    .from(meetings)
    .where(and(eq(meetings.ownerEmail, ownerEmail), meetingsInView(view, now)))
    .orderBy(
      ...(view === "upcoming"
        ? [
            desc(eq(meetings.status, "live")),
            asc(meetings.startsAt),
            asc(meetings.id),
          ]
        : [desc(meetings.startsAt), desc(meetings.id)]),
    )
    .limit(limit + 1)
    .offset(offset);
  const page = rows.slice(0, limit);
  const waiting = await waitingQuestionCounts(
    ownerEmail,
    page.map((meeting) => meeting.id),
  );
  return {
    meetings: page.map((meeting) => ({
      ...meeting,
      waitingQuestions: waiting.get(meeting.id) ?? 0,
    })),
    hasMore: rows.length > limit,
  };
}

export async function isOnlyMeeting(ownerEmail: string) {
  const rows = await getDb()
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.ownerEmail, ownerEmail))
    .limit(2);
  return rows.length === 1;
}

export async function getMeetingDetail(ownerEmail: string, id: string) {
  const meeting = await getMeeting(ownerEmail, id);
  const db = getDb();
  const [transcript, meetingQuestions, items] = await Promise.all([
    db
      .select()
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, id))
      .orderBy(asc(transcriptSegments.spokenAt)),
    db
      .select()
      .from(questions)
      .where(eq(questions.meetingId, id))
      .orderBy(desc(questions.createdAt)),
    db
      .select()
      .from(actionItems)
      .where(eq(actionItems.meetingId, id))
      .orderBy(asc(actionItems.sortOrder)),
  ]);
  return {
    meeting,
    transcript,
    questions: meetingQuestions,
    actionItems: items,
  };
}

export type MeetingDetail = Awaited<ReturnType<typeof getMeetingDetail>>;

export async function meetingOnScreen(ownerEmail: string, id: string) {
  const db = getDb();
  const owned = (table: typeof questions | typeof actionItems) =>
    and(eq(table.meetingId, id), eq(table.ownerEmail, ownerEmail));
  const [[meeting], [waiting], [toDos]] = await Promise.all([
    db
      .select({
        id: meetings.id,
        title: meetings.title,
        status: meetings.status,
        startsAt: meetings.startsAt,
      })
      .from(meetings)
      .where(and(eq(meetings.id, id), eq(meetings.ownerEmail, ownerEmail))),
    db
      .select({ total: count() })
      .from(questions)
      .where(and(owned(questions), eq(questions.status, "pending"))),
    db.select({ total: count() }).from(actionItems).where(owned(actionItems)),
  ]);
  if (!meeting) return null;
  return {
    ...meeting,
    questionsWaiting: Number(waiting?.total ?? 0),
    toDos: Number(toDos?.total ?? 0),
  };
}

export async function createMeeting(
  ownerEmail: string,
  fields: Pick<
    Meeting,
    | "title"
    | "ownerName"
    | "meetUrl"
    | "agenda"
    | "mayShare"
    | "mustAsk"
    | "startsAt"
    | "durationMinutes"
  > &
    Partial<Pick<Meeting, "letPeopleIn">>,
) {
  const id = newId();
  await getDb()
    .insert(meetings)
    .values({ id, ownerEmail, createdAt: isoNow(), ...fields });
  return id;
}

export async function updateMeeting(
  ownerEmail: string,
  id: string,
  patch: {
    [K in
      | "title"
      | "ownerName"
      | "agenda"
      | "mayShare"
      | "mustAsk"
      | "letPeopleIn"
      | "notes"]?: Meeting[K] | undefined;
  },
) {
  await getMeeting(ownerEmail, id);
  const changes = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(changes).length === 0) return;
  await getDb()
    .update(meetings)
    .set(changes)
    .where(and(eq(meetings.id, id), eq(meetings.ownerEmail, ownerEmail)));
}

export async function deleteMeeting(ownerEmail: string, id: string) {
  const meeting = await getMeeting(ownerEmail, id);
  if (meeting.status === "live") conflict("End the call before deleting it.");
  await getDb().transaction(async (tx) => {
    for (const child of [
      transcriptSegments,
      questions,
      utterances,
      actionItems,
    ]) {
      await tx.delete(child).where(eq(child.meetingId, id));
    }
    await tx
      .delete(meetings)
      .where(and(eq(meetings.id, id), eq(meetings.ownerEmail, ownerEmail)));
  });
}

export async function dueMeetings(ownerEmail: string, now = Date.now()) {
  const db = getDb();
  const [due, [next]] = await Promise.all([
    db
      .select({ id: meetings.id, meetUrl: meetings.meetUrl })
      .from(meetings)
      .where(
        and(
          eq(meetings.ownerEmail, ownerEmail),
          eq(meetings.status, "draft"),
          between(
            meetings.startsAt,
            new Date(now - JOIN_LATE_MS).toISOString(),
            new Date(now + JOIN_EARLY_MS).toISOString(),
          ),
        ),
      ),
    db
      .select({ startsAt: meetings.startsAt })
      .from(meetings)
      .where(
        and(
          eq(meetings.ownerEmail, ownerEmail),
          eq(meetings.status, "draft"),
          gt(meetings.startsAt, new Date(now).toISOString()),
        ),
      )
      .orderBy(asc(meetings.startsAt))
      .limit(1),
  ]);
  return { due, nextStartsAt: next?.startsAt ?? null };
}

export function leaveAt(meeting: Meeting) {
  const start = Date.parse(
    meeting.startsAt ?? meeting.startedAt ?? meeting.createdAt,
  );
  return new Date(
    start + meeting.durationMinutes * MINUTE_MS + LEAVE_GRACE_MS,
  ).toISOString();
}

export async function startMeeting(ownerEmail: string, id: string) {
  const [started] = await getDb()
    .update(meetings)
    .set({
      status: meetingMachine.transition("draft", "start"),
      startedAt: isoNow(),
    })
    .where(
      and(
        eq(meetings.id, id),
        eq(meetings.ownerEmail, ownerEmail),
        inArray(meetings.status, meetingMachine.fromStates("start")),
      ),
    )
    .returning();
  if (started) return true;
  const meeting = await getMeeting(ownerEmail, id);
  if (meeting.status === "live") return false;
  return conflict("This meeting has already ended.");
}

export async function finishMeeting(ownerEmail: string, id: string) {
  const [finished] = await getDb()
    .update(meetings)
    .set({
      status: meetingMachine.transition("live", "finish"),
      endedAt: isoNow(),
    })
    .where(
      and(
        eq(meetings.id, id),
        eq(meetings.ownerEmail, ownerEmail),
        inArray(meetings.status, meetingMachine.fromStates("finish")),
      ),
    )
    .returning();
  if (finished) return true;
  const meeting = await getMeeting(ownerEmail, id);
  if (meeting.status !== "ended") conflict("This meeting hasn't started.");
  return false;
}

export async function requireLiveMeeting(ownerEmail: string, id: string) {
  const meeting = await getMeeting(ownerEmail, id);
  if (meetingMachine.parseState(meeting.status) !== "live") {
    conflict("This meeting isn't live.");
  }
  return meeting;
}

export async function requireJoinableMeeting(ownerEmail: string, id: string) {
  const meeting = await getMeeting(ownerEmail, id);
  if (meetingMachine.parseState(meeting.status) === "ended") {
    conflict("This call has already ended.");
  }
  return meeting;
}

export async function appendTranscriptLine(
  meeting: Meeting,
  speaker: string,
  body: string,
) {
  const id = newId();
  await getDb().insert(transcriptSegments).values({
    id,
    meetingId: meeting.id,
    ownerEmail: meeting.ownerEmail,
    speaker,
    body,
    spokenAt: isoNow(),
  });
  return id;
}

export async function heardAnyone(meetingId: string) {
  const [line] = await getDb()
    .select({ id: transcriptSegments.id })
    .from(transcriptSegments)
    .where(
      and(
        eq(transcriptSegments.meetingId, meetingId),
        ne(transcriptSegments.speaker, STAND_IN_SPEAKER),
      ),
    )
    .limit(1);
  return Boolean(line);
}

export const recentTranscript = (meetingId: string, limit: number) =>
  getDb()
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, meetingId))
    .orderBy(desc(transcriptSegments.spokenAt))
    .limit(limit);

export async function queueLine(meeting: Meeting, body: string) {
  await getDb().insert(utterances).values({
    id: newId(),
    meetingId: meeting.id,
    ownerEmail: meeting.ownerEmail,
    body,
    createdAt: isoNow(),
  });
}

export async function claimNextLine(meeting: Meeting) {
  const db = getDb();
  const [next] = await db
    .select({ id: utterances.id })
    .from(utterances)
    .where(
      and(
        eq(utterances.meetingId, meeting.id),
        eq(utterances.status, "queued"),
        lt(utterances.attempts, MAX_SPEAK_ATTEMPTS),
      ),
    )
    .orderBy(asc(utterances.createdAt))
    .limit(1);
  if (!next) return null;
  const spokenAt = isoNow();
  const [claimed] = await db
    .update(utterances)
    .set({ status: "spoken", spokenAt })
    .where(and(eq(utterances.id, next.id), eq(utterances.status, "queued")))
    .returning();
  if (!claimed) return null;
  const transcriptId = newId();
  await db.insert(transcriptSegments).values({
    id: transcriptId,
    meetingId: meeting.id,
    ownerEmail: meeting.ownerEmail,
    speaker: STAND_IN_SPEAKER,
    body: claimed.body,
    spokenAt,
  });
  return { ...claimed, transcriptId };
}

type ClaimedLine = NonNullable<Awaited<ReturnType<typeof claimNextLine>>>;

export async function releaseLine({ id, transcriptId }: ClaimedLine) {
  const db = getDb();
  await db
    .update(utterances)
    .set({
      status: "queued",
      spokenAt: null,
      attempts: sql`${utterances.attempts} + 1`,
    })
    .where(and(eq(utterances.id, id), eq(utterances.status, "spoken")));
  await db
    .delete(transcriptSegments)
    .where(eq(transcriptSegments.id, transcriptId));
}

export async function createQuestion(
  meeting: Meeting,
  askedBy: string,
  body: string,
  suggestedReplies: string[],
) {
  await getDb()
    .insert(questions)
    .values({
      id: newId(),
      meetingId: meeting.id,
      ownerEmail: meeting.ownerEmail,
      askedBy,
      body,
      suggestedRepliesJson: JSON.stringify(suggestedReplies),
      createdAt: isoNow(),
    });
}

export async function answerQuestion(
  ownerEmail: string,
  id: string,
  answer: string,
) {
  const [answered] = await getDb()
    .update(questions)
    .set({ status: "answered", answer, answeredAt: isoNow() })
    .where(
      and(
        eq(questions.id, id),
        eq(questions.ownerEmail, ownerEmail),
        eq(questions.status, "pending"),
      ),
    )
    .returning();
  if (answered) return answered;
  const [existing] = await getDb()
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.id, id), eq(questions.ownerEmail, ownerEmail)));
  return existing
    ? conflict("That question is already answered.")
    : notFound("Question");
}

export async function listFollowUps(
  ownerEmail: string,
  { limit = DEFAULT_PAGE_SIZE, offset = 0 }: PageRequest = {},
) {
  const rows = await getDb()
    .select({
      id: questions.id,
      meetingId: questions.meetingId,
      meetingTitle: meetings.title,
      askedBy: questions.askedBy,
      body: questions.body,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .innerJoin(meetings, eq(meetings.id, questions.meetingId))
    .where(
      and(
        eq(questions.ownerEmail, ownerEmail),
        eq(meetings.ownerEmail, ownerEmail),
        eq(questions.status, "pending"),
        eq(meetings.status, "ended"),
      ),
    )
    .orderBy(desc(questions.createdAt), desc(questions.id))
    .limit(limit + 1)
    .offset(offset);
  return { followUps: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function saveNotes(
  ownerEmail: string,
  id: string,
  notes: string,
  items: { body: string; assignee?: string | undefined }[],
) {
  const meeting = await getMeeting(ownerEmail, id);
  await getDb().transaction(async (tx) => {
    await tx
      .update(meetings)
      .set({ notes })
      .where(and(eq(meetings.id, id), eq(meetings.ownerEmail, ownerEmail)));
    await tx.delete(actionItems).where(eq(actionItems.meetingId, id));
    if (items.length > 0) {
      await tx.insert(actionItems).values(
        items.map((item, sortOrder) => ({
          id: newId(),
          meetingId: id,
          ownerEmail,
          body: item.body,
          assignee: item.assignee ?? null,
          sortOrder,
        })),
      );
    }
  });
  return meeting;
}

export async function updateActionItem(
  ownerEmail: string,
  id: string,
  {
    event,
    ...fields
  }: {
    body?: string | undefined;
    assignee?: string | undefined;
    event?: ActionItemEvent | undefined;
  },
) {
  const owned = and(
    eq(actionItems.id, id),
    eq(actionItems.ownerEmail, ownerEmail),
  );
  const [updated] = await getDb()
    .update(actionItems)
    .set({
      ...(fields.body !== undefined ? { body: fields.body } : {}),
      ...(fields.assignee !== undefined ? { assignee: fields.assignee } : {}),
      ...(event ? { status: targetOf(event) } : {}),
    })
    .where(
      event
        ? and(
            owned,
            inArray(actionItems.status, actionItemMachine.fromStates(event)),
          )
        : owned,
    )
    .returning();
  if (updated) return updated;
  const [existing] = await getDb()
    .select({ status: actionItems.status })
    .from(actionItems)
    .where(owned);
  return existing
    ? conflict(`This action item is already ${existing.status}.`)
    : notFound("Action item");
}

const targetOf = (event: ActionItemEvent) =>
  actionItemMachine.transition(actionItemMachine.fromStates(event)[0]!, event);
