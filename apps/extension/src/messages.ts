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

export type PageBody =
  | { type: "enable" }
  | { type: "disable" }
  | { type: "say"; audioBase64: string; id: string }
  | { type: "said"; id: string; ok: boolean };

export type PageMessage = { channel: typeof PAGE_CHANNEL } & PageBody;

export const pageMessage = (body: PageBody): PageMessage => ({
  channel: PAGE_CHANNEL,
  ...body,
});

export const isPageMessage = (
  event: MessageEvent,
): event is MessageEvent<PageMessage> =>
  event.source === window && event.data?.channel === PAGE_CHANNEL;
