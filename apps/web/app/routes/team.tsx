import { Navigate } from "react-router";

import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: `Team — ${APP_TITLE}` }];
}

