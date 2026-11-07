import { useT } from "@agent-native/core/client/i18n";
import { useSetPageTitle } from "@agent-native/toolkit/app-shell";
import {
  AccountSettingsCard,
  useAgentSettingsTabs,
} from "@agent-native/toolkit/app/settings";
import { Link, useLocation } from "react-router";

import { APP_TITLE } from "@/lib/app-config";
import { cn } from "@/lib/utils";

const PROFILE_PATH = "/settings";
const OTHER_APPS_PATH = "/settings/other-apps";
const TABS = [
  { path: PROFILE_PATH, label: "Profile and security" },
  { path: OTHER_APPS_PATH, label: "Use from other AI apps" },
];

export function meta() {
  return [{ title: `Settings - ${APP_TITLE}` }];
}

