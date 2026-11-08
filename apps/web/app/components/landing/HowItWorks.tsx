import {
  IconArrowRight,
  IconMoon,
  IconSun,
  IconVideo,
  type TablerIcon,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

import { BODY_CLASS, H2_CLASS, H3_CLASS, Reveal, Section, Shot } from "./parts";
import { RealTranscript } from "./RealTranscript";
import { SHOTS } from "./shots";

function Chapter({
  icon: Icon,
  label,
  title,
  children,
}: {
  icon: TablerIcon;
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-[720px]">
      <p className="flex items-center gap-2.5 text-[15px] font-medium">
        <span className="grid size-8 place-items-center rounded-full border bg-background">
          <Icon className="size-[17px]" />
        </span>
        {label}
      </p>
      <h3 className={`mt-5 ${H3_CLASS}`}>{title}</h3>
      <div className={`mt-4 ${BODY_CLASS}`}>{children}</div>
    </div>
  );
}

const AFTER_THE_CALL = [
  "The call ends",
  "An event fires",
  "An automation runs",
  "The app's agent writes your notes and to-dos",
  "You get a notification",
];

export function HowItWorks() {
  return (
    <Section id="how">
      <div className="max-w-[760px]">
        <h2 className={H2_CLASS}>You prepare once. Stand-in takes the call.</h2>
        <p className={`mt-5 ${BODY_CLASS}`}>
          You spend two minutes writing. Stand-in spends the call on your
          behalf. The notes are there when it's over.
        </p>
      </div>

      <div className="mt-20 space-y-20 md:space-y-28">
        <div>
          <Chapter
            icon={IconMoon}
            label="The night before"
            title="Write what it may say."
          >
            Paste the Meet link and pick the time. Write the answers it may
            read. List the topics it must not answer. That's the whole job.
          </Chapter>

          <Reveal className="mt-12 grid grid-cols-12 gap-y-6">
            <Shot
              data={SHOTS.formDetails}
              bar="Schedule a call"
              className="relative z-10 col-span-12 md:col-span-7 md:col-start-1 md:row-start-1"
              callouts={[
                {
                  x: 60,
                  y: 42.5,
                  side: "top",
                  text: "Copy the link from your calendar invite.",
                },
              ]}
            />
            <Shot
              data={SHOTS.formAnswers}
              bar="What Stand-in can say"
              className="relative z-20 col-span-12 md:col-span-6 md:col-start-7 md:row-start-1 md:mt-28"
              callouts={[
                {
                  x: 30,
                  y: 67.5,
                  side: "right",
                  text: "One answer per line. It reads them word for word.",
                },
                {
                  x: 42,
                  y: 88.8,
                  side: "right",
                  text: "If anyone asks about these, it says you'll reply later.",
                },
              ]}
            />
          </Reveal>

          <Reveal className="mt-20 grid gap-8 lg:grid-cols-[8fr_4fr] lg:items-start">
            <div>
              <h4 className="font-display text-[24px] leading-[30px] tracking-[-0.4px]">
                Or let the agent write them.
              </h4>
              <p className="mt-3 max-w-[560px] text-[16px] leading-[26px] text-muted-foreground">
                Press Prepare answers with the agent. It writes them from your
                agenda, and you review them. On this call it wrote two answers
                and left everything else for later.
              </p>
              <Shot
                data={SHOTS.agentCall}
                bar="Launch check-in"
                className="mt-8"
                callouts={[
                  {
                    x: 83.4,
                    y: 77,
                    side: "bottom",
                    text: "One click writes them",
                  },
                ]}
              />
            </div>
            <Shot
              data={SHOTS.agentPanel}
              bar="The agent"
              caption="The agent's reply on this call, with the two answers Stand-in may read."
            />
          </Reveal>
        </div>

        <div>
          <Chapter
            icon={IconVideo}
            label="At call time"
            title="It joins from your own Chrome, with nobody at the computer."
          >
            At the start time, the Chrome extension opens the call in your own
            signed-in Chrome and joins. The camera stays off.
          </Chapter>

          <Reveal className="mt-12">
            <Shot
              data={SHOTS.liveJoined}
              dark
              bar="Google Meet and the live Stand-in page"
              imageClassName="max-md:aspect-[6/5] max-md:object-cover max-md:object-left"
              callouts={[
                {
                  x: 19,
                  y: 85,
                  side: "top",
                  onDark: true,
                  text: "It turns on Meet's live captions.",
                },
                {
                  x: 17.5,
                  y: 95.5,
                  side: "left",
                  onDark: true,
                  text: "Camera off",
                },
                {
                  x: 60.9,
                  y: 26.3,
                  side: "left",
                  onDark: true,
                  text: "The page knows it's in the call.",
                },
              ]}
            />
          </Reveal>

          <Reveal className="mt-16 grid gap-10 lg:grid-cols-[4fr_8fr] lg:items-center">
            <div>
              <h4 className="font-display text-[24px] leading-[30px] tracking-[-0.4px]">
                It says it's an AI, out loud.
              </h4>
              <p className="mt-3 text-[16px] leading-[26px] text-muted-foreground">
                Once someone else is in the call, it introduces itself. It
                doesn't send a single caption until it has.
              </p>
            </div>
            <Shot
              data={SHOTS.introSaid}
              dark
              bar="Google Meet and the live Stand-in page"
              imageClassName="max-md:aspect-[6/5] max-md:object-cover max-md:object-left"
              callouts={[
                {
                  x: 30,
                  y: 76,
                  side: "top",
                  onDark: true,
                  text: "Stand-in saying it's an AI",
                },
                {
                  x: 80,
                  y: 67.5,
                  side: "bottom",
                  text: "The same words on your live page",
                },
              ]}
            />
          </Reveal>

          <Reveal className="mt-16 grid gap-6 lg:grid-cols-[8fr_4fr]">
            <Shot
              data={SHOTS.callThree}
              dark
              bar="Google Meet and the live Stand-in page"
              imageClassName="max-md:aspect-[6/5] max-md:object-cover max-md:object-left"
              callouts={[
                {
                  x: 30.5,
                  y: 87,
                  side: "right",
                  onDark: true,
                  text: "It listens through captions.",
                },
              ]}
              caption="Three people in the call. Questions it can't answer appear on the right as they happen."
            />
            <RealTranscript />
          </Reveal>
        </div>

        <div>
          <Chapter
            icon={IconSun}
            label="The morning after"
            title="The notes are ready before you are."
          >
            When a call ends, an event runs an automation and the app's own
            agent writes the notes and to-dos. You get a notification.
          </Chapter>

          <Reveal className="mt-12">
            <Shot
              data={SHOTS.notesWriting}
              bar="Google Meet and the Stand-in page, right after the call"
              imageClassName="max-md:aspect-[4/5] max-md:object-cover max-md:object-right"
              callouts={[
                {
                  x: 61.3,
                  y: 65,
                  side: "left",
                  text: "The agent is writing your notes.",
                },
                {
                  x: 43.5,
                  y: 16.5,
                  side: "right",
                  text: "Stand-in left by itself.",
                },
              ]}
            />
          </Reveal>

          <Reveal className="mt-10">
            <ol className="flex flex-col items-start gap-2 text-[15px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2.5 sm:gap-y-3">
              {AFTER_THE_CALL.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-2 max-sm:flex-col sm:items-center sm:gap-2.5"
                >
                  {index > 0 ? (
                    <IconArrowRight
                      aria-hidden
                      className="size-4 text-muted-foreground max-sm:ml-4 max-sm:rotate-90"
                    />
                  ) : null}
                  <span className="rounded-full border bg-background px-3.5 py-1.5">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
