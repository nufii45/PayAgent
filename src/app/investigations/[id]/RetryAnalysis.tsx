"use client";

import { useState, useTransition } from "react";
import { rerunAnalysis } from "@/app/investigations/actions";
import { Working } from "@/components/investigation/EvidencePicker";
import { Button } from "@/components/ui/Button";

export function RetryAnalysis({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-3">
      {pending && <Working label="Analysing…" />}
      {error && <p role="alert" className="font-semibold text-danger">{error}</p>}
      <Button onClick={() => start(async () => setError((await rerunAnalysis(id)).error ?? null))} loading={pending} loadingLabel="Analysing…">
        Run the analysis
      </Button>
    </div>
  );
}
