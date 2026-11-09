# Stand-in agent guide

Stand-in attends Google Meet calls for an owner who is away for the whole call. At the scheduled time the Chrome extension in `apps/extension` joins from the owner's own Chrome. It says it's an AI, reads out only answers the owner prepared, word for word, tells people the owner will reply later on anything else, and leaves on time. When the call ends, this app's agent writes the notes.

`/` is the public landing page. `/meetings` is the signed-in home. `/meetings/:id` shows the briefing, the live call or the notes, depending on status. Sign-in is email and password.

## A call, start to finish

1. `create-meeting` stores the briefing. A user's first meeting also installs the notes automation (`server/meetings/notes-automation.ts`).
2. The extension polls `due-meetings` every 30 seconds and opens calls from one minute before the start to fifteen minutes after it.
3. Once admitted, it calls `start-meeting`. The first join moves the meeting from `draft` to `live`, queues the introduction, and returns `leaveAt`, ten minutes after the booked end, and `letPeopleIn`.
4. Each finished caption goes to `add-transcript-line`, which runs `respondToLine` in `server/meetings/responder.ts` before returning, so the reply is queued by the time the line is saved. Lines from one call are handled in order.
5. The extension polls `next-utterance`, which claims the oldest queued line and returns its audio. If speech fails the line goes back in the queue, up to three attempts.
6. `finish-meeting` runs when the call ends, when Stand-in has been alone for a minute, when it could not introduce itself within two minutes, or when `leaveAt` passes. It emits `meeting.ended` only if this call made the transition and someone other than Stand-in spoke.
7. The automation runs the agent, which writes notes through `save-meeting-notes` (see the `meetings` skill).

## File map

| Path                                       | What lives there                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `actions/`                                 | One file per operation, thin over the store                                              |
| `server/meetings/store.ts`                 | All meeting SQL                                                                          |
| `server/meetings/machines.ts`              | Meeting and action item state machines                                                   |
| `server/meetings/responder.ts`             | Live-call responder: stay quiet, read one answer, or note the question                   |
| `server/meetings/approval.ts`              | `approveWhenModelCalls`, `approveUnlessChat`, `approveSpokenEdits`                       |
| `server/meetings/notify-owner.ts`          | Bell notifications for an owner who is away                                              |
| `server/meetings/responder-safety.eval.ts` | Injection lines against the live responder                                               |
| `server/meetings/events.ts`                | `meeting.ended` definition and emitter                                                   |
| `server/meetings/notes-automation.ts`      | Per-user automation that writes notes                                                    |
| `server/lib/providers/`                    | `llm.ts` (live-call model and the OpenCode Go chat engine), `speech.ts` (text to speech) |
| `server/db/schema.ts`                      | Tables and row types                                                                     |
| `server/plugins/db.ts`                     | Migrations                                                                               |
| `server/plugins/agent-chat.ts`             | Chat agent prompt and initial tools                                                      |
| `server/plugins/auth.ts`                   | Public paths and sign-in page copy                                                       |
| `shared/meetings.ts`                       | State lists, Stand-in's speaker name, Meet link pattern                                  |
| `shared/spoken.ts`                         | The introduction, the fixed line, and `splitFacts` (one answer per line)                 |
| `app/routes/`                              | `_index` (landing), `meetings.*`, `chat.*`, settings and other framework routes          |
| `app/components/landing/`                  | Public landing page                                                                      |
| `app/components/meetings/`                 | `home/`, `new/`, `detail/` (draft, live, ended views), `shared/`                         |
| `app/components/layout/Sidebar.tsx`        | App navigation and chat list                                                             |
| `app/hooks/use-stand-in-extension.ts`      | Extension presence and the join-now message                                              |
| `app/hooks/use-join-meeting-command.ts`    | Runs `join-meeting-now` commands in the open tab, mounted in the layout                  |
| `.agents/skills/meetings/`                 | How the agent briefs calls, prepares answers and writes notes                            |

`app/components/chat/`, the rest of `app/components/layout/`, `app/i18n/` and `server/lib/composer-*` come from the framework's chat template.

## Commands

Bun only, from `apps/web`.

| Command                                           | Use                                                            |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `bun --bun run dev`                               | Dev server, port 3210 by default                               |
| `bun --bun run typecheck`                         | Types. Also regenerates `.generated/` after actions change     |
| `bun --bun vitest --run`                          | Tests                                                          |
| `bun --bun run agent-native:doctor`               | Framework guards                                               |
| `bun --bun server/meetings/run-responder-eval.ts` | Injection eval. Calls the live model, so not part of the tests |
| `bun --bun run build`                             | Production build                                               |
| `bun --bun run start`                             | Serve the production build                                     |
| `bun --bun run action <name>`                     | Run one action from the shell                                  |
| `../../node_modules/.bin/oxfmt <paths>`           | Format                                                         |

Run typecheck, tests and doctor before calling a change done.

