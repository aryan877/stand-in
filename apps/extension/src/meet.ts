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

