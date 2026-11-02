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

