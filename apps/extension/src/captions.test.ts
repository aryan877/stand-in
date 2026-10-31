import { describe, expect, test } from "bun:test";

import {
  type CaptionLine,
  createCaptionTracker,
  unsentWords,
} from "./captions";

const IDLE_MS = 1000;
const tom = (text: string) => ({ speaker: "Tom", text });

function track(frames: [CaptionLine | undefined, number][]) {
  const lines: CaptionLine[] = [];
  const tracker = createCaptionTracker((line) => lines.push(line), IDLE_MS);
  for (const [caption, now] of frames) tracker.observe(caption, now);
  return { lines, idle: tracker.idle };
}

describe("unsentWords", () => {
  test("ignores Meet's case and punctuation fixes", () => {
    expect(
      unsentWords("is it thursday", "Is it Thursday? It feels tight."),
    ).toBe("It feels tight.");
  });
});

describe("createCaptionTracker", () => {
  test("sends a line once the speaker pauses", () => {
    expect(
      track([
        [tom("Is it Thursday?"), 0],
        [tom("Is it Thursday?"), 1500],
      ]).lines,
    ).toEqual([tom("Is it Thursday?")]);
  });

  test("waits while the caption is still growing", () => {
    const { lines, idle } = track([
      [tom("Is it"), 0],
      [tom("Is it Thursday?"), 800],
      [tom("Is it Thursday?"), 1500],
    ]);
    expect(lines).toEqual([]);
    expect(idle).toBe(false);
  });

  test("never resends a row that stays on screen", () => {
    expect(
      track([
        [tom("Is it Thursday?"), 0],
        [tom("Is it Thursday?"), 1500],
        [tom("Is it Thursday?"), 4000],
        [tom("Is it Thursday?"), 9000],
      ]).lines,
    ).toEqual([tom("Is it Thursday?")]);
  });

  test("sends only the new words when the same person keeps talking", () => {
    expect(
      track([
        [tom("is it thursday"), 0],
        [tom("is it thursday"), 1500],
        [tom("Is it Thursday? It feels tight."), 2000],
        [tom("Is it Thursday? It feels tight."), 3500],
      ]).lines,
    ).toEqual([tom("is it thursday"), tom("It feels tight.")]);
  });

  test("finishes a row that left the screen", () => {
    const { lines, idle } = track([
      [tom("Is it Thursday?"), 0],
      [undefined, 1500],
    ]);
    expect(lines).toEqual([tom("Is it Thursday?")]);
    expect(idle).toBe(true);
  });

  test("drops anything heard before it was allowed to listen", () => {
    let open = false;
    const lines: CaptionLine[] = [];
    const tracker = createCaptionTracker(
      (line) => lines.push(line),
      IDLE_MS,
      () => open,
    );
    tracker.observe(tom("Is it Thursday?"), 0);
    tracker.observe(tom("Is it Thursday?"), 1500);
    open = true;
    tracker.observe(tom("Is it Thursday?"), 3000);
    expect(lines).toEqual([]);
    tracker.observe(tom("Is it Thursday? It feels tight."), 4000);
    tracker.observe(tom("Is it Thursday? It feels tight."), 5500);
    expect(lines).toEqual([tom("It feels tight.")]);
  });

  test("drops a line that started before it was allowed to listen", () => {
    let open = false;
    const lines: CaptionLine[] = [];
    const tracker = createCaptionTracker(
      (line) => lines.push(line),
      IDLE_MS,
      () => open,
    );
    tracker.observe(tom("Is it"), 0);
    open = true;
    tracker.observe(tom("Is it Thursday?"), 500);
    tracker.observe(tom("Is it Thursday?"), 2000);
    expect(lines).toEqual([]);
  });

  test("skips the stand-in's own speech", () => {
    expect(
      track([
        [{ speaker: "You", text: "Hi, I'm an AI stand-in." }, 0],
        [{ speaker: "You", text: "Hi, I'm an AI stand-in." }, 1500],
      ]).lines,
    ).toEqual([]);
  });
});
