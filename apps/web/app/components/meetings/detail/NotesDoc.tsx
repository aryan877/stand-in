import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import { useActionMutation } from "@agent-native/core/client/hooks";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { Meeting } from "../../../../server/db/schema";
import { NOTES_WAIT_MS, parseNotes } from "../shared/format";
import {
  ActionError,
  ActionRow,
  AgentChangedNotice,
  EmptyNote,
  SavedNote,
  textFieldClass,
} from "../shared/ui";

function askForNotes(meeting: Meeting) {
  sendToAgentChat({
    message: `Write the notes and action items for my call "${meeting.title}".`,
    context: JSON.stringify({ meetingId: meeting.id }),
    submit: true,
    openSidebar: true,
  });
}

export function NotesDoc({
  meeting,
  anyoneSpoke,
}: {
  meeting: Meeting;
  anyoneSpoke: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (meeting.notes === null) {
    if (!anyoneSpoke) {
      return (
        <EmptyNote>
          Nobody else spoke on this call, so there are no notes to write.
        </EmptyNote>
      );
    }
    const justEnded =
      meeting.endedAt !== null &&
      Date.now() - Date.parse(meeting.endedAt) < NOTES_WAIT_MS;
    return (
      <div className="rounded-xl border border-dashed px-5 py-6">
        <p className="text-[15px] leading-6">
          {justEnded
            ? "Stand-in is writing the notes. They usually appear within a minute."
            : "The notes for this call haven't been written yet."}
        </p>
        <Button className="mt-4" onClick={() => askForNotes(meeting)}>
          Write the notes now
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <NotesEditor
        id={meeting.id}
        latest={meeting.notes}
        onSaved={() => {
          setEditing(false);
          setSaved(true);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {saved ? (
          <span className="mr-auto">
            <SavedNote />
          </span>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSaved(false);
            setEditing(true);
          }}
        >
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => askForNotes(meeting)}
        >
          Ask AI to rewrite
        </Button>
      </div>
      <NotesBody text={meeting.notes} />
    </article>
  );
}

function NotesEditor({
  id,
  latest,
  onSaved,
  onCancel,
}: {
  id: string;
  latest: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const update = useActionMutation("update-meeting");
  const [base, setBase] = useState(latest);
  const [notes, setNotes] = useState(latest);
  const changedElsewhere =
    base !== latest && !update.isPending && !update.isSuccess;

  return (
    <div className="space-y-3">
      {changedElsewhere ? (
        <AgentChangedNotice
          onReload={() => {
            setBase(latest);
            setNotes(latest);
          }}
        />
      ) : null}
      <p className="text-sm leading-[22px] text-muted-foreground">
        Write a heading on its own line, and start each point with a dash.
      </p>
      <textarea
        autoFocus
        rows={14}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        className={`${textFieldClass} resize-y`}
      />
      <ActionError error={update.error} fallback="Couldn't save your notes." />
      <ActionRow>
        <Button
          disabled={update.isPending || changedElsewhere}
          onClick={() => update.mutate({ id, notes }, { onSuccess: onSaved })}
        >
          Save notes
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Discard changes
        </Button>
      </ActionRow>
    </div>
  );
}

function NotesBody({ text }: { text: string }) {
  const blocks = parseNotes(text);
  if (!blocks.length) {
    return <EmptyNote>These notes are empty.</EmptyNote>;
  }
  return (
    <div className="mt-2 space-y-3">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3
              key={index}
              className="pt-3 font-display text-xl leading-7 font-normal tracking-[-0.2px] first:pt-0"
            >
              {block.text}
            </h3>
          );
        }
        if (block.kind === "paragraph") {
          return (
            <p key={index} className="text-[15px] leading-6">
              {block.text}
            </p>
          );
        }
        return (
          <ul
            key={index}
            className="list-disc space-y-1.5 pl-5 text-[15px] leading-6"
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
