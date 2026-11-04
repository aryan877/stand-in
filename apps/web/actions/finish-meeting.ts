import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { approveWhenModelCalls } from "../server/meetings/approval.js";
import { emitMeetingEnded } from "../server/meetings/events.js";
import {
  finishMeeting,
  getMeeting,
  heardAnyone,
  requireOwner,
} from "../server/meetings/store.js";

