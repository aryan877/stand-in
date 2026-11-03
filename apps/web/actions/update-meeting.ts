import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { approveSpokenEdits } from "../server/meetings/approval.js";
import { requireOwner, updateMeeting } from "../server/meetings/store.js";

