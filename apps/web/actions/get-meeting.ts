import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { getMeetingDetail, requireOwner } from "../server/meetings/store.js";

