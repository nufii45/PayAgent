import type { AgentStep } from "@/lib/ai/agent";
import { describeStep } from "@/lib/describe-step";


export function AgentSteps({ steps, model, latencyMs }: { steps: AgentStep[]; model?: string; latencyMs?: number }) {
  if (!steps.length && !model) return null;
  return (
    <section aria-labelledby="agent-steps" className="flex flex-col gap-2">
      <h3 id="agent-steps" className="font-bold">
        How PayAgent worked this out
      </h3>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-muted">
        {steps.map((s, i) => (
          <li key={i}>{describeStep(s)}</li>
        ))}
        {!steps.length && <li>Answered directly without using tools</li>}
      </ol>
      {model && (
        <p className="text-sm text-muted">
          {model}
          {latencyMs != null && ` · ${(latencyMs / 1000).toFixed(1)} s`}
        </p>
      )}
    </section>
  );
}
