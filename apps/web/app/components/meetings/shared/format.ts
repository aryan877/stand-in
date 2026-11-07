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

