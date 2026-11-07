import type { Meeting, TranscriptSegment } from "../../../../server/db/schema";
import { MEET_URL, STAND_IN_SPEAKER } from "../../../../shared/meetings";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const JOIN_EARLY_MS = MINUTE_MS;
const JOIN_LATE_MS = 15 * MINUTE_MS;
const POLL_MS = 4000;

export const NOTES_WAIT_MS = 10 * MINUTE_MS;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export function dayLabel(iso: string, now = new Date()) {
  const days = Math.round(
    (startOfDay(new Date(iso)) - startOfDay(now)) / DAY_MS,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function startsIn(iso: string, now = Date.now()) {
  const minutes = Math.round((Date.parse(iso) - now) / MINUTE_MS);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${plural(minutes, "minute")}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return `in ${plural(hours, "hour")}${rest ? ` ${plural(rest, "minute")}` : ""}`;
  }
  return `in ${plural(Math.round(hours / 24), "day")}`;
}

export function briefingProblem(
  form: Pick<Meeting, "title" | "meetUrl" | "ownerName"> & { startsAt: string },
  needsFutureTime = true,
  now = Date.now(),
) {
  if (!form.title.trim()) return "Give this call a name.";
  if (!MEET_URL.test(form.meetUrl.trim())) {
    return "That isn't a Google Meet link. It should look like https://meet.google.com/abc-defg-hij.";
  }
  if (!form.ownerName.trim()) return "Add your name.";
  if (needsFutureTime && Date.parse(form.startsAt) <= now) {
    return "Pick a time in the future.";
  }
  return null;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalInput(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const fromLocalInput = (value: string) => new Date(value).toISOString();

export function nextHour() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date.toISOString();
}

type MeetingTimes = Pick<
  Meeting,
  "status" | "startsAt" | "startedAt" | "endedAt" | "createdAt"
>;

export const startOf = (meeting: MeetingTimes) =>
  meeting.startsAt ?? meeting.startedAt ?? meeting.createdAt;

export const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export function whenPhrase(iso: string, now = new Date()) {
  const day = dayLabel(iso, now);
  const relative = ["Today", "Tomorrow", "Yesterday"].includes(day);
  return `${relative ? day.toLowerCase() : `on ${day}`} at ${timeOf(iso)}`;
}

export const wasMissed = (meeting: MeetingTimes, now = new Date()) =>
  meeting.status === "draft" &&
  Date.parse(startOf(meeting)) + JOIN_LATE_MS < now.getTime();

export const someoneElseSpoke = (
  transcript: Pick<TranscriptSegment, "speaker">[],
) => transcript.some((line) => line.speaker !== STAND_IN_SPEAKER);

export function refreshEvery(
  meeting: MeetingTimes & Pick<Meeting, "notes">,
  heardSomeone: boolean,
  now = new Date(),
): number | false {
  if (meeting.status === "live") return POLL_MS;
  if (meeting.status === "ended") {
    const ended = Date.parse(meeting.endedAt ?? startOf(meeting));
    const notesDue =
      meeting.notes === null &&
      heardSomeone &&
      now.getTime() - ended < NOTES_WAIT_MS;
    return notesDue ? POLL_MS : false;
  }
  const opensIn = Date.parse(startOf(meeting)) - JOIN_EARLY_MS - now.getTime();
  if (opensIn > 0) return Math.min(Math.max(opensIn, POLL_MS), DAY_MS);
  return wasMissed(meeting, now) ? false : POLL_MS;
}

export function statusSentence(meeting: MeetingTimes, now = new Date()) {
  const start = startOf(meeting);
  if (meeting.status === "live") return "Stand-in is in this call now.";
  if (meeting.status === "ended") {
    return `Finished ${whenPhrase(meeting.endedAt ?? start, now)}.`;
  }
  if (wasMissed(meeting, now)) {
    return `Missed. Stand-in did not join ${whenPhrase(start, now)}.`;
  }
  if (Date.parse(start) <= now.getTime()) {
    return "Starting now. Stand-in should join within a minute.";
  }
  return `Scheduled. Stand-in joins ${whenPhrase(start, now)}.`;
}

export function outcomeSentence(hasNotes: boolean, waitingQuestions: number) {
  const notes = hasNotes ? "Notes ready" : "Notes not written yet";
  return waitingQuestions
    ? `${notes}, ${plural(waitingQuestions, "question")} for you.`
    : `${notes}.`;
}

export type NoteBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] };

const BULLET = /^\s*[-*•]\s+/;
const MAX_HEADING_LENGTH = 60;

export function parseNotes(text: string) {
  const blocks: NoteBlock[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (BULLET.test(line)) {
      const item = line.replace(BULLET, "");
      const last = blocks[blocks.length - 1];
      if (last?.kind === "bullets") last.items.push(item);
      else blocks.push({ kind: "bullets", items: [item] });
      continue;
    }
    const clean = line.replace(/^#+\s*/, "");
    const heading = clean.length <= MAX_HEADING_LENGTH && !/[.!?]$/.test(clean);
    blocks.push(
      heading
        ? { kind: "heading", text: clean.replace(/:$/, "") }
        : { kind: "paragraph", text: clean },
    );
  }
  return blocks;
}
