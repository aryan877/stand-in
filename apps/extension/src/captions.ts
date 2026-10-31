export type CaptionLine = { speaker: string; text: string };

const SELF_LABELS = new Set(["you", "you (presenting)"]);

const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean);
const normalize = (word: string) =>
  word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

export function unsentWords(sent: string, text: string) {
  const before = wordsOf(sent);
  const after = wordsOf(text);
  let shared = 0;
  while (
    shared < before.length &&
    shared < after.length &&
    normalize(before[shared]!) === normalize(after[shared]!)
  ) {
    shared += 1;
  }
  return after.slice(shared).join(" ");
}

export function createCaptionTracker(
  onLine: (line: CaptionLine) => void,
  idleMs: number,
  isOpen: () => boolean = () => true,
) {
  let pending: CaptionLine | null = null;
  let sent = "";
  let changedAt = 0;
  let heardEarly = false;

  const flush = () => {
    if (!pending) return;
    const { speaker, text } = pending;
    const drop = heardEarly;
    pending = null;
    heardEarly = false;
    const body = unsentWords(sent, text);
    sent = text;
    if (body && !drop && !SELF_LABELS.has(speaker.toLowerCase()))
      onLine({ speaker, text: body });
  };

  return {
    observe(line: CaptionLine | undefined, now: number) {
      if (line && line.text !== (pending?.text ?? sent)) {
        pending = line;
        changedAt = now;
        heardEarly ||= !isOpen();
      } else if (pending && now - changedAt > idleMs) {
        flush();
      }
    },
    get idle() {
      return pending === null;
    },
  };
}
