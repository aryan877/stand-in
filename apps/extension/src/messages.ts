export const PAGE_CHANNEL = "stand-in";

export type Session = { meetingId: string };

export type RuntimeMessage =
  | { type: "open-meeting"; meetingId: string; meetUrl: string }
  | { type: "session" }
  | { type: "end-session"; closeTab?: boolean }
  | { type: "action"; name: string; args: Record<string, unknown> };

export type ActionResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: string };

