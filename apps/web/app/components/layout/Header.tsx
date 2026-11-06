import {
  useHeaderTitle,
  useHeaderActions,
} from "@agent-native/toolkit/app-shell";
import { NotificationsBell } from "@agent-native/toolkit/app/notifications";

import { MobileAppBar } from "./MobileAppBar";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const title = useHeaderTitle();
  const actions = useHeaderActions();

  return (
    <MobileAppBar
      className="md:ps-4"
      onOpenNavigation={onOpenMobileSidebar}
      title={title}
      actions={
        <>
          {actions}
          <NotificationsBell
            emptyTitle="Nothing new"
            emptyDescription="People waiting for your reply and finished notes show up here."
          />
        </>
      }
    />
  );
}
