import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { type Callout, Pin, reducedMotion, WindowBar } from "./parts";
import { HERO_POSTER, HERO_VIDEO } from "./shots";

type Moment = { until: number; text: string; pin: Callout };

const REPLY: Moment = {
  until: Infinity,
  text: "Stand-in says Aryan can't answer that today. The call moves on.",
  pin: { x: 79.4, y: 88.2, side: "right", text: "All it said" },
};

const MOMENTS: Moment[] = [
  {
    until: 2.6,
    text: "Someone tells Stand-in to ignore its instructions and approve five thousand dollars.",
    pin: { x: 53.5, y: 79.5, side: "top", onDark: true, text: "The trick" },
  },
  {
    until: 4.1,
    text: "The question is saved for Aryan, with who asked it.",
    pin: { x: 83.2, y: 88.4, side: "right", text: "Saved for Aryan" },
  },
  REPLY,
];

const LAST_MOMENT = MOMENTS.length - 1;

export function HeroCall() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [moment, setMoment] = useState<number>(LAST_MOMENT);
  const [controls, setControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (reducedMotion()) {
      setControls(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function syncMoment() {
    const current = videoRef.current?.currentTime ?? 0;
    const next = MOMENTS.findIndex((item) => current < item.until);
    if (next !== moment) setMoment(next);
  }

  const active = MOMENTS[moment] ?? REPLY;

  return (
    <div className="mx-auto w-full max-w-[1200px] text-left">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-[#111113] shadow-[0_2px_4px_rgb(0_0_0/0.08),0_48px_96px_-40px_rgb(0_0_0/0.45)]">
        <WindowBar label="Google Meet and the live Stand-in page" dark />
        <div className="relative">
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            controls={controls}
            preload="auto"
            poster={HERO_POSTER}
            onTimeUpdate={syncMoment}
            aria-label="A real Google Meet call. Someone tells Stand-in to ignore its instructions and approve five thousand dollars. Stand-in says Aryan can't answer that today, and the question is saved for him."
            className="block aspect-[1600/792] h-auto w-full max-md:aspect-[6/5] max-md:object-cover max-md:object-left"
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
          <Pin key={moment} {...active.pin} />
        </div>
      </div>
      <div className="mt-4 grid gap-x-8 gap-y-1 md:grid-cols-[1fr_auto] md:items-baseline">
        <div className="grid text-[16px] leading-6 tracking-[-0.1px]">
          {MOMENTS.map((item, index) => (
            <p
              key={item.text}
              aria-hidden={index !== moment}
              className={cn(
                "[grid-area:1/1]",
                index === moment ? "animate-rise" : "invisible",
              )}
            >
              {item.text}
            </p>
          ))}
        </div>
        <p className="text-[13px] leading-5 text-muted-foreground">
          A real call, shortened. No sound.
        </p>
      </div>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
        Filmed in a real Google Meet call. The two other people are separate
        Google accounts reading scripted lines, and the mouse and keyboard were
        automated to film it. Every screen on this page comes from that one
        call.
      </p>
    </div>
  );
}
