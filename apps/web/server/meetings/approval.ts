import type { ActionRunContext } from "@agent-native/core/action";

import { getMeeting } from "./store.js";

const MODEL_CALLERS = new Set([
  "tool",
  "mcp",
  "webmcp",
  "a2a",
  "automation",
  "cli",
]);
const GATED_FIELDS = [
  "ownerName",
  "mayShare",
  "mustAsk",
  "letPeopleIn",
] as const;

type GatedEdit = { id: string } & {
  [K in (typeof GATED_FIELDS)[number]]?: string | boolean | undefined;
};

export const approveWhenModelCalls = (_args: unknown, ctx?: ActionRunContext) =>
  MODEL_CALLERS.has(ctx?.caller ?? "");

export const approveUnlessChat = (args: unknown, ctx?: ActionRunContext) =>
  approveWhenModelCalls(args, ctx) && ctx?.caller !== "tool";

export async function approveSpokenEdits(
  args: GatedEdit,
  ctx?: ActionRunContext,
) {
  if (!approveWhenModelCalls(args, ctx)) return false;
  if (GATED_FIELDS.every((field) => args[field] === undefined)) return false;
  if (ctx?.caller !== "tool" || !ctx.userEmail) return true;
  return (await getMeeting(ctx.userEmail, args.id)).status !== "draft";
}
