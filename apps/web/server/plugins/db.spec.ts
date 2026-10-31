import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import * as schema from "../db/schema";

const migrationsSource = readFileSync(
  new URL("./db.ts", import.meta.url),
  "utf8",
);

const isTable = (value: unknown): value is Record<string, unknown> =>
  !!value &&
  typeof value === "object" &&
  Object.getOwnPropertySymbols(value).some((symbol) =>
    symbol.toString().includes("drizzle"),
  );

const columnNames = (table: Record<string, unknown>) =>
  Object.values(table).flatMap((column) =>
    column &&
    typeof column === "object" &&
    typeof (column as { name?: unknown }).name === "string"
      ? [(column as { name: string }).name]
      : [],
  );

describe("migrations", () => {
  for (const [name, table] of Object.entries(schema)) {
    if (!isTable(table)) continue;
    it(`create every column of ${name}`, () => {
      const missing = columnNames(table).filter(
        (column) => !new RegExp(`\\b${column}\\b`).test(migrationsSource),
      );
      expect(missing).toEqual([]);
    });
  }

  it("have unique names", () => {
    const names = [...migrationsSource.matchAll(/name: "([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });
});
