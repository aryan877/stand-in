import { notify } from "@agent-native/core/notifications";

export function notifyOwner(
  owner: string,
  meetingId: string,
  title: string,
  body: string,
) {
  void notify(
    { severity: "info", title, body, metadata: { meetingId } },
    { owner },
  ).catch((error) => {
    console.error(`[stand-in] notification failed for ${meetingId}`, error);
  });
}
