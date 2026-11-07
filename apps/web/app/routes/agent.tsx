import { buildLegacyAgentSettingsRoute } from "@agent-native/core/client/navigation";
import { Navigate, useLocation } from "react-router";

export function meta() {
  return [{ title: "Agent settings" }]; // i18n-ignore legacy meta fallback; the client title is localized
}

