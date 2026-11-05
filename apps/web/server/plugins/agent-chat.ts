import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";
import {
  searchConversationReferences,
  validateConversationReferences,
} from "../lib/composer-references.js";
import { registerOpenCodeEngine } from "../lib/providers/llm.js";

const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "list-meetings",
  "get-meeting",
  "list-follow-ups",
  "create-meeting",
  "update-meeting",
  "answer-question",
  "finish-meeting",
  "join-meeting-now",
  "save-meeting-notes",
  "update-action-item",
  "ask-question",
];

registerOpenCodeEngine();

export default createAgentChatPlugin({
  appId: "stand-in",
  mentionProviders: {
    chats: {
      label: "composerSources.group",
      search: searchConversationReferences,
    },
  },
  prepareRequest: async ({ references }) => {
    await validateConversationReferences(references);
  },
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are Stand-in's assistant. Stand-in attends the user's Google Meet calls while they're away. It joins on time, speaks only answers the user prepared, and leaves everything else for the user to reply to after the call.

Help the user brief tomorrow's calls, catch up on calls they missed, and reply to the questions left for them, always through actions. Read the meetings skill before writing a briefing, preparing answers or writing notes. Prepared answers come only from facts the user gave you. Never invent one. Inspect the current screen when the user says "this". Times in action results are UTC. The current screen's timeZone is the user's time zone, so say every time in that zone and never in UTC.`,
});
