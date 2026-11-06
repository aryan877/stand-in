import type { FilePart } from "@agent-native/agentkit";
import type { AppShellSkeletonLayout } from "@agent-native/toolkit/app/shared";
import {
  COMPOSER_CONTEXT_MAX_BYTES,
  COMPOSER_CONTEXT_MAX_ITEMS,
  type PromptComposerSubmitOptions,
  type Reference,
} from "@agent-native/toolkit/composer";

export const HOME_PATH = "/home";
export const MEETINGS_PATH = "/meetings";

export const isMeetingPath = (pathname: string) =>
  pathname === MEETINGS_PATH ||
  (pathname.startsWith(`${MEETINGS_PATH}/`) &&
    pathname !== `${MEETINGS_PATH}/new`);
export const NEW_CHAT_PATH = "/chat";

const FAILED_CHAT_HANDOFF_PREFIX = "agent-native.chat.failed-handoff:";
const MAX_FAILED_HANDOFF_BYTES = COMPOSER_CONTEXT_MAX_BYTES * 2 + 32 * 1024;
const MAX_HANDOFF_FIELD_LENGTH = 8 * 1024;
const MAX_HANDOFF_ITEMS = 20;
const INVALID_JSON_VALUE = Symbol("invalid-json-value");
// Keyed by the type: a new submit option fails tsc here until it is validated
// in normalizeComposerOptions or omitted and stripped in chatHandoffComposerOptions.
const HANDOFF_COMPOSER_OPTION_KEYS = new Set(
  Object.keys({
    mode: true,
    engine: true,
    model: true,
    effort: true,
    intent: true,
    steer: true,
    composerModeContext: true,
    references: true,
    uploadedAttachments: true,
    contextItems: true,
  } satisfies Record<keyof ChatInitialComposerOptions, true>),
);

export function chatThreadPath(threadId: string | null | undefined): string {
  return threadId
    ? `${NEW_CHAT_PATH}/${encodeURIComponent(threadId)}`
    : NEW_CHAT_PATH;
}

export function isChatPathname(pathname: string): boolean {
  return pathname === NEW_CHAT_PATH || pathname.startsWith(`${NEW_CHAT_PATH}/`);
}

/** The loading shell that matches the page each path opens. */
export function skeletonLayoutForPath(
  pathname: string,
): AppShellSkeletonLayout {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  if (path === HOME_PATH) return "home";
  if (path === NEW_CHAT_PATH) return "assistant-new";
  return "assistant";
}

export function threadIdFromPath(pathname: string): string | null {
  const encoded = pathname.match(/^\/chat\/([^/]+)/)?.[1];
  if (encoded === undefined) return null;
  try {
    const value = decodeURIComponent(encoded).trim();
    return value || null;
    // coercion-ok: a malformed percent-encoding is not a thread id, so the path has no thread.
  } catch {
    return null;
  }
}

export type ChatInitialComposerOptions = Omit<
  PromptComposerSubmitOptions,
  "onLocalSubmit" | "attachments" | "requestMode" | "submissionId"
> & {
  mode?: "act" | "plan";
  references?: readonly Reference[];
  uploadedAttachments?: readonly FilePart[];
};

/** A composer's submit options as the chat page it opens replays them. */
export function chatHandoffComposerOptions(
  options: PromptComposerSubmitOptions,
  handoff: Pick<
    ChatInitialComposerOptions,
    "references" | "uploadedAttachments"
  >,
): ChatInitialComposerOptions {
  const {
    onLocalSubmit: _onLocalSubmit,
    attachments: _attachments,
    // Names the sending composer's optimistic copy, which unmounts with it.
    submissionId: _submissionId,
    requestMode,
    ...submitOptions
  } = options;
  return { ...submitOptions, mode: requestMode ?? "act", ...handoff };
}

/** Router state that carries a prompt typed elsewhere into the chat it opens. */
export interface ChatRouteState {
  initialMessage: string;
  initialComposerOptions?: ChatInitialComposerOptions;
}

export interface FailedChatHandoffEnvelope {
  text: string;
  options: ChatInitialComposerOptions;
}

export type FailedChatHandoffReadResult =
  | { status: "found"; handoff: FailedChatHandoffEnvelope }
  | { status: "absent" }
  | {
      status: "invalid";
      reason:
        | "invalid-thread-id"
        | "too-large"
        | "invalid-json"
        | "invalid-envelope";
      cause?: unknown;
    }
  | { status: "unavailable"; cause: unknown };

export type FailedChatHandoffWriteResult =
  | { status: "stored" }
  | {
      status: "invalid";
      reason: "invalid-thread-id" | "invalid-options" | "payload-too-large";
    }
  | { status: "unavailable"; cause: unknown };

export type FailedChatHandoffClearResult =
  | { status: "cleared" }
  | { status: "absent" }
  | { status: "unavailable"; cause: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeJsonValue(
  value: unknown,
  depth = 0,
): unknown | typeof INVALID_JSON_VALUE {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.length <= MAX_HANDOFF_FIELD_LENGTH
      ? value
      : INVALID_JSON_VALUE;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : INVALID_JSON_VALUE;
  }
  if (depth >= 5) return INVALID_JSON_VALUE;
  if (Array.isArray(value)) {
    if (value.length > MAX_HANDOFF_ITEMS) return INVALID_JSON_VALUE;
    const normalized = value.map((item) => normalizeJsonValue(item, depth + 1));
    return normalized.some((item) => item === INVALID_JSON_VALUE)
      ? INVALID_JSON_VALUE
      : normalized;
  }
  if (!isRecord(value)) return INVALID_JSON_VALUE;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return INVALID_JSON_VALUE;
  }
  const entries = Object.entries(value);
  if (entries.length > MAX_HANDOFF_ITEMS) return INVALID_JSON_VALUE;
  const normalized: Record<string, unknown> = {};
  for (const [key, entry] of entries) {
    if (key.length > 128) return INVALID_JSON_VALUE;
    const normalizedEntry = normalizeJsonValue(entry, depth + 1);
    if (normalizedEntry === INVALID_JSON_VALUE) return INVALID_JSON_VALUE;
    normalized[key] = normalizedEntry;
  }
  return normalized;
}

function copyOptionalString(
  source: Record<string, unknown>,
  key: string,
  target: Record<string, unknown>,
  maxLength = MAX_HANDOFF_FIELD_LENGTH,
): boolean {
  if (!(key in source)) return true;
  const value = source[key];
  if (value === undefined || value === null) return true;
  if (typeof value !== "string" || value.length > maxLength) return false;
  target[key] = value;
  return true;
}

function normalizeReference(value: unknown): Reference | null {
  if (!isRecord(value)) return null;
  const types = ["file", "skill", "mention", "agent", "custom-agent"];
  if (!types.includes(String(value.type))) return null;
  const result: Record<string, unknown> = { type: value.type };
  for (const key of ["path", "name", "source"] as const) {
    if (typeof value[key] !== "string" || value[key].length > 4096) {
      return null;
    }
    result[key] = value[key];
  }
  for (const key of ["refType", "refId", "slotKey", "slotLabel"]) {
    if (!copyOptionalString(value, key, result, 4096)) return null;
  }
  if (
    "metadata" in value &&
    value.metadata !== undefined &&
    value.metadata !== null
  ) {
    const metadata = normalizeJsonValue(value.metadata);
    if (!isRecord(metadata)) return null;
    result.metadata = metadata;
  }
  return result as unknown as Reference;
}

function normalizeFilePart(value: unknown): FilePart | null {
  if (!isRecord(value) || value.type !== "file") return null;
  if (typeof value.name !== "string" || value.name.length > 1024) return null;
  const result: Record<string, unknown> = { type: "file", name: value.name };
  if (!copyOptionalString(value, "mediaType", result, 512)) return null;
  if (!copyOptionalString(value, "fileId", result, 1024)) return null;
  if (!copyOptionalString(value, "url", result, 4096)) return null;
  if (typeof result.url === "string" && /^\s*data:/i.test(result.url)) {
    return null;
  }
  if ("omitted" in value) {
    if (value.omitted !== "inline-bytes" && value.omitted !== "unsafe-url") {
      return null;
    }
    result.omitted = value.omitted;
  }
  return result as unknown as FilePart;
}

