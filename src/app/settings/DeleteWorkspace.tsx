"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { deleteMyWorkspace } from "@/app/actions-workspace";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export function DeleteWorkspace() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, start] = useTransition();

  function confirmDelete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      try {
        await deleteMyWorkspace(form); // redirects to /welcome when it works
      } catch {
        setError("We couldn't delete your workspace. Check your connection and try again.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" className="border-danger text-danger" onClick={() => dialog.current?.showModal()}>
        Delete workspace
      </Button>
      <dialog
        ref={dialog}
        className="tr-dialog"
        aria-labelledby="delete-title"
        aria-describedby="delete-detail"
        onCancel={(e) => {
          if (deleting) e.preventDefault();
        }}
        onClose={() => {
          setTyped("");
          setError(null);
        }}
      >
        <form onSubmit={confirmDelete} className="flex flex-col gap-4">
          <h2 id="delete-title" className="text-xl font-extrabold">Delete this workspace?</h2>
          <div id="delete-detail" className="flex flex-col gap-2 text-muted">
            <p>This permanently deletes everything PayAgent stores for this workspace:</p>
            <ul className="list-disc pl-5">
              <li>Investigations, with their screenshots, pasted text and analyses</li>
              <li>Invoices, drafts and clients</li>
              <li>Preferences, activity history and usage records</li>
            </ul>
            <p>It can&apos;t be undone. Export your data first if you want a copy.</p>
          </div>
          <TextField label="Type DELETE to confirm" name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={deleting} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
          {error && <p role="alert" className="font-semibold text-danger">{error}</p>}
          <div className="tr-action-bar tr-action-bar--flow">
            <Button type="button" variant="secondary" disabled={deleting} onClick={() => dialog.current?.close()}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={typed !== "DELETE"} loading={deleting} loadingLabel="Deleting…">Delete workspace</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
