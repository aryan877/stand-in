import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agent-native/toolkit/ui/dialog";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const COPIED_MS = 1500;

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border py-1 pe-1 ps-3">
      <code className="min-w-0 truncate text-[13px]">{value}</code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void copy()}
        aria-label={`Copy ${value}`}
      >
        {copied ? (
          <IconCheck className="size-4" aria-hidden />
        ) : (
          <IconCopy className="size-4" aria-hidden />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function GetExtensionButton() {
  return (
    <>
      <p className="text-sm text-muted-foreground sm:hidden">
        Open Stand-in on your computer to add the Chrome extension.
      </p>
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="max-sm:hidden">
            Get the Chrome extension
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add the Chrome extension</DialogTitle>
            <DialogDescription>
              The extension lets Stand-in join calls from your own Chrome. Do
              this once, in the Chrome profile you use for Google Meet.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-4 ps-5 text-sm">
            <li>
              Open this address in a new tab.
              <CopyRow value="chrome://extensions" />
            </li>
            <li>Turn on Developer mode, at the top right.</li>
            <li>Click Load unpacked.</li>
            <li>
              Choose this folder inside your Stand-in download.
              <CopyRow value="apps/extension/dist" />
            </li>
          </ol>
          <p className="text-sm text-muted-foreground">
            Refresh this page when you're done. Stand-in will show that it's
            connected.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
