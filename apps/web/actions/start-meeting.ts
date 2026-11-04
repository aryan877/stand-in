import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import {
  getMeeting,
  leaveAt,
  queueLine,
  requireOwner,
  startMeeting,
} from "../server/meetings/store.js";
import { introduction } from "../shared/spoken.js";

