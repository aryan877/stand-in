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

export default function SettingsRoute() {
  const t = useT();
  const { pathname } = useLocation();
  const otherApps = useAgentSettingsTabs({ appName: APP_TITLE }).find(
    (tab) => tab.id === "mcp",
  );
  useSetPageTitle(t("settings.title"));
  const current = pathname === OTHER_APPS_PATH ? OTHER_APPS_PATH : PROFILE_PATH;

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 pb-12 pt-4 max-sm:px-4">
      <nav aria-label="Settings" className="mb-6 flex gap-6 border-b border-border">
        {TABS.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            aria-current={current === path ? "page" : undefined}
            className={cn(
              "-mb-px flex h-11 items-center border-b-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              current === path
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {current === OTHER_APPS_PATH ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Connect another AI app, like Claude, so it can read your calls and
            help you reply. Anything it wants to say in a live call still needs
            your approval.
          </p>
          {otherApps?.content}
        </>
      ) : (
        <AccountSettingsCard />
      )}
    </div>
  );
}
