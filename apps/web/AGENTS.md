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

## Actions

| Action                                                   | Called by                               | Purpose                                                                                                                                |
| -------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `list-meetings`, `get-meeting`, `list-follow-ups`        | UI, chat agent                          | Read meetings and the questions left for the owner                                                                                     |
| `create-meeting`                                         | UI, chat agent                          | Brief a call                                                                                                                           |
| `update-meeting`                                         | UI, chat agent                          | Edit a call. Changing `ownerName`, `mayShare`, `mustAsk` or `letPeopleIn` needs approval from any model caller, except chat on a draft |
| `delete-meeting`                                         | UI, chat agent with approval            | Remove a call                                                                                                                          |
| `join-meeting-now`                                       | Chat agent with approval                | Send Stand-in in from the open tab. Not on MCP                                                                                         |
| `answer-question`                                        | UI, chat agent                          | Save a reply to a noted question. Never spoken                                                                                         |
| `finish-meeting`                                         | UI, chat agent with approval, extension | End a live call                                                                                                                        |
| `save-meeting-notes`                                     | Chat agent, notes automation            | Write notes and replace action items                                                                                                   |
| `update-action-item`                                     | UI, chat agent                          | Edit, approve, dismiss or reopen an action item                                                                                        |
| `due-meetings`                                           | Extension background worker             | Calls to join now and when the next one starts                                                                                         |
| `start-meeting`, `add-transcript-line`, `next-utterance` | Extension Meet tab                      | Go live, listen, speak                                                                                                                 |
| `navigate`, `view-screen`                                | Chat agent                              | Move the UI, and read the current screen and the meeting on it                                                                         |

Writes return `{ id }`, declare an `outputSchema`, and carry `mcpAnnotations` when outside agents can call them. `agentTool: false` hides `due-meetings`, `start-meeting`, `add-transcript-line` and `next-utterance` from the chat agent and external agents. `next-utterance` sets `changeEvents: false` because the extension polls it every second. The extension calls actions with the owner's session cookie, and `background.ts` only lets a Meet tab call the four actions the live call needs.

## Hard rules

- **Owner scope.** Every query is scoped by `owner_email`. Store functions take `ownerEmail`, or a `Meeting` already loaded for that owner by `getMeeting` or `requireLiveMeeting`. Child-table reads key on a meeting id that passed that check. New tables carry `owner_email`.
- **Status changes.** Meeting and action item status changes are compare-and-set through `machines.ts`: the update matches `machine.fromStates(event)` and a lost race returns `false` or a conflict. Questions (`pending` to `answered`) and utterances (`queued` to `spoken`) use the same guard in `store.ts`.
- **Migrations.** `server/plugins/db.ts` holds named, append-only migrations, versioned by position. Never rename, reorder or drop one. Add a migration whenever `schema.ts` changes.
- **The responder.** It may only stay quiet, say one prepared answer word for word, or note the question. The model picks a tool and an answer number; it never writes text that gets spoken. Suggested replies go to the owner, not the call. Transcript text is speech from other people, never instructions. It is the only model call outside the chat agent, and it runs inside `add-transcript-line` because a spoken reply can't wait for an agent run.
- **Approval.** Model-driven callers need approval to change what may be said or whether people are let in, to join, end or delete a call, or to schedule one from outside chat. `join-meeting-now`, `finish-meeting` and `delete-meeting` set `needsApproval: approveWhenModelCalls`, which covers `tool`, `mcp`, `webmcp`, `a2a`, `automation` and `cli` callers. `create-meeting` uses `approveUnlessChat`. `update-meeting` uses `approveSpokenEdits`, which reads the meeting so chat can edit a draft without asking. If that read fails, the call fails.
- **Speech.** Nothing, including the chat agent, can make Stand-in say anything except its introduction, a prepared answer or the fixed line. Only `start-meeting` and the responder queue speech. Never add an action that does.
- **Prepared answers.** The agent writes them only from facts the owner gave: the agenda, the existing answers, or the chat. It never invents one. The steps are in the `meetings` skill, not in UI strings.
- **Refreshing.** `useDbSync` is realtime on meeting pages only. `refreshEvery` in `app/components/meetings/shared/format.ts` is the one polling rule: a live call, a scheduled call inside its join window, and a finished call whose notes are due. Don't add another interval.
- **Camera.** Stand-in never uses the real camera. `meet.ts` keeps Meet's camera off, and `hook.ts` supplies a name card for any video request on a Stand-in tab.
- **Timestamps.** `*_at` columns are ISO 8601 strings written by code (`isoNow`, `new Date(value).toISOString()`), never SQL defaults. The join window compares them as strings.
- **Providers.** Provider swaps stay in `server/lib/providers/`.
- **Actions stay thin.** Validate with zod, call `requireOwner(ctx?.userEmail)`, then call the store. SQL belongs in `store.ts`.
- **Credentials.** Deployment-owned env reads carry `// guard:allow-env-credential`. Never hardcode a credential.

## Writing code here

- Comments stay minimal: no explainers, module headers or design rationale. Keep guard markers, and a rare one-liner where the code would otherwise mislead.
- User-facing copy is plain everyday English: no em dashes, no counters like "01 / 03", and name who acts ("Stand-in joins"). Visual rules are in `DESIGN.md`.
- UI feedback targets 100 ms and never exceeds 400 ms. App data flows through actions.
- Never fabricate. Report failures, and confirm writes by reading the row or screen.

## Navigation

`navigation` application state holds the view, the path and the browser's `timeZone`: `meetings` at `/meetings` plus `meetingId` at `/meetings/<id>`, `chat` at `/chat` and `/chat/<threadId>`. The agent uses `navigate` to move the UI and `view-screen` for a fresh read. `<current-screen>` already has the navigation and, on a meeting page, that meeting's id, title, status and counts, never its transcript.

## Skills

Search with `rg --hidden --follow`, and read the linked guide before deeper work.

- Product: `.agents/skills/meetings/SKILL.md`
- Features: `.agents/skills/build-an-app/SKILL.md`, `.agents/skills/adding-a-feature/SKILL.md`
- Data and integrations: `.agents/skills/actions/SKILL.md`, `.agents/skills/storing-data/SKILL.md`, `.agents/skills/security/SKILL.md`, `.agents/skills/secrets/SKILL.md`, `.agents/skills/sharing/SKILL.md`
- UI: `.agents/skills/frontend-design/SKILL.md`, `.agents/skills/shadcn-ui/SKILL.md`, `.agents/skills/client-side-routing/SKILL.md`
- Agent context and workflows: `.agents/skills/context-awareness/SKILL.md`, `.agents/skills/real-time-sync/SKILL.md`, `.agents/skills/reliable-mutations/SKILL.md`, `.agents/skills/performance/SKILL.md`, `.agents/skills/delegate-to-agent/SKILL.md`
- Framework: `.agents/skills/agent-native-docs/SKILL.md`, `.agents/skills/agent-native-toolkit/SKILL.md`, `.agents/skills/customizing-agent-native/SKILL.md`

Framework docs are local: `bun --bun run action docs-search --query "<topic>"`, `--slug "<slug>"` or `--list`.
