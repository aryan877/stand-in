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

