import { Navigate } from "react-router";

import { APP_TITLE } from "@/lib/app-config";
import { MEETINGS_PATH } from "@/lib/chat-paths";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function HomeRoute() {
  return <Navigate to={MEETINGS_PATH} replace />;
}
