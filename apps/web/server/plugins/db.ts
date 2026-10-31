import { runMigrations } from "@agent-native/core/db";

const MIGRATIONS = [
  {
    name: "create-meetings",
    sql: `CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      title TEXT NOT NULL,
      meet_url TEXT NOT NULL,
      agenda TEXT NOT NULL DEFAULT '',
      may_share TEXT NOT NULL DEFAULT '',
      must_ask TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'ended')),
      notes TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT
    )`,
  },
  {
    name: "index-meetings-owner-created",
    sql: `CREATE INDEX IF NOT EXISTS meetings_owner_created_idx ON meetings (owner_email, created_at)`,
  },
  {
    name: "create-transcript-segments",
    sql: `CREATE TABLE IF NOT EXISTS transcript_segments (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      speaker TEXT NOT NULL,
      body TEXT NOT NULL,
      spoken_at TEXT NOT NULL
    )`,
  },
  {
    name: "index-transcript-meeting-spoken",
    sql: `CREATE INDEX IF NOT EXISTS transcript_meeting_spoken_idx ON transcript_segments (meeting_id, spoken_at)`,
  },
  {
    name: "create-questions",
    sql: `CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      asked_by TEXT NOT NULL,
      body TEXT NOT NULL,
      suggested_replies_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
      answer TEXT,
      created_at TEXT NOT NULL,
      answered_at TEXT
    )`,
  },
  {
    name: "index-questions-meeting-created",
    sql: `CREATE INDEX IF NOT EXISTS questions_meeting_created_idx ON questions (meeting_id, created_at)`,
  },
  {
    name: "create-utterances",
    sql: `CREATE TABLE IF NOT EXISTS utterances (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'spoken')),
      created_at TEXT NOT NULL,
      spoken_at TEXT
    )`,
  },
  {
    name: "index-utterances-meeting-status-created",
    sql: `CREATE INDEX IF NOT EXISTS utterances_meeting_status_created_idx ON utterances (meeting_id, status, created_at)`,
  },
  {
    name: "create-action-items",
    sql: `CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      body TEXT NOT NULL,
      assignee TEXT,
      status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'dismissed')),
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
  },
  {
    name: "index-action-items-meeting-sort",
    sql: `CREATE INDEX IF NOT EXISTS action_items_meeting_sort_idx ON action_items (meeting_id, sort_order)`,
  },
  {
    name: "add-meetings-starts-at",
    sql: `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS starts_at TEXT`,
  },
  {
    name: "add-meetings-duration-minutes",
    sql: `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30`,
  },
  {
    name: "index-meetings-owner-status-starts",
    sql: `CREATE INDEX IF NOT EXISTS meetings_owner_status_starts_idx ON meetings (owner_email, status, starts_at)`,
  },
  {
    name: "add-utterances-attempts",
    sql: `ALTER TABLE utterances ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0`,
  },
  {
    name: "add-meetings-let-people-in",
    sql: `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS let_people_in BOOLEAN NOT NULL DEFAULT FALSE`,
  },
];

export default runMigrations(
  MIGRATIONS.map((migration, index) => ({ version: index + 1, ...migration })),
  { table: "stand_in_migrations" },
);
