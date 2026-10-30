import { configureTracking } from "@agent-native/core/client/analytics";
import { appPath } from "@agent-native/core/client/api-path";
import { useDbSync } from "@agent-native/core/client/hooks";
import { createAgentNativeQueryClient } from "@agent-native/core/client/hooks";
import { getLocaleInitScript, useT } from "@agent-native/core/client/i18n";
import { getThemeInitScript } from "@agent-native/core/client/theme";
import { AppProviders } from "@agent-native/toolkit/app/providers";
import { useCommandMenuShortcut } from "@agent-native/toolkit/app/shared";
import { CommandMenu } from "@agent-native/toolkit/app/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useCallback, useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "react-router";
import type { LinksFunction } from "react-router";

import { Layout as AppLayout } from "@/components/layout/Layout";
import { AppToolkitProvider } from "@/components/ui/toolkit-provider";
import { useNavigationState } from "@/hooks/use-navigation-state";
import { APP_TITLE } from "@/lib/app-config";
import {
  isChatPathname,
  isMeetingPath,
  MEETINGS_PATH,
  NEW_CHAT_PATH,
  skeletonLayoutForPath,
  threadIdFromPath,
} from "@/lib/chat-paths";
import { TAB_ID } from "@/lib/tab-id";

import { i18nCatalog } from "./i18n";

import stylesheet from "./global.css?url";

configureTracking({
  getDefaultProps: (_name, properties) => ({
    ...properties,
    app: "stand-in",
    template: "chat",
  }),
});

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

const THEME_INIT_SCRIPT = getThemeInitScript("light");
const LOCALE_INIT_SCRIPT = getLocaleInitScript();

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=resizes-content"
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <script
          data-agent-native-locale-init
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }}
        />
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content={APP_TITLE} />
        <link rel="icon" type="image/svg+xml" href={appPath("/favicon.svg")} />
        <link rel="apple-touch-icon" href={appPath("/icon-180.svg")} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function DbSyncSetup() {
  const qc = useQueryClient();
  const { pathname } = useLocation();
  useNavigationState();
  useDbSync({
    queryClient: qc,
    ignoreSource: TAB_ID,
    ...(isMeetingPath(pathname)
      ? {
          realtime: {
            reason: "the Chrome extension updates the call from another tab",
          },
        }
      : {}),
  });
  return null;
}

function ThemeToggleItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const isDark = resolvedTheme === "dark";
  return (
    <CommandMenu.Item
      onSelect={() => setTheme(isDark ? "light" : "dark")}
      keywords={["theme", "dark", "light", "mode"]}
    >
      {t("root.toggleTheme")}
    </CommandMenu.Item>
  );
}

function AppContent() {
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const navigate = useNavigate();
  const t = useT();
  const location = useLocation();
  const isChatThread = threadIdFromPath(location.pathname) !== null;
  useCommandMenuShortcut(useCallback(() => setCmdkOpen(true), []));
  return (
    <>
      <CommandMenu
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        chatStorageKey="chat"
      >
        <CommandMenu.Group heading={t("root.commandActions")}>
          {isChatThread ? (
            <CommandMenu.Item
              onSelect={() =>
                window.dispatchEvent(new Event("agent-chat:new-chat"))
              }
            >
              {t("chat.newChat")}
            </CommandMenu.Item>
          ) : null}
          {location.pathname !== MEETINGS_PATH ? (
            <CommandMenu.Item onSelect={() => navigate(MEETINGS_PATH)}>
              Meetings
            </CommandMenu.Item>
          ) : null}
          {!isChatPathname(location.pathname) ? (
            <CommandMenu.Item onSelect={() => navigate(NEW_CHAT_PATH)}>
              Ask about your calls
            </CommandMenu.Item>
          ) : null}
        </CommandMenu.Group>
        <CommandMenu.Group heading={t("root.commandAppearance")}>
          <ThemeToggleItem />
        </CommandMenu.Group>
      </CommandMenu>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </>
  );
}

export default function Root() {
  const [queryClient] = useState(() => createAgentNativeQueryClient());
  const { pathname } = useLocation();
  const isLanding = pathname === "/";
  return (
    <AppToolkitProvider>
      <AppProviders
        queryClient={queryClient}
        isPublicPath={isLanding}
        defaultTheme="light"
        skeletonLayout={skeletonLayoutForPath(pathname)}
        i18n={{ catalog: i18nCatalog }}
      >
        {isLanding ? (
          <Outlet />
        ) : (
          <>
            <DbSyncSetup />
            <AppContent />
          </>
        )}
      </AppProviders>
    </AppToolkitProvider>
  );
}

export { ErrorBoundary } from "@agent-native/toolkit/app/shared/ErrorBoundary";
