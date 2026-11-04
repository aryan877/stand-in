import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { speechProvider } from "../server/lib/providers/speech.js";
import {
  claimNextLine,
  releaseLine,
  requireLiveMeeting,
  requireOwner,
} from "../server/meetings/store.js";

