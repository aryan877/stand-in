type Owner = { ownerName: string };

export function splitFacts(mayShare: string): string[] {
  return mayShare
    .split(/\r?\n/)
    .map((fact) => fact.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

export const introduction = ({ ownerName }: Owner) =>
  `Hi, I'm ${ownerName}'s AI stand-in. ${ownerName} can't join today. I'm taking notes, I can answer a few things ${ownerName} prepared, and I'll pass everything else on.`;

export const noteForOwner = ({ ownerName }: Owner) =>
  `${ownerName} can't answer that today. I've noted it, and ${ownerName} will get back to you after the call.`;

