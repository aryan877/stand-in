import type { ComponentProps, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ShotData } from "./shots";

export const H2_CLASS =
  "font-display text-[34px] leading-[40px] font-normal tracking-[-0.7px] md:text-[48px] md:leading-[54px] md:tracking-[-1.1px]";
export const H3_CLASS =
  "font-display text-[28px] leading-[34px] font-normal tracking-[-0.5px] md:text-[36px] md:leading-[42px] md:tracking-[-0.8px]";
export const BODY_CLASS =
  "text-[17px] leading-7 text-muted-foreground md:text-[18px] md:leading-[30px]";
export const CONTAINER = "mx-auto w-full max-w-[1200px]";

const SHOT_SHADOW =
  "shadow-[0_1px_2px_rgb(0_0_0/0.05),0_28px_56px_-28px_rgb(0_0_0/0.28)]";

export function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

export type Callout = {
  x: number;
  y: number;
  side: "left" | "right" | "top" | "bottom";
  text: string;
  onDark?: boolean;
};

const BUBBLE_SIDE = {
  left: "right-4 top-0 -translate-y-1/2",
  right: "left-4 top-0 -translate-y-1/2",
  top: "bottom-4 left-0 -translate-x-1/2",
  bottom: "top-4 left-0 -translate-x-1/2",
};

export function Pin({ x, y, side, text, onDark }: Callout) {
  return (
    <span
      className="absolute z-10 hidden md:block"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span
        className={cn(
          "landing-pin absolute -top-[6px] -left-[6px] size-3 rounded-full border-2",
          onDark
            ? "border-foreground bg-background"
            : "border-background bg-foreground",
        )}
      />
      <span
        className={cn(
          "absolute w-max max-w-[220px] rounded-lg px-2.5 py-1.5 text-[13px] leading-[18px] shadow-lg",
          onDark
            ? "bg-background text-foreground"
            : "bg-foreground text-background",
          BUBBLE_SIDE[side],
        )}
      >
        {text}
      </span>
    </span>
  );
}

export function WindowBar({
  label,
  dark,
}: {
  label: string;
  dark?: boolean | undefined;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-3 border-b px-3.5 text-xs",
        dark
          ? "border-white/10 bg-[#1b1b1d] text-white/60"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span aria-hidden className="flex shrink-0 gap-1.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className={cn(
              "size-2.5 rounded-full",
              dark ? "bg-white/20" : "bg-foreground/15",
            )}
          />
        ))}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

export function Shot({
  data,
  bar,
  dark,
  callouts,
  caption,
  className,
  imageClassName,
}: {
  data: ShotData;
  bar?: string;
  dark?: boolean;
  callouts?: Callout[];
  caption?: ReactNode;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div className={className}>
      <figure
        className={cn(
          "relative overflow-hidden rounded-xl border bg-background",
          SHOT_SHADOW,
        )}
      >
        {bar ? <WindowBar label={bar} dark={dark} /> : null}
        <div className="relative">
          <img
            src={data.src}
            width={data.width}
            height={data.height}
            alt={data.alt}
            loading="lazy"
            decoding="async"
            className={cn("block h-auto w-full", imageClassName)}
          />
          {callouts?.map((callout) => (
            <Pin key={callout.text} {...callout} />
          ))}
        </div>
      </figure>
      {callouts?.length ? (
        <ul className="mt-3 space-y-1.5 text-[14px] leading-[22px] text-muted-foreground md:hidden">
          {callouts.map((callout) => (
            <li key={callout.text} className="flex gap-2">
              <span
                aria-hidden
                className="mt-[8px] size-1.5 shrink-0 rounded-full bg-foreground"
              />
              {callout.text}
            </li>
          ))}
        </ul>
      ) : null}
      {caption ? (
        <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

export function Reveal({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("landing-reveal", className)}>{children}</div>;
}

export function Section({
  id,
  band,
  className,
  children,
}: {
  id?: string;
  band?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-16 border-t px-6 py-20 max-sm:px-4 md:py-28",
        band && "bg-muted",
        className,
      )}
    >
      <div className={CONTAINER}>{children}</div>
    </section>
  );
}

export function LinkButton({
  href,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "asChild"> & {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button asChild {...props}>
      <a href={href}>{children}</a>
    </Button>
  );
}

export function CreateAccountLink({ size }: { size: "sm" | "lg" }) {
  return (
    <LinkButton href="/signup" size={size}>
      Create your account
    </LinkButton>
  );
}

export function SignInLink({
  size,
  variant,
}: {
  size: "sm" | "lg";
  variant: "ghost" | "outline";
}) {
  return (
    <LinkButton href="/login" variant={variant} size={size}>
      Sign in
    </LinkButton>
  );
}
