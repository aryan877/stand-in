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

