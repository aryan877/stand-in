import { describe, expect, test } from "bun:test";

import {
  createAloneWatch,
  createAnnouncement,
  createDoor,
  isWaitingToEnter,
} from "./call-rules";

const DEADLINE = 120_000;

describe("createAnnouncement", () => {
  test("stays closed until the introduction has played", () => {
    const announcement = createAnnouncement(DEADLINE);
    expect(announcement.announced).toBe(false);
    announcement.played();
    expect(announcement.announced).toBe(true);
  });

  test("expires when the introduction never plays", () => {
    const announcement = createAnnouncement(DEADLINE);
    expect(announcement.expired(DEADLINE - 1)).toBe(false);
    expect(announcement.expired(DEADLINE)).toBe(true);
  });

  test("never expires once announced", () => {
    const announcement = createAnnouncement(DEADLINE);
    announcement.played();
    expect(announcement.expired(DEADLINE * 2)).toBe(false);
  });

  test("opens on a rejoin, when no introduction is queued", () => {
    const announcement = createAnnouncement(DEADLINE);
    announcement.queueEmpty();
    expect(announcement.announced).toBe(true);
  });

  test("an empty queue after a failed fetch proves nothing", () => {
    const announcement = createAnnouncement(DEADLINE);
    announcement.queueFailed();
    announcement.queueEmpty();
    expect(announcement.announced).toBe(false);
  });

  test("a retried introduction still counts", () => {
    const announcement = createAnnouncement(DEADLINE);
    announcement.queueFailed();
    announcement.played();
    expect(announcement.announced).toBe(true);
  });

  test("a later line can't stand in for a lost introduction", () => {
    const announcement = createAnnouncement(DEADLINE);
    announcement.lost();
    announcement.played();
    announcement.queueEmpty();
    expect(announcement.announced).toBe(false);
    expect(announcement.expired(DEADLINE)).toBe(true);
  });

  test("a line lost after the introduction changes nothing", () => {
    const announcement = createAnnouncement(DEADLINE);
    announcement.played();
    announcement.lost();
    expect(announcement.announced).toBe(true);
  });
});

describe("isWaitingToEnter", () => {
  test("spots Meet's lobby message", () => {
    expect(
      isWaitingToEnter(
        "Please wait until a meeting host brings you into the call",
      ),
    ).toBe(true);
  });

  test("is false inside a call", () => {
    expect(isWaitingToEnter("Your meeting is ready. Captions are on.")).toBe(
      false,
    );
  });
});

describe("createAloneWatch", () => {
  test("never leaves a call nobody else has joined", () => {
    const isAlone = createAloneWatch(1000);
    expect(isAlone(1, 0)).toBe(false);
    expect(isAlone(1, 5000)).toBe(false);
  });

  test("leaves once it has been alone long enough after others left", () => {
    const isAlone = createAloneWatch(1000);
    isAlone(2, 0);
    expect(isAlone(1, 100)).toBe(false);
    expect(isAlone(1, 1100)).toBe(true);
  });

  test("resets when someone comes back", () => {
    const isAlone = createAloneWatch(1000);
    isAlone(2, 0);
    isAlone(1, 100);
    isAlone(2, 500);
    expect(isAlone(1, 900)).toBe(false);
  });

  test("keeps the call going when the count can't be read", () => {
    const isAlone = createAloneWatch(1000);
    isAlone(2, 0);
    expect(isAlone(null, 5000)).toBe(false);
  });
});

describe("createDoor", () => {
  const knock = { admit: false, waiting: true };
  const offer = { admit: true, waiting: true };
  const nobody = { admit: false, waiting: false };

  test("admits as soon as Meet offers the button", () => {
    const door = createDoor(3000, 12_000);
    expect(door(offer, 0)).toBe("admit");
  });

  test("gives Meet a moment to offer the button before opening the list", () => {
    const door = createDoor(3000, 12_000);
    expect(door(knock, 0)).toBe(null);
    expect(door(knock, 2000)).toBe(null);
    expect(door(knock, 4000)).toBe("open-list");
    expect(door(knock, 6000)).toBe(null);
  });

  test("closes the list once the person it opened it for is in", () => {
    const door = createDoor(3000, 12_000);
    door(knock, 0);
    door(knock, 4000);
    expect(door(offer, 6000)).toBe("admit");
    expect(door(knock, 8000)).toBe(null);
    expect(door(knock, 10_000)).toBe("close-list");
  });

  test("leaves the count alone while it still shows the person just let in", () => {
    const door = createDoor(3000, 12_000);
    door(offer, 0);
    expect(door(knock, 2000)).toBe(null);
    expect(door(knock, 10_000)).toBe(null);
    expect(door(knock, 12_000)).toBe(null);
    expect(door(knock, 16_000)).toBe("open-list");
  });

  test("still admits a second person who knocks straight after the first", () => {
    const door = createDoor(3000, 12_000);
    door(offer, 0);
    expect(door(offer, 2000)).toBe("admit");
  });

  test("closes a list with nobody to admit and doesn't reopen it straight away", () => {
    const door = createDoor(3000, 12_000);
    door(knock, 0);
    door(knock, 4000);
    expect(door(knock, 8000)).toBe("close-list");
    expect(door(knock, 10_000)).toBe(null);
    expect(door(knock, 18_000)).toBe(null);
  });

  test("does nothing while nobody is waiting", () => {
    const door = createDoor(3000, 12_000);
    expect(door(nobody, 0)).toBe(null);
    expect(door(nobody, 60_000)).toBe(null);
  });
});
