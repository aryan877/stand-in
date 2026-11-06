import { signOut, useSession } from "@agent-native/core/client/hooks";
import { IconLogout, IconSettings } from "@tabler/icons-react";
import { useNavigate } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const { session } = useSession();
  const navigate = useNavigate();
  const email = session?.email ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Your account"
          className={cn(
            "flex items-center text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed
              ? "size-8 justify-center rounded-md"
              : "h-11 min-w-0 flex-1 gap-3 rounded-lg px-3 text-sm",
          )}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
            {email.charAt(0).toUpperCase()}
          </span>
          {collapsed ? null : <span className="truncate">{email}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <IconSettings className="size-4" aria-hidden />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut({ redirectTo: "/" })}>
          <IconLogout className="size-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
