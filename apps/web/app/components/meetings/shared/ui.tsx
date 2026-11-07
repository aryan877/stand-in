import { actionErrorMessage } from "@agent-native/core/client/hooks";
import { IconChevronLeft, IconExternalLink } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { MEETINGS_PATH } from "@/lib/chat-paths";
import { cn } from "@/lib/utils";

export const meetingPath = (id: string) => `${MEETINGS_PATH}/${id}`;

export function LiveBars({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex h-3 items-end gap-[2px]", className)}
    >
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className="w-[3px] animate-bars rounded-full bg-live"
          style={{ animationDelay: `${bar * 150}ms` }}
        />
      ))}
    </span>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="@container mx-auto w-full max-w-[960px] px-4 pt-4 pb-20 sm:px-6">
      {children}
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-[30px] leading-9 font-normal tracking-[-0.6px] [overflow-wrap:anywhere]">
      {children}
    </h1>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">
      {children}
    </p>
  );
}

export function BackToMeetings() {
  return (
    <Link
      to={MEETINGS_PATH}
      className="-ml-0.5 inline-flex h-9 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <IconChevronLeft className="size-4" />
      Back to all calls
    </Link>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-xl leading-7 font-normal tracking-[-0.2px]">
      {children}
    </h2>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-0.5 text-sm leading-[22px] text-muted-foreground">
      {children}
    </p>
  );
}

export function Section({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <SectionTitle>{title}</SectionTitle>
      {hint ? <Hint>{hint}</Hint> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed px-5 py-6 text-sm leading-[22px] text-muted-foreground">
      {children}
    </p>
  );
}

export function ActionRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap", className)}
    >
      {children}
    </div>
  );
}

export function OpenInGoogleMeet({ url, size }: { url: string; size?: "sm" }) {
  return (
    <Button asChild variant="outline" size={size}>
      <a href={url} target="_blank" rel="noreferrer">
        <IconExternalLink />
        Open in Google Meet
      </a>
    </Button>
  );
}

export function friendlyError(error: unknown, fallback: string) {
  const message = actionErrorMessage(error);
  return message && !message.startsWith("Invalid action parameters")
    ? message
    : fallback;
}

export function ActionError({
  error,
  fallback,
  problem,
}: {
  error: unknown;
  fallback: string;
  problem?: string | null;
}) {
  const text = problem ?? (error ? friendlyError(error, fallback) : null);
  if (!text) return null;
  return (
    <p role="alert" className="text-sm leading-[22px] text-destructive">
      {text}
    </p>
  );
}

export function LoadingNote({ children }: { children: ReactNode }) {
  return <p className="py-3.5 text-sm text-muted-foreground">{children}</p>;
}

export function SavedNote() {
  return (
    <p role="status" className="text-sm leading-[22px] text-muted-foreground">
      Changes saved.
    </p>
  );
}

export function AgentChangedNotice({ onReload }: { onReload: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-xl border bg-muted/50 px-4 py-3 text-sm leading-[22px] sm:flex-row sm:items-center sm:justify-between"
    >
      <p>The agent changed this. Reload to see it.</p>
      <Button type="button" size="sm" variant="outline" onClick={onReload}>
        Reload
      </Button>
    </div>
  );
}

export const textFieldClass =
  "w-full rounded-md border bg-background px-3 py-2 text-[15px] leading-[22px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40";

export function Labeled({
  label,
  hint,
  optional = false,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        {optional ? (
          <span className="text-[13px] text-muted-foreground">Optional</span>
        ) : null}
      </span>
      {hint ? (
        <span className="mt-0.5 block text-sm leading-[22px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export function FormGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-xl border p-5">
      <legend className="float-left w-full font-display text-xl leading-7 font-normal tracking-[-0.2px]">
        {title}
      </legend>
      <div className="clear-both space-y-4 pt-4">{children}</div>
    </fieldset>
  );
}

export function Fact({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px] leading-6 [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

export type TabItem<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export function Tabs<T extends string>({
  items,
  active,
  onSelect,
}: {
  items: TabItem<T>[];
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-x-5 border-b sm:gap-x-6">
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex h-11 shrink-0 items-center gap-1.5 text-[15px] transition-colors",
              selected
                ? "font-medium text-foreground shadow-[inset_0_-2px_0_currentColor]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.count ? (
              <span className="rounded-full bg-muted px-1.5 text-xs leading-5 text-foreground tabular-nums">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
