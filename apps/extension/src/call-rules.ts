export function createAnnouncement(deadline: number) {
  let announced = false;
  let introLost = false;
  let queueFailed = false;

  return {
    get announced() {
      return announced;
    },
    played() {
      if (!introLost) announced = true;
    },
    lost() {
      if (!announced) introLost = true;
    },
    queueFailed() {
      queueFailed = true;
    },
    queueEmpty() {
      if (!queueFailed && !introLost) announced = true;
    },
    expired(now: number) {
      return !announced && now >= deadline;
    },
  };
}

const WAITING_TO_ENTER =
  /brings you into the call|asking to be let in|someone will let you in|wait until a meeting host/i;

export const isWaitingToEnter = (pageText: string) =>
  WAITING_TO_ENTER.test(pageText);

export type DoorStep = "admit" | "open-list" | "close-list" | null;

export function createDoor(patienceMs: number, settleMs: number) {
  let waitingSince: number | null = null;
  let listOpenedAt: number | null = null;
  let quietUntil = 0;

  return (
    seen: { admit: boolean; waiting: boolean },
    now: number,
  ): DoorStep => {
    if (seen.admit) {
      waitingSince = null;
      quietUntil = now + settleMs;
      if (listOpenedAt !== null) listOpenedAt = now;
      return "admit";
    }
    if (listOpenedAt !== null) {
      if (now - listOpenedAt < patienceMs) return null;
      listOpenedAt = null;
      quietUntil = now + settleMs;
      return "close-list";
    }
    if (!seen.waiting || now < quietUntil) {
      waitingSince = null;
      return null;
    }
    waitingSince ??= now;
    if (now - waitingSince < patienceMs) return null;
    waitingSince = null;
    listOpenedAt = now;
    return "open-list";
  };
}

export function createAloneWatch(aloneMs: number) {
  let hadCompany = false;
  let aloneSince: number | null = null;

  return (count: number | null, now: number) => {
    if (count === null || count > 1) {
      if (count !== null) hadCompany = true;
      aloneSince = null;
      return false;
    }
    if (!hadCompany) return false;
    aloneSince ??= now;
    return now - aloneSince >= aloneMs;
  };
}
