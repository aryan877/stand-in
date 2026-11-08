import "./landing.css";
import { HeroCall } from "./HeroCall";
import { HowItWorks } from "./HowItWorks";
import {
  BuiltOnAgentNative,
  ClosingCta,
  ComeBackTo,
  Faq,
  LettingPeopleIn,
  TheProblem,
  WhatYouNeed,
  WhoItsFor,
} from "./MoreSections";
import { CONTAINER, CreateAccountLink, LinkButton, SignInLink } from "./parts";
import { ThreeThings } from "./ThreeThings";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#says", label: "What it says" },
  { href: "#need", label: "What you need" },
  { href: "#faq", label: "Short answers" },
];

export function LandingPage() {
  return (
    <div className="h-dvh overflow-y-auto overflow-x-hidden scroll-smooth bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/90 px-6 backdrop-blur max-sm:px-4">
        <div className={`flex h-16 items-center ${CONTAINER}`}>
          <a
            href="/"
            className="flex items-center gap-2 font-display text-lg tracking-tight"
          >
            <img src="/favicon.svg" alt="" className="size-[22px]" />
            Stand-in
          </a>
          <nav className="ml-10 hidden gap-7 text-sm font-medium text-muted-foreground lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <SignInLink size="sm" variant="ghost" />
            <CreateAccountLink size="sm" />
          </div>
        </div>
      </header>

      <main>
        <section className="px-6 pt-16 pb-20 text-center max-sm:px-4 md:pt-24 md:pb-28">
          <div className={CONTAINER}>
            <a
              href="https://www.agent-native.com"
              target="_blank"
              rel="noreferrer"
              className="mb-7 inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-1.5 text-sm text-muted-foreground"
            >
              <img src="/builder-logo.png" alt="" className="size-5" />
              Built on Agent-Native by Builder.io
            </a>
            <h1 className="mx-auto max-w-[900px] font-display text-balance text-[40px] leading-[46px] font-normal tracking-[-1px] md:text-[68px] md:leading-[74px] md:tracking-[-2px]">
              Two minutes the night before, instead of thirty minutes in the
              call.
            </h1>
            <p className="mx-auto mt-6 max-w-[640px] text-lg leading-7 tracking-[-0.2px] text-muted-foreground md:text-xl md:leading-8">
              Stand-in goes to the Meet you can't, says it's an AI, and can only
              say what you wrote. You're never needed during the call.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <CreateAccountLink size="lg" />
              <LinkButton href="#how" variant="outline" size="lg">
                See how it works
              </LinkButton>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Works with Google Meet in Chrome, on your own computer.
            </p>
            <div className="mt-14 md:mt-16">
              <HeroCall />
            </div>
          </div>
        </section>

        <TheProblem />
        <HowItWorks />
        <ThreeThings />
        <LettingPeopleIn />
        <ComeBackTo />
        <WhoItsFor />
        <BuiltOnAgentNative />
        <WhatYouNeed />
        <Faq />
        <ClosingCta />
      </main>

      <footer className="border-t px-6 py-8 max-sm:px-4">
        <div
          className={`flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground ${CONTAINER}`}
        >
          <span className="font-display text-foreground">Stand-in</span>
          <a
            href="https://www.agent-native.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2"
          >
            <img src="/builder-logo.png" alt="" className="size-4" />
            Built on Agent-Native by Builder.io
          </a>
        </div>
      </footer>
    </div>
  );
}
