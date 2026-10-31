import { getDbExec, runMigrations } from "@agent-native/core/db";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  ACTION_ITEM_STATES,
  MEETING_STATES,
  QUESTION_STATES,
  UTTERANCE_STATES,
} from "../../shared/meetings";
import migrations from "./db";

vi.mock("@agent-native/core/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@agent-native/core/db")>();
  return { ...actual, runMigrations: vi.fn(actual.runMigrations) };
});

type Migration = { version: number; name: string; sql: string };

const [migrationList, migrationOptions] = vi.mocked(runMigrations).mock
  .calls[0] as unknown as [Migration[], { table: string }];

const runAll = () => (migrations as unknown as (app: null) => Promise<void>)(null);

let nextId = 0;
const rowId = () => `row-${(nextId += 1)}`;

const CONSTRAINED_TABLES = [
  {
    table: "meetings",
    states: MEETING_STATES,
    insert: `INSERT INTO meetings (id, owner_email, owner_name, title, meet_url, status, created_at)
      VALUES (?, 'a@example.com', 'A', 'T', 'https://meet.google.com/abc-defg-hij', ?, '2026-11-09T09:00:00.000Z')`,
  },
  {
    table: "questions",
    states: QUESTION_STATES,
    insert: `INSERT INTO questions (id, meeting_id, owner_email, asked_by, body, status, created_at)
      VALUES (?, 'm', 'a@example.com', 'Priya', 'Why?', ?, '2026-11-09T09:00:00.000Z')`,
  },
  {
    table: "utterances",
    states: UTTERANCE_STATES,
    insert: `INSERT INTO utterances (id, meeting_id, owner_email, body, status, created_at)
      VALUES (?, 'm', 'a@example.com', 'Hello', ?, '2026-11-09T09:00:00.000Z')`,
  },
  {
    table: "action_items",
    states: ACTION_ITEM_STATES,
    insert: `INSERT INTO action_items (id, meeting_id, owner_email, body, status)
      VALUES (?, 'm', 'a@example.com', 'Do it', ?)`,
  },
] as const;

beforeAll(async () => {
  await runAll();
});

describe("migration list", () => {
  it("is registered under its own table", () => {
    expect(migrationOptions.table).toBe("stand_in_migrations");
  });

  it("gives every migration a unique name", () => {
    const names = migrationList.map((migration) => migration.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it("numbers migrations from one without gaps", () => {
    expect(migrationList.map((migration) => migration.version)).toEqual(
      migrationList.map((_, index) => index + 1),
    );
  });

  it("records every migration as applied", async () => {
    const { rows } = await getDbExec().execute(
      "SELECT name FROM stand_in_migrations_named",
    );
    expect(rows.map((row) => String(row.name)).sort()).toEqual(
      migrationList.map((migration) => migration.name).sort(),
    );
  });

  it("can run again without changing anything", async () => {
    await expect(runAll()).resolves.toBeUndefined();
    const { rows } = await getDbExec().execute(
      "SELECT COUNT(*) AS total FROM stand_in_migrations_named",
    );
    expect(Number(rows[0]!.total)).toBe(migrationList.length);
  });
});

describe.each(CONSTRAINED_TABLES)(
  "the $table status constraint",
  ({ table, states, insert }) => {
    it.each([...states])("accepts %s", async (status) => {
      const id = rowId();
      await getDbExec().execute({ sql: insert, args: [id, status] });
      const { rows } = await getDbExec().execute({
        sql: `SELECT status FROM ${table} WHERE id = ?`,
        args: [id],
      });
      expect(rows[0]!.status).toBe(status);
    });

    it.each(["paused", "", "DRAFT"])("rejects %j", async (status) => {
      const id = rowId();
      await expect(
        getDbExec().execute({ sql: insert, args: [id, status] }),
      ).rejects.toThrow(/check constraint/i);
      const { rows } = await getDbExec().execute({
        sql: `SELECT id FROM ${table} WHERE id = ?`,
        args: [id],
      });
      expect(rows).toEqual([]);
    });
  },
);
