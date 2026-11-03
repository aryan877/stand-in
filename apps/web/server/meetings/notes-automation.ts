import { resourcePut } from "@agent-native/core/resources";

import { MEETING_ENDED } from "./events.js";

const PATH = "jobs/stand-in-meeting-notes.md";

const automation = (ownerEmail: string) => `---
schedule: ""
enabled: true
triggerType: event
event: "${MEETING_ENDED}"
mode: agentic
domain: "meetings"
appId: "stand-in"
createdBy: ${ownerEmail}
runAs: creator
---

Write the notes and action items for the Stand-in meeting that just ended.

1. Call get-meeting with the meetingId from the event payload and read the whole transcript.
2. If the meeting already has notes or has no transcript, stop without saving.
3. Follow the meetings skill to write the notes and pick the action items.
   Refer to people only by name. Never use he, she, his or her.
4. Save them with save-meeting-notes, then read the meeting again to confirm they were saved.
`;

export const addNotesAutomation = (ownerEmail: string) =>
  resourcePut(ownerEmail, PATH, automation(ownerEmail));
