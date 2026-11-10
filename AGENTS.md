# Stand-in

Stand-in attends Google Meet calls for an owner who is away. A Chrome extension joins the call from the owner's own Chrome, and an Agent-Native app holds the meetings, decides what gets said, and writes the notes.

## Layout

Bun workspaces with Turborepo.

| Path             | What it is                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps/web`       | The app: landing page, meetings UI, actions, live-call responder, chat agent (`@agent-native/core` 0.226.0) |
| `apps/extension` | The Chrome extension (Manifest V3), built with `bun build.ts` into `dist/`                                  |

Before changing the app, read `apps/web/AGENTS.md`. It has the file map, the action table and the hard rules.

## How the extension and the app fit together

The extension talks to the app over `/_agent-native/actions/<name>` with the owner's session cookie, so every call is scoped to the signed-in owner. The app decides what gets said. The extension does the joining, listening and speaking, and holds the rules for when to leave.

| File in `apps/extension/src` | Job                                                                                                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background.ts`              | Polls `due-meetings` every 30 seconds, opens due calls, keeps the computer awake, and limits a Meet tab to `start-meeting`, `add-transcript-line`, `next-utterance` and `finish-meeting` for its own meeting                                                     |
| `meet.ts`                    | Joins, keeps the camera off, turns on captions, lets in people who knock when that is on, sends finished lines, plays queued speech, and leaves when the call ends, a minute after it is alone, two minutes after it failed to introduce itself, or at `leaveAt` |
| `hook.ts`                    | Runs in Meet's page and, on Stand-in tabs only, replaces the microphone with Stand-in's audio and answers camera requests with a name card                                                                                                                       |
| `captions.ts`                | Turns Meet's growing caption rows into finished lines                                                                                                                                                                                                            |
| `call-rules.ts`              | The introduction deadline, the lobby check, when to admit a knock or open and close Meet's people list, and the leave-when-alone watch                                                                                                                           |
| `messages.ts`                | Message types shared by the extension's scripts                                                                                                                                                                                                                  |
| `app.ts`                     | Runs on app pages: marks the extension as present and forwards the join-now request                                                                                                                                                                              |

`build.ts` sets the app origins from `STAND_IN_APP_ORIGINS`, defaulting to `http://localhost:3210` and the live site `https://standin.aryankumar.dev`.

## Commands

From the repo root: `bun run typecheck`, `bun run test`, `bun run build`, `bun run dev`. Commands for one app are in `apps/web/AGENTS.md` and in `apps/extension/package.json`.
