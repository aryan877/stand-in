import { useActionMutation } from "@agent-native/core/client/hooks";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Question } from "../../../../server/db/schema";
import { ActionError, Labeled, textFieldClass } from "./ui";

export function QuestionCard({ question }: { question: Question }) {
  const answer = useActionMutation("answer-question");
  const [reply, setReply] = useState("");
  const suggested: string[] = JSON.parse(question.suggestedRepliesJson);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (reply.trim()) answer.mutate({ id: question.id, answer: reply.trim() });
  };

  return (
    <article className="rounded-xl border p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">{question.askedBy} asked:</p>
      <p className="mt-0.5 text-[15px] leading-6 font-medium [overflow-wrap:anywhere]">
        {question.body}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        {suggested.length ? (
          <div>
            <p className="text-sm leading-[22px] text-muted-foreground">
              <span className="font-medium text-foreground">
                Suggested replies.
              </span>{" "}
              Pick one, then change it if you like.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggested.map((text) => (
                <Button
                  key={text}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setReply(text)}
                  className="h-auto min-h-8 justify-start py-1.5 text-left whitespace-normal"
                >
                  {text}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <Labeled label="Your reply">
          <textarea
            rows={1}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            className={cn(
              textFieldClass,
              "field-sizing-content min-h-10 resize-none",
            )}
          />
        </Labeled>
        <ActionError
          error={answer.error}
          fallback="Couldn't save your reply."
        />
        <Button
          type="submit"
          disabled={!reply.trim() || answer.isPending}
          className="w-full sm:w-auto"
        >
          Save reply
        </Button>
      </form>
    </article>
  );
}
