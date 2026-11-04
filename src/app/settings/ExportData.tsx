"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/** The export action with its note and messages. `children` follows it on phones and sits to its left from sm up. */
export function ExportData({ children }: { children: ReactNode }) {
  const noteId = useId();
  const [state, setState] = useState<"idle" | "working" | "done" | "failed">("idle");

  async function download() {
    setState("working");
    try {
      const res = await fetch("/settings/export");
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `payagent-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setState("done");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-2 sm:items-end sm:text-right">
        <Button type="button" variant="secondary" onClick={download} loading={state === "working"} loadingLabel="Preparing export…" aria-describedby={noteId}>
          Export data
        </Button>
        <p id={noteId} className="text-sm text-muted">Downloads a JSON file. Screenshot images aren&apos;t included.</p>
        {state === "failed" && <p role="alert" className="font-semibold text-danger">We couldn&apos;t export your data. Check your connection and try again.</p>}
        <p role="status" className="text-sm font-bold text-success empty:hidden">{state === "done" ? "Your export has downloaded" : ""}</p>
      </div>
      <div className="sm:shrink-0">{children}</div>
    </div>
  );
}
