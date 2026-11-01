// spike: throwaway probe, do not merge

import { isActionContractError } from "@agent-native/core/action";
import { beforeAll, describe, expect, it } from "vitest";

import migrations from "../plugins/db";
import {
  answerQuestion,
  claimNextLine,
  createMeeting,
  createQuestion,
  deleteMeeting,
  dueMeetings,
  finishMeeting,
  getMeeting,
  getMeetingDetail,
  leaveAt,
  listFollowUps,
  listMeetings,
  queueLine,
  releaseLine,
  saveNotes,
  startMeeting,
  updateActionItem,
} from "./store";

const MAYA = "maya@example.com";
const TOM = "tom@example.com";

const briefing = {
  title: "Launch sync",
  ownerName: "Maya",
  meetUrl: "https://meet.google.com/abc-defg-hij",
  agenda: "",
  mayShare: "",
  mustAsk: "",
  startsAt: "2026-11-09T09:00:00.000Z",
  durationMinutes: 30,
};

