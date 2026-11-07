import { cn } from "@/lib/utils";

import { fromLocalInput, toLocalInput } from "./format";
import { FormGroup, Hint, Labeled, textFieldClass } from "./ui";

export type MeetingForm = {
  title: string;
  meetUrl: string;
  ownerName: string;
  startsAt: string;
  durationMinutes: number;
  agenda: string;
  mayShare: string;
  mustAsk: string;
  letPeopleIn: boolean;
};

type TextKey = "agenda" | "mayShare" | "mustAsk";

const BRIEFING: {
  key: TextKey;
  label: string;
  hint: string;
  example: string;
  rows: number;
  minHeight: string;
}[] = [
  {
    key: "agenda",
    label: "What is this call about?",
    hint: "Background only. Nobody on the call hears this.",
    example: "Weekly launch sync with Tom and Priya.",
    rows: 3,
    minHeight: "min-h-[84px]",
  },
  {
    key: "mayShare",
    label: "Answers Stand-in can read out",
    hint: "One per line, said word for word. The agent can write them too.",
    example: "The pricing page ships Thursday morning.",
    rows: 2,
    minHeight: "min-h-[62px]",
  },
  {
    key: "mustAsk",
    label: "Topics Stand-in must not answer",
    hint: "It says you will reply later and saves the question for you.",
    example: "Budget, hiring, the launch date.",
    rows: 1,
    minHeight: "min-h-10",
  },
];

const DURATIONS = [15, 30, 45, 60, 90];

export function MeetingFields({
  value,
  onChange,
  linkLocked = false,
}: {
  value: MeetingForm;
  onChange: (patch: Partial<MeetingForm>) => void;
  linkLocked?: boolean;
}) {
  const lengths = [...new Set([...DURATIONS, value.durationMinutes])].sort(
    (a, b) => a - b,
  );
  const name = value.ownerName.trim() || "(your name)";

  return (
    <div className="grid gap-5 @3xl:grid-cols-2">
      <FormGroup title="The call">
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="Call name">
              <input
                required
                autoComplete="off"
                placeholder="Launch sync"
                value={value.title}
                onChange={(event) => onChange({ title: event.target.value })}
                className={textFieldClass}
              />
            </Labeled>
            <Labeled label="Your name">
              <input
                required
                autoComplete="off"
                value={value.ownerName}
                onChange={(event) =>
                  onChange({ ownerName: event.target.value })
                }
                className={textFieldClass}
              />
            </Labeled>
          </div>
          <Hint>
            When it joins, Stand-in says "Hi, I'm {name}'s AI stand-in."
          </Hint>
        </div>
        {linkLocked ? (
          <Labeled
            label="Google Meet link"
            hint="This link can't be changed. To use a different link, delete this call and schedule a new one."
          >
            <input
              readOnly
              value={value.meetUrl}
              className={`${textFieldClass} bg-muted/50 text-muted-foreground`}
            />
          </Labeled>
        ) : (
          <Labeled label="Google Meet link">
            <input
              required
              autoComplete="off"
              inputMode="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={value.meetUrl}
              onChange={(event) => onChange({ meetUrl: event.target.value })}
              className={textFieldClass}
            />
          </Labeled>
        )}
        <div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
            <Labeled label="Date and start time">
              <input
                required
                type="datetime-local"
                value={toLocalInput(value.startsAt)}
                onChange={(event) =>
                  event.target.value &&
                  onChange({ startsAt: fromLocalInput(event.target.value) })
                }
                className={textFieldClass}
              />
            </Labeled>
            <Labeled label="Length">
              <select
                value={value.durationMinutes}
                onChange={(event) =>
                  onChange({ durationMinutes: Number(event.target.value) })
                }
                className={textFieldClass}
              >
                {lengths.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </Labeled>
          </div>
          <Hint>Stand-in joins by itself, and leaves when the call ends.</Hint>
        </div>
        <label className="flex items-start gap-3 rounded-lg bg-muted/60 px-3.5 py-3 text-sm">
          <input
            type="checkbox"
            checked={value.letPeopleIn}
            onChange={(event) =>
              onChange({ letPeopleIn: event.target.checked })
            }
            className="mt-0.5 size-4"
          />
          <span>
            <span className="font-medium">Let people in who knock</span>
            <span className="block leading-[22px] text-muted-foreground">
              Turn this on if you are the host of this call.
            </span>
          </span>
        </label>
      </FormGroup>

      <FormGroup title="What Stand-in can say">
        {BRIEFING.map((field) => (
          <Labeled
            key={field.key}
            optional
            label={field.label}
            hint={field.hint}
          >
            <textarea
              rows={field.rows}
              placeholder={field.example}
              value={value[field.key]}
              onChange={(event) =>
                onChange({ [field.key]: event.target.value })
              }
              className={cn(
                textFieldClass,
                field.minHeight,
                "field-sizing-content resize-none",
              )}
            />
          </Labeled>
        ))}
      </FormGroup>
    </div>
  );
}
