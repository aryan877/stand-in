import { PAGE_CHANNEL, type RuntimeMessage } from "./messages";

document.documentElement.dataset.standInExtension = "ready";

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const { channel, meetingId, meetUrl } = event.data ?? {};
  if (channel !== PAGE_CHANNEL || typeof meetingId !== "string") return;
  if (typeof meetUrl !== "string") return;
  const message: RuntimeMessage = { type: "open-meeting", meetingId, meetUrl };
  void chrome.runtime.sendMessage(message);
});
