import {
  createAISDKEngine,
  getAgentEngineEntry,
  registerAgentEngine,
} from "@agent-native/core/agent/engine";
import { createOpenAI } from "@ai-sdk/openai";

const ENGINE_NAME = "opencode-go";
const BASE_URL = "https://opencode.ai/inference/go/openai/v1";
const MODEL = "deepseek-v4.1-flash";
const HEADERS = {
  "user-agent": "stand-in/0.1",
  "x-opencode-session": "stand-in",
};
const API_KEY_ENV = "OPENAI_API_KEY";

const apiKey = () => process.env[API_KEY_ENV]; // guard:allow-env-credential — deployment-owned setting, never per-user

export function chatModel() {
  const key = apiKey();
  if (!key) throw new Error(`Set ${API_KEY_ENV}.`);
  return createOpenAI({
    apiKey: key,
    baseURL: BASE_URL,
    headers: HEADERS,
  }).chat(MODEL);
}

