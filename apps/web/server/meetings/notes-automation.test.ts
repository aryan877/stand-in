import { resourcePut } from "@agent-native/core/resources";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MEETING_ENDED } from "./events";
import { addNotesAutomation } from "./notes-automation";

vi.mock("zod", async (importOriginal) => {
  const actual = await importOriginal<typeof import("zod")>();
  return { ...actual, z: actual.default };
});

vi.mock("@agent-native/core/resources", () => ({ resourcePut: vi.fn() }));

const OWNER = "maya@example.com";

const written = () => vi.mocked(resourcePut).mock.calls[0]!;

beforeEach(async () => {
  vi.mocked(resourcePut).mockReset();
  await addNotesAutomation(OWNER);
});

describe("addNotesAutomation", () => {
  it("writes one job into the owner's own resources", () => {
    expect(resourcePut).toHaveBeenCalledTimes(1);
    expect(written()[0]).toBe(OWNER);
    expect(written()[1]).toBe("jobs/stand-in-meeting-notes.md");
  });

  it("runs as the owner whenever a call ends", () => {
    const content = written()[2];
    expect(content).toContain(`event: "${MEETING_ENDED}"`);
    expect(content).toContain("triggerType: event");
    expect(content).toContain("enabled: true");
    expect(content).toContain(`createdBy: ${OWNER}`);
    expect(content).toContain("runAs: creator");
  });

  it("tells the agent to read the call, then save and confirm the notes", () => {
    const content = written()[2];
    expect(content).toContain("get-meeting");
    expect(content).toContain("save-meeting-notes");
    expect(content).toContain("If the meeting already has notes");
  });
});
