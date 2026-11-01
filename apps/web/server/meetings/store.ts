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

