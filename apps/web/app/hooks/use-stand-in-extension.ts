import { useEffect, useState, useSyncExternalStore } from "react";

const PAGE_CHANNEL = "stand-in";
const CHECK_MS = 1500;

let checked = false;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-stand-in-extension"],
  });
  return () => observer.disconnect();
}

export function useStandInExtension() {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.standInExtension === "ready",
    () => false,
  );
}

export function useStandInExtensionMissing() {
  const ready = useStandInExtension();
  const [done, setDone] = useState(checked);
  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => {
      checked = true;
      setDone(true);
    }, CHECK_MS);
    return () => clearTimeout(timer);
  }, [done]);
  return done && !ready;
}

export function joinMeetingNow(meetingId: string, meetUrl: string) {
  window.postMessage(
    { channel: PAGE_CHANNEL, meetingId, meetUrl },
    window.location.origin,
  );
}
