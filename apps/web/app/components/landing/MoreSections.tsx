import { IconCheck, IconChevronDown, IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import {
  BODY_CLASS,
  CreateAccountLink,
  H2_CLASS,
  H3_CLASS,
  Reveal,
  Section,
  Shot,
  SignInLink,
  useInView,
} from "./parts";
import { SHOTS } from "./shots";

const MINUTES = Array.from({ length: 30 }, (_, index) => index);
const NEEDED_MINUTES = new Set([7, 20]);

const NEEDED_QUESTIONS = [
  {
    speaker: "Stackmakers",
    text: "Hey everyone! Aryan is the launch still on for Thursday.",
  },
  {
    speaker: "Teammate",
    text: "Thanks, Aryan, who is writing the release notes.",
  },
];

export function TheProblem() {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <Section band>
      <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16">
        <div>
          <h2 className={H2_CLASS}>
            Some calls only need you for two answers.
          </h2>
          <p className={`mt-5 max-w-[480px] ${BODY_CLASS}`}>
            You know what you'd say. You could write it down tonight. But the
            invite says thirty minutes, so you give up thirty minutes.
          </p>
        </div>
        <div ref={ref} className="landing-reveal">
          <div
            aria-hidden
            className="grid h-28 grid-cols-[repeat(30,minmax(0,1fr))] items-end gap-[3px] md:h-36 md:gap-1"
          >
            {MINUTES.map((minute) => {
              const needed = NEEDED_MINUTES.has(minute);
              return (
                <span
                  key={minute}
                  style={{ transitionDelay: `${minute * 22}ms` }}
                  className={cn(
                    "rounded-[3px] transition-[height] duration-500 ease-out motion-reduce:transition-none",
                    needed ? "bg-foreground" : "bg-border",
                    inView ? (needed ? "h-full" : "h-[42%]") : "h-[10%]",
                  )}
                />
              );
            })}
          </div>
          <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-[3px] bg-foreground"
              />
              The two moments that needed you
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-[3px] bg-border" />
              The rest of the call
            </span>
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {NEEDED_QUESTIONS.map((question) => (
              <li
                key={question.text}
                className="rounded-lg border bg-background p-4"
              >
                <p className="text-[13px] font-medium text-muted-foreground">
                  {question.speaker}
                </p>
                <p className="mt-1 text-[16px] leading-6 tracking-[-0.1px]">
                  {question.text}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-5 text-muted-foreground">
            An example of a thirty-minute status call. The two questions are
            real lines from the call filmed for this page.
          </p>
        </div>
      </div>
    </Section>
  );
}

const LEAVES_WHEN = [
  "When the call ends.",
  "A minute after everyone else has gone.",
  "Ten minutes after the booked end, at the latest.",
];

export function LettingPeopleIn() {
  return (
    <Section id="door">
      <div className="max-w-[760px]">
        <h2 className={H2_CLASS}>It lets people in, and leaves by itself.</h2>
        <p className={`mt-5 ${BODY_CLASS}`}>
          You won't be there to admit anyone, and you won't be there to end the
          call. Stand-in handles both.
        </p>
      </div>

      <Reveal className="mt-14 grid gap-8 md:grid-cols-2 md:items-start">
        <div>
          <Shot
            data={SHOTS.guestWaiting}
            dark
            bar="Google Meet, at the start of the call"
            callouts={[
              {
                x: 54.5,
                y: 59.4,
                side: "left",
                onDark: true,
                text: "Someone knocks. Stand-in lets them in.",
              },
            ]}
          />
          <h3 className="mt-7 font-display text-[24px] leading-[30px] tracking-[-0.4px]">
            Let people in who knock
          </h3>
          <p className="mt-3 text-[16px] leading-[26px] text-muted-foreground">
            Turn this on for calls you host. Otherwise nobody can let them in
            while you're away.
          </p>
          <Shot data={SHOTS.knockToggle} className="mt-4" />
        </div>

        <div>
          <Shot
            data={SHOTS.everyoneLeft}
            dark
            bar="Google Meet, after everyone else has gone"
            callouts={[
              {
                x: 85.2,
                y: 5.6,
                side: "left",
                onDark: true,
                text: "Only Stand-in is left. It leaves a minute later.",
              },
            ]}
          />
          <h3 className="mt-7 font-display text-[24px] leading-[30px] tracking-[-0.4px]">
            It leaves on time
          </h3>
          <div aria-hidden className="mt-5">
            <div className="relative h-3">
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <span className="absolute top-1/2 left-0 h-px w-3/4 bg-foreground" />
              <span className="absolute top-0 left-0 size-3 rounded-full bg-foreground" />
              <span className="absolute top-0 left-3/4 size-3 -translate-x-1/2 rounded-full bg-foreground" />
              <span className="absolute top-0 right-0 size-3 rounded-full border-2 border-foreground bg-background" />
            </div>
            <div className="mt-2 grid grid-cols-[3fr_1fr] text-[13px] text-muted-foreground">
              <span className="justify-self-end pr-2">Booked end</span>
              <span className="justify-self-end">Ten minutes later</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-[16px] leading-[26px] text-muted-foreground">
            {LEAVES_WHEN.map((item) => (
              <li key={item} className="flex gap-2.5">
                <IconCheck className="mt-[5px] size-4 shrink-0 text-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </Section>
  );
}

export function ComeBackTo() {
  return (
    <Section id="after" band>
      <div className="max-w-[760px]">
        <h2 className={H2_CLASS}>What you come back to.</h2>
        <p className={`mt-5 ${BODY_CLASS}`}>
          Notes and to-dos written by the app's own agent. Every question that
          was left for you, with who asked it.
        </p>
      </div>

      <Reveal className="mt-14 grid gap-10 lg:grid-cols-[8fr_4fr] lg:items-start">
        <Shot
          data={SHOTS.notes}
          bar="Summary"
          callouts={[
            {
              x: 96.6,
              y: 3.4,
              side: "left",
              text: "You get a notification.",
            },
            {
              x: 18.2,
              y: 49.3,
              side: "right",
              text: "Two questions are waiting.",
            },
          ]}
        />
        <div>
          <h3 className={H3_CLASS}>Notes in plain words.</h3>
          <p className="mt-4 text-[16px] leading-[26px] text-muted-foreground">
            What was decided and the key points, written when the call ended.
            Want more? Ask the chat agent about your calls.
          </p>
          <Shot
            data={SHOTS.askAgent}
            bar="Ask about your calls"
            className="mt-8"
          />
        </div>
      </Reveal>

      <Reveal className="mt-20 grid gap-10 lg:grid-cols-[4fr_8fr] lg:items-center">
        <div>
          <h3 className={H3_CLASS}>To-dos you approve.</h3>
          <p className="mt-4 text-[16px] leading-[26px] text-muted-foreground">
            Stand-in lists the to-dos from the call. Keep the ones you want and
            remove the rest. Nothing is sent to anyone.
          </p>
        </div>
        <Shot
          data={SHOTS.todos}
          bar="To-dos"
          callouts={[
            {
              x: 71.6,
              y: 80.3,
              side: "left",
              text: "Keep it or remove it",
            },
          ]}
        />
      </Reveal>

      <Reveal className="mt-20 grid gap-10 lg:grid-cols-[8fr_4fr] lg:items-center">
        <div className="lg:order-2">
          <h3 className={H3_CLASS}>Questions wait for you.</h3>
          <p className="mt-4 text-[16px] leading-[26px] text-muted-foreground">
            Each one shows who asked it, with suggested replies you can change.
            Your reply is saved here for you. It isn't sent to anyone.
          </p>
        </div>
        <Shot
          data={SHOTS.questions}
          bar="Questions for you"
          callouts={[
            {
              x: 16,
              y: 90.2,
              side: "right",
              text: "Saved for you. Not sent to anyone.",
            },
          ]}
        />
      </Reveal>
    </Section>
  );
}

const GOOD_FOR = [
  "Status calls",
  "Check-ins",
  "Calls where you're needed for a couple of answers",
];
const NOT_FOR = ["A real discussion", "A negotiation"];

export function WhoItsFor() {
  return (
    <Section id="fit">
      <div className="max-w-[760px]">
        <h2 className={H2_CLASS}>
          It's for calls you could answer the night before.
        </h2>
        <p className={`mt-5 ${BODY_CLASS}`}>
          It suits status calls and check-ins where you're needed for a couple
          of answers. For a real discussion or a negotiation, you should be
          there.
        </p>
      </div>
      <Reveal className="mt-12 grid border-t md:grid-cols-2 md:divide-x">
        <FitColumn
          title="Send Stand-in"
          items={GOOD_FOR}
          icon={<IconCheck className="mt-[5px] size-[18px] shrink-0" />}
          className="md:pr-10"
        />
        <FitColumn
          title="Go yourself"
          items={NOT_FOR}
          icon={
            <IconX className="mt-[5px] size-[18px] shrink-0 text-muted-foreground" />
          }
          className="border-t md:border-t-0 md:pl-10"
        />
      </Reveal>
    </Section>
  );
}

function FitColumn({
  title,
  items,
  icon,
  className,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("py-8", className)}>
      <h3 className="font-display text-[24px] leading-[30px] tracking-[-0.4px]">
        {title}
      </h3>
      <ul className="mt-5 space-y-3 text-[17px] leading-7">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            {icon}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const BUILT_ON = [
  {
    title: "One set of actions",
    body: "The screens and the agent use the same actions. When the agent prepares your answers, it goes through the same action as the form.",
  },
  {
    title: "A skill that teaches the agent",
    body: "A skill tells the agent how to brief a call and how to write the notes.",
  },
  {
    title: "Event-driven automations",
    body: "When a call ends, an event runs the automation that writes your notes.",
  },
  {
    title: "Approvals on risky agent actions",
    body: "The agent has to ask before it joins, ends or deletes a call.",
  },
  {
    title: "Live sync",
    body: "Questions show up on your page while the call is still going.",
  },
];

export function BuiltOnAgentNative() {
  return (
    <Section id="built" band>
      <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <div>
          <h2 className={H2_CLASS}>Built on Agent-Native.</h2>
          <p className={`mt-5 ${BODY_CLASS}`}>
            The agent isn't bolted on. It works in the same app you do, using
            the same actions as the screens.
          </p>
          <a
            href="https://www.agent-native.com"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-1.5 text-sm text-muted-foreground"
          >
            <img src="/builder-logo.png" alt="" className="size-5" />
            Built on Agent-Native by Builder.io
          </a>
          <div aria-hidden className="mt-10 max-w-[420px] text-[14px]">
            <div className="grid grid-cols-2 gap-3">
              <span className="rounded-lg border bg-background px-3 py-2.5 text-center">
                The screens
              </span>
              <span className="rounded-lg border bg-background px-3 py-2.5 text-center">
                The agent
              </span>
            </div>
            <div className="grid grid-cols-2">
              <span className="mx-auto h-5 w-px bg-border" />
              <span className="mx-auto h-5 w-px bg-border" />
            </div>
            <div className="rounded-lg bg-foreground px-3 py-3 text-center text-background">
              One set of actions
            </div>
            <div className="mx-auto h-5 w-px bg-border" />
            <div className="rounded-lg border bg-background px-3 py-2.5 text-center text-muted-foreground">
              Your meetings
            </div>
          </div>
        </div>
        <dl className="divide-y border-y">
          {BUILT_ON.map((item) => (
            <div key={item.title} className="py-5">
              <dt className="text-[17px] leading-7 font-medium tracking-[-0.2px]">
                {item.title}
              </dt>
              <dd className="mt-1 text-[16px] leading-[26px] text-muted-foreground">
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

const NEEDS = [
  {
    title: "Google Meet, in Chrome",
    body: "Google Meet is the only video app it works with.",
  },
  {
    title: "The Stand-in Chrome extension",
    body: "You add it to Chrome with Load unpacked.",
  },
  {
    title: "Your computer on, with Chrome open",
    body: "The Stand-in window has to stay visible during the call.",
  },
  {
    title: "English captions",
    body: "It hears people through Meet's live captions.",
  },
  {
    title: "Your own computer",
    body: "It runs on your computer today.",
  },
];

export function WhatYouNeed() {
  return (
    <Section id="need">
      <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <div>
          <h2 className={H2_CLASS}>What you need.</h2>
          <p className={`mt-5 ${BODY_CLASS}`}>
            Stand-in works from your computer, so these have to be in place when
            the call starts. Each scheduled call reminds you.
          </p>
          <Shot
            data={SHOTS.needsCard}
            bar="On every scheduled call"
            className="mt-8"
          />
        </div>
        <ul className="divide-y border-y">
          {NEEDS.map((need) => (
            <li key={need.title} className="flex gap-4 py-5">
              <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full border">
                <IconCheck className="size-3.5" />
              </span>
              <div>
                <p className="text-[17px] leading-7 font-medium tracking-[-0.2px]">
                  {need.title}
                </p>
                <p className="mt-0.5 text-[16px] leading-[26px] text-muted-foreground">
                  {need.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

const FAQ = [
  {
    question: "Will people know it's an AI?",
    answer:
      "Yes. It says so out loud once someone else is in the call, and it doesn't send captions until it has.",
  },
  {
    question: "Can someone trick it into saying something else?",
    answer:
      "No. For each line it can stay quiet, read one answer you wrote word for word, or say you can't answer today. It can't write its own words. At worst it reads the wrong one of your answers.",
  },
  {
    question: "Can the chat agent make it say something?",
    answer:
      "No. Nothing, including the chat agent, can make it say anything else.",
  },
  {
    question: "What happens to a question it can't answer?",
    answer:
      "It says you can't answer today, and saves the question with who asked it. After the call, the question waits for you with suggested replies.",
  },
  {
    question: "Are my replies sent to people?",
    answer: "No. Your replies are saved for you. They aren't sent to anyone.",
  },
  {
    question: "Do I have to be at my computer?",
    answer:
      "No. The computer has to be on, with Chrome open and the Stand-in window visible during the call. You don't have to be there.",
  },
  {
    question: "Does the camera come on?",
    answer: "No. The camera stays off.",
  },
  {
    question: "Does it work with other video apps?",
    answer: "No. It works with Google Meet only, in Chrome.",
  },
];

export function Faq() {
  return (
    <Section id="faq" band>
      <div className="grid gap-12 lg:grid-cols-[4fr_8fr] lg:gap-16">
        <h2 className={H2_CLASS}>Short answers.</h2>
        <div className="divide-y border-y">
          {FAQ.map((item, index) => (
            <details
              key={item.question}
              open={index === 0}
              className="group py-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] leading-7 font-medium tracking-[-0.2px] [&::-webkit-details-marker]:hidden">
                {item.question}
                <IconChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-2 max-w-[640px] text-[16px] leading-[26px] text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function ClosingCta() {
  return (
    <Section className="text-center">
      <h2 className={`mx-auto max-w-[760px] ${H2_CLASS}`}>
        Two minutes the night before, instead of thirty minutes in the call.
      </h2>
      <p className={`mx-auto mt-5 max-w-[520px] ${BODY_CLASS}`}>
        Tell Stand-in what it may say. It goes to the Meet you can't.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <CreateAccountLink size="lg" />
        <SignInLink size="lg" variant="outline" />
      </div>
    </Section>
  );
}
