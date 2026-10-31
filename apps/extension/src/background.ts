import type { ActionResult, RuntimeMessage, Session } from "./messages";

type TabSession = Session & { origin: string };

const MEET_TAB_ACTIONS = new Set([
  "start-meeting",
  "add-transcript-line",
  "next-utterance",
  "finish-meeting",
]);

const TAB_PREFIX = "tab:";
const tabKey = (tabId: number) => `${TAB_PREFIX}${tabId}`;

const CHECK_ALARM = "check-due-meetings";
const CHECK_EVERY_MINUTES = 0.5;
const KEEP_AWAKE_MS = 12 * 60 * 60_000;

const isMeetLink = (link: string) => {
  try {
    const url = new URL(link);
    return url.protocol === "https:" && url.hostname === "meet.google.com";
  } catch {
    return false;
  }
};

async function sessionFor(tabId: number | undefined) {
  if (tabId === undefined) return null;
  const key = tabKey(tabId);
  return (
    ((await chrome.storage.session.get(key))[key] as TabSession | undefined) ??
    null
  );
}

async function openMeeting(
  origin: string,
  meetingId: string,
  meetUrl: string,
  { focusExisting }: { focusExisting: boolean },
) {
  const sessions = await chrome.storage.session.get(null);
  const existing = Object.entries(sessions).find(
    ([key, session]) =>
      key.startsWith(TAB_PREFIX) &&
      (session as TabSession).meetingId === meetingId,
  );
  if (existing) {
    const tabId = Number(existing[0].slice(TAB_PREFIX.length));
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab) {
      if (focusExisting) await chrome.tabs.update(tabId, { active: true });
      return;
    }
    await chrome.storage.session.remove(existing[0]);
  }
  const tab = await chrome.tabs.create({ url: meetUrl, active: true });
  if (tab.id === undefined) return;
  if (!focusExisting)
    await chrome.windows.update(tab.windowId, { focused: true });
  const session: TabSession = { origin, meetingId };
  await chrome.storage.session.set({ [tabKey(tab.id)]: session });
  await chrome.tabs.update(tab.id, { muted: true });
}

const appOrigins = () =>
  ((chrome.runtime.getManifest().host_permissions ?? []) as string[])
    .filter((pattern) => !pattern.includes("meet.google.com"))
    .map((pattern) => new URL(pattern.replace(/\*$/, "")).origin);

