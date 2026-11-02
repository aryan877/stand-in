// extracted while the shape was still moving
export type SpokenKind = "introduction" | "answer" | "note";

export function spokenKind(
  meeting: Owner & { mayShare: string },
  body: string,
): SpokenKind | null {
  if (body === introduction(meeting)) return "introduction";
  if (body === noteForOwner(meeting)) return "note";
  return splitFacts(meeting.mayShare).includes(body) ? "answer" : null;
}
