import {
  ToolkitProvider,
  type ToolkitComponents,
} from "@agent-native/toolkit/provider";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { designSystem } from "@/design-system";

const components: ToolkitComponents = {
  Button: Button as NonNullable<ToolkitComponents["Button"]>,
};

