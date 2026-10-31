import {
  createAloneWatch,
  createAnnouncement,
  createDoor,
  isWaitingToEnter,
} from "./call-rules";
import { type CaptionLine, createCaptionTracker } from "./captions";
import {
  type ActionResult,
  isPageMessage,
  type PageBody,
  type PageMessage,
  pageMessage,
  type RuntimeMessage,
  type Session,
} from "./messages";

const POLL_MS = 1000;
const CAPTION_IDLE_MS = 1400;
const JOIN_TIMEOUT_MS = 30_000;
const ADMIT_TIMEOUT_MS = 10 * 60_000;
const CAPTIONS_BUTTON_MS = 15_000;
const SPEAK_TIMEOUT_MS = 60_000;
const ALONE_LEAVE_MS = 60_000;
const KNOCK_PATIENCE_MS = 3000;
const KNOCK_SETTLE_MS = 12_000;
const COUNT_WAIT_MS = 15_000;
const TILES_SETTLE_MS = 5000;
const INTRO_TIMEOUT_MS = 2 * 60_000;
const START_ATTEMPTS = 3;
const LEFT_AFTER_MISSES = 3;
const SESSION_TRIES = 10;
const SESSION_RETRY_MS = 200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const post = (message: PageBody) =>
  window.postMessage(pageMessage(message), location.origin);

class ActionError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const send = <T>(message: RuntimeMessage) =>
  chrome.runtime.sendMessage(message) as Promise<T>;

async function callAction<T>(name: string, args: Record<string, unknown>) {
  const result = await send<ActionResult>({ type: "action", name, args });
  if (!result.ok) throw new ActionError(result.status, result.error);
  return result.data as T;
}

const CONTROLS = 'button, [role="button"], [role="checkbox"]';

function findButton(pattern: RegExp) {
  return [...document.querySelectorAll<HTMLButtonElement>(CONTROLS)].find(
    (button) =>
      !button.disabled &&
      pattern.test(
        `${button.innerText} ${button.getAttribute("aria-label") ?? ""}`.trim(),
      ),
  );
}

async function waitForButton(pattern: RegExp, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const button = findButton(pattern);
    if (button) return button;
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${pattern}`);
}

function waitForMessage(
  matches: (message: PageMessage) => boolean,
  timeoutMs: number,
) {
  return new Promise<PageMessage | null>((resolve) => {
    const timer = setTimeout(() => done(null), timeoutMs);
    const onMessage = (event: MessageEvent) => {
      if (isPageMessage(event) && matches(event.data)) done(event.data);
    };
    const done = (message: PageMessage | null) => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(message);
    };
    window.addEventListener("message", onMessage);
  });
}

async function speak(audioBase64: string) {
  const id = crypto.randomUUID();
  const said = waitForMessage(
    (message) => message.type === "said" && message.id === id,
    SPEAK_TIMEOUT_MS,
  );
  post({ type: "say", audioBase64, id });
  return said;
}

type Call = {
  live: boolean;
  announcement: ReturnType<typeof createAnnouncement>;
};

async function waitForCompany(isLive: () => boolean) {
  await sleep(TILES_SETTLE_MS);
  const giveUpAt = Date.now() + COUNT_WAIT_MS;
  while (isLive()) {
    const count = readParticipantCount();
    if (count === null ? Date.now() >= giveUpAt : count > 1) return;
    await sleep(POLL_MS);
  }
}

async function speakQueue(id: string, call: Call) {
  await waitForCompany(() => call.live);
  call.announcement = createAnnouncement(Date.now() + INTRO_TIMEOUT_MS);
  while (call.live) {
    try {
      const next = await callAction<{ line: { audioBase64: string } | null }>(
        "next-utterance",
        {
          meetingId: id,
        },
      );
      if (next.line) {
        const said = await speak(next.line.audioBase64);
        if (said?.type === "said" && said.ok) call.announcement.played();
        else call.announcement.lost();
      } else {
        call.announcement.queueEmpty();
        await sleep(POLL_MS);
      }
    } catch (error) {
      if (error instanceof ActionError && error.status === 409) {
        findButton(/leave call/i)?.click();
        return;
      }
      call.announcement.queueFailed();
      await sleep(POLL_MS);
    }
  }
}

function readCaptionRows() {
  const region = document.querySelector(
    '[role="region"][aria-label*="aption"]',
  );
  if (!region) return [];
  return [...region.children].flatMap((row) => {
    const parts = (row as HTMLElement).innerText
      .split("\n")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 2 || /^[a-z]+(_[a-z0-9]+)+$/.test(parts[0]!)) return [];
    const line: CaptionLine = {
      speaker: parts[0]!,
      text: parts.slice(1).join(" "),
    };
    return [{ row, line }];
  });
}

function readParticipantCount() {
  const tiles = document.querySelectorAll("[data-participant-id]");
  const people = new Set(
    [...tiles].map((tile) => tile.getAttribute("data-participant-id")),
  );
  return people.size || null;
}

function watchCaptions(id: string, isOpen: () => boolean) {
  const record = ({ speaker, text }: CaptionLine) =>
    void callAction("add-transcript-line", {
      meetingId: id,
      speaker,
      body: text,
    }).catch(console.error);
  const trackers = new Map<Element, ReturnType<typeof createCaptionTracker>>();

  return setInterval(() => {
    const now = Date.now();
    for (const { row, line } of readCaptionRows()) {
      let tracker = trackers.get(row);
      if (!tracker) {
        tracker = createCaptionTracker(record, CAPTION_IDLE_MS, isOpen);
        trackers.set(row, tracker);
      }
      tracker.observe(line, now);
    }
    for (const [row, tracker] of trackers) {
      if (row.isConnected) continue;
      tracker.observe(undefined, now);
      if (tracker.idle) trackers.delete(row);
    }
  }, 250);
}

async function turnOnCaptions() {
  if (findButton(/turn off captions|live captions/i)) return;
  const direct = findButton(/turn on captions/i);
  if (direct) return direct.click();
  (
    await waitForButton(/captions and translation/i, CAPTIONS_BUTTON_MS).catch(
      () => null,
    )
  )?.click();
  (
    await waitForButton(/turn on captions/i, CAPTIONS_BUTTON_MS).catch(
      () => null,
    )
  )?.click();
}

async function startMeeting(id: string) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await callAction<{ leaveAt: string; letPeopleIn: boolean }>(
        "start-meeting",
        { id },
      );
    } catch (error) {
      if (attempt >= START_ATTEMPTS) throw error;
      await sleep(POLL_MS * 2);
    }
  }
}

async function stillInCall(leaveAt: number) {
  if (Date.now() > leaveAt) {
    findButton(/leave call/i)?.click();
    return false;
  }
  for (let miss = 0; miss < LEFT_AFTER_MISSES; miss += 1) {
    if (findButton(/leave call/i)) return true;
    await sleep(POLL_MS);
  }
  return false;
}

async function waitUntilInCall() {
  const deadline = Date.now() + ADMIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (findButton(/leave call/i) && !isWaitingToEnter(document.body.innerText))
      return;
    await sleep(POLL_MS);
  }
  throw new Error("Nobody let Stand-in into the call");
}

function letInWhoeverKnocks(door: ReturnType<typeof createDoor>) {
  const admit = findButton(/^admit/i);
  const waiting = findButton(/guests? waiting/i);
  const step = door(
    { admit: Boolean(admit), waiting: Boolean(waiting) },
    Date.now(),
  );
  if (step === "admit") admit?.click();
  if (step === "open-list") waiting?.click();
  if (step === "close-list") {
    findButton(/^(close )?close$/i)?.click();
    // Meet hands focus to a toolbar button here, which leaves its tooltip up.
    setTimeout(
      () => (document.activeElement as HTMLElement | null)?.blur(),
      600,
    );
  }
}

async function runSession(id: string) {
  const join = await waitForButton(
    /^(join now|join here too|ask to join)/i,
    JOIN_TIMEOUT_MS,
  );
  findButton(/turn on microphone/i)?.click();
  findButton(/turn off camera/i)?.click();
  await sleep(400);
  join.click();

  await waitUntilInCall();
  findButton(/turn on microphone/i)?.click();
  findButton(/turn off camera/i)?.click();
  const { leaveAt, letPeopleIn } = await startMeeting(id);
  void turnOnCaptions();

  const call: Call = {
    live: true,
    announcement: createAnnouncement(Number.POSITIVE_INFINITY),
  };
  const captionTimer = watchCaptions(id, () => call.announcement.announced);
  void speakQueue(id, call);

  const isAlone = createAloneWatch(ALONE_LEAVE_MS);
  const door = createDoor(KNOCK_PATIENCE_MS, KNOCK_SETTLE_MS);
  while (await stillInCall(Date.parse(leaveAt))) {
    if (letPeopleIn) letInWhoeverKnocks(door);
    const now = Date.now();
    if (
      call.announcement.expired(now) ||
      isAlone(readParticipantCount(), now)
    ) {
      findButton(/leave call/i)?.click();
      break;
    }
    await sleep(POLL_MS * 2);
  }
  call.live = false;
  clearInterval(captionTimer);
  await callAction("finish-meeting", { id }).catch(() => null);
  await send({ type: "end-session" });
}

async function findSession() {
  for (let attempt = 0; attempt < SESSION_TRIES; attempt += 1) {
    const session = await send<Session | null>({ type: "session" });
    if (session) return session;
    await sleep(SESSION_RETRY_MS);
  }
  return null;
}

void (async () => {
  const session = await findSession();
  post({ type: session ? "enable" : "disable" });
  if (!session) return;
  try {
    await runSession(session.meetingId);
  } catch (error) {
    console.warn("[stand-in] left the session:", error);
    await send({ type: "end-session", closeTab: true });
  }
})();
