import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { respondToLine } from "../server/meetings/responder.js";
import {
  appendTranscriptLine,
  requireLiveMeeting,
  requireOwner,
} from "../server/meetings/store.js";

