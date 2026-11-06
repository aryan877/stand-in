import { markClientDraftThread } from "@agent-native/toolkit/app/chat/agentkit-chat/rail";

const CHAT_HOME_THREAD_STORAGE_KEY = "agent-native.chat-home-thread";
const CHAT_HOME_THREAD_TTL_MS = 10 * 60 * 1000;

type PendingChatHomeThread = {
  id: string;
  issuedAt: number;
};

function createChatThreadId(): string {
  return `chat-${
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36)
  }`;
}

