import { boolean, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import {
  ACTION_ITEM_STATES,
  MEETING_STATES,
  QUESTION_STATES,
  UTTERANCE_STATES,
} from "../../shared/meetings.js";

export const meetings = pgTable(
  "meetings",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    ownerName: text("owner_name").notNull(),
    title: text("title").notNull(),
    meetUrl: text("meet_url").notNull(),
    agenda: text("agenda").notNull().default(""),
    mayShare: text("may_share").notNull().default(""),
    mustAsk: text("must_ask").notNull().default(""),
    status: text("status", { enum: MEETING_STATES }).notNull().default("draft"),
    notes: text("notes"),
    startsAt: text("starts_at"),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    letPeopleIn: boolean("let_people_in").notNull().default(false),
    createdAt: text("created_at").notNull(),
    startedAt: text("started_at"),
    endedAt: text("ended_at"),
  },
  (t) => [
    index("meetings_owner_created_idx").on(t.ownerEmail, t.createdAt),
    index("meetings_owner_status_starts_idx").on(
      t.ownerEmail,
      t.status,
      t.startsAt,
    ),
  ],
);

export const transcriptSegments = pgTable(
  "transcript_segments",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    speaker: text("speaker").notNull(),
    body: text("body").notNull(),
    spokenAt: text("spoken_at").notNull(),
  },
  (t) => [index("transcript_meeting_spoken_idx").on(t.meetingId, t.spokenAt)],
);

export const questions = pgTable(
  "questions",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    askedBy: text("asked_by").notNull(),
    body: text("body").notNull(),
    suggestedRepliesJson: text("suggested_replies_json")
      .notNull()
      .default("[]"),
    status: text("status", { enum: QUESTION_STATES })
      .notNull()
      .default("pending"),
    answer: text("answer"),
    createdAt: text("created_at").notNull(),
    answeredAt: text("answered_at"),
  },
  (t) => [index("questions_meeting_created_idx").on(t.meetingId, t.createdAt)],
);

export const utterances = pgTable(
  "utterances",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: UTTERANCE_STATES })
      .notNull()
      .default("queued"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: text("created_at").notNull(),
    spokenAt: text("spoken_at"),
  },
  (t) => [
    index("utterances_meeting_status_created_idx").on(
      t.meetingId,
      t.status,
      t.createdAt,
    ),
  ],
);

export const actionItems = pgTable(
  "action_items",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    body: text("body").notNull(),
    assignee: text("assignee"),
    status: text("status", { enum: ACTION_ITEM_STATES })
      .notNull()
      .default("proposed"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("action_items_meeting_sort_idx").on(t.meetingId, t.sortOrder)],
);

export type Meeting = typeof meetings.$inferSelect;
export type TranscriptSegment = typeof transcriptSegments.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;
