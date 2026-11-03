import { defineAction } from "@agent-native/core/action";
import { writeAppStateForCurrentTab } from "@agent-native/core/application-state";
import { z } from "zod";

import { approveWhenModelCalls } from "../server/meetings/approval.js";
import {
  requireJoinableMeeting,
  requireOwner,
} from "../server/meetings/store.js";
import { JOIN_MEETING_COMMAND } from "../shared/meetings.js";

