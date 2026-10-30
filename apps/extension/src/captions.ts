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

