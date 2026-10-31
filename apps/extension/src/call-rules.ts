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

