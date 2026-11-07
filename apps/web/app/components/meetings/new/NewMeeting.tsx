import {
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { MEETINGS_PATH } from "@/lib/chat-paths";

import { type MeetingForm, MeetingFields } from "../shared/BriefingFields";
import { briefingProblem, nextHour } from "../shared/format";
import {
  ActionError,
  ActionRow,
  BackToMeetings,
  Lead,
  meetingPath,
  Page,
  PageTitle,
} from "../shared/ui";

