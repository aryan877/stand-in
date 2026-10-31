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

type DueMeetings = {
  due: { id: string; meetUrl: string }[];
  nextStartsAt: string | null;
};

async function joinDueMeetings() {
  let keepAwake = false;
  for (const origin of appOrigins()) {
    const response = await fetch(
      `${origin}/_agent-native/actions/due-meetings`,
      {
        credentials: "include",
      },
    ).catch(() => null);
    if (!response?.ok) continue;
    const { due, nextStartsAt } = (await response.json()) as DueMeetings;
    for (const meeting of due) {
      if (isMeetLink(meeting.meetUrl)) {
        await openMeeting(origin, meeting.id, meeting.meetUrl, {
          focusExisting: false,
        });
      }
    }
    if (
      due.length ||
      (nextStartsAt && Date.parse(nextStartsAt) - Date.now() < KEEP_AWAKE_MS)
    ) {
      keepAwake = true;
    }
  }
  const sessions = await chrome.storage.session.get(null);
  if (Object.keys(sessions).some((key) => key.startsWith(TAB_PREFIX)))
    keepAwake = true;
  if (keepAwake) chrome.power.requestKeepAwake("display");
  else chrome.power.releaseKeepAwake();
}

async function callAction(
  session: TabSession,
  name: string,
  args: Record<string, unknown>,
): Promise<ActionResult> {
  if (!MEET_TAB_ACTIONS.has(name)) {
    return { ok: false, status: 403, error: `${name} isn't allowed` };
  }
  if ((args.id ?? args.meetingId) !== session.meetingId) {
    return { ok: false, status: 403, error: "Wrong meeting" };
  }
  try {
    const response = await fetch(
      `${session.origin}/_agent-native/actions/${name}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      },
    );
    if (!response.ok) {
      return { ok: false, status: response.status, error: `${name} failed` };
    }
    return { ok: true, data: await response.json() };
  } catch (error) {
    return { ok: false, status: 0, error: String(error) };
  }
}

async function handle(
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
) {
  const tabId = sender.tab?.id;
  switch (message.type) {
    case "open-meeting":
      if (sender.origin && isMeetLink(message.meetUrl)) {
        await openMeeting(sender.origin, message.meetingId, message.meetUrl, {
          focusExisting: true,
        });
      }
      return null;
    case "session": {
      const session = await sessionFor(tabId);
      return session && { meetingId: session.meetingId };
    }
    case "end-session":
      if (tabId === undefined) return null;
      await chrome.storage.session.remove(tabKey(tabId));
      if (message.closeTab) await chrome.tabs.remove(tabId);
      return null;
    case "action": {
      const session = await sessionFor(tabId);
      if (!session)
        return { ok: false, status: 403, error: "Not a Stand-in tab" };
      return callAction(session, message.name, message.args);
    }
  }
}

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, sender, respond) => {
    void handle(message, sender).then(respond);
    return true;
  },
);

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(tabKey(tabId));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM) void joinDueMeetings();
});

void chrome.alarms.create(CHECK_ALARM, {
  periodInMinutes: CHECK_EVERY_MINUTES,
});
void joinDueMeetings();
