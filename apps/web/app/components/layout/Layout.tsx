import { useT } from "@agent-native/core/client/i18n";
import {
  HeaderActionsProvider,
  useHeaderActions,
  useHeaderTitle,
} from "@agent-native/toolkit/app-shell/header-actions";
import {
  isAgentChatHomeHandoffActive,
  useAgentChatHomeHandoff,
  useAgentChatHomeHandoffLinks,
} from "@agent-native/toolkit/app/chat/agentkit-chat/rail";
import {
  RealtimeVoiceModeProvider,
  useRealtimeVoiceModeOptional,
} from "@agent-native/toolkit/app/chat/composer";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useJoinMeetingCommand } from "@/hooks/use-join-meeting-command";
import { APP_TITLE } from "@/lib/app-config";
import { isChatPathname } from "@/lib/chat-paths";
import { TAB_ID } from "@/lib/tab-id";

import { AgentInspector } from "./AgentInspector";
import { MobileAppBar } from "./MobileAppBar";
import { Sidebar } from "./Sidebar";

const Header = lazy(() =>
  import("./Header").then((module) => ({ default: module.Header })),
);

interface LayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSE_KEY = "chat.sidebar.collapsed";

function routeOwnsToolbar(pathname: string): boolean {
  return (
    isChatPathname(pathname) ||
    pathname === "/database" ||
    pathname.startsWith("/extensions")
  );
}

function EndVoiceChatOutsideChat() {
  const { pathname } = useLocation();
  const end = useRealtimeVoiceModeOptional()?.end;
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    if (!isChatPathname(pathname)) end?.();
  }, [end, pathname]);

  return null;
}

export function Layout({ children }: LayoutProps) {
  useJoinMeetingCommand();
  return (
    <RealtimeVoiceModeProvider browserTabId={TAB_ID}>
      <EndVoiceChatOutsideChat />
      <LayoutShell>{children}</LayoutShell>
    </RealtimeVoiceModeProvider>
  );
}

