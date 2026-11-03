import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { approveWhenModelCalls } from "../server/meetings/approval.js";
import { deleteMeeting, requireOwner } from "../server/meetings/store.js";

