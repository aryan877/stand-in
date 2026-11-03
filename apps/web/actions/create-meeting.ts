import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { approveUnlessChat } from "../server/meetings/approval.js";
import { addNotesAutomation } from "../server/meetings/notes-automation.js";
import {
  createMeeting,
  isOnlyMeeting,
  requireOwner,
} from "../server/meetings/store.js";
import { MEET_URL } from "../shared/meetings.js";

