import type { AgentStep } from "@/lib/ai/agent";
import { formatDate } from "@/lib/dates";

type Result = Record<string, unknown>;

/** Plain-language description of each tool call, so users and judges can see how the agent got its answer. */
export function describeStep(step: AgentStep): string {
  if (step.type === "retry") return "Reformatted its answer after a validation error";
  let args: Record<string, string> = {};
  try {
    args = JSON.parse(step.args);
  } catch {}
  const r = (step.result ?? {}) as Result;
  switch (step.name) {
    case "find_client": {
      const matches = (r.matches as { name: string }[] | undefined) ?? [];
      return matches.length
        ? `Looked up "${args.name}" and matched ${matches.map((m) => m.name).join(", ")}`
        : `Looked up "${args.name}": new client`;
    }
    case "parse_amount":
      return r.ok ? `Read "${args.text}" as ${r.pesos}` : `Couldn't read "${args.text}" as an amount`;
    case "resolve_due_date":
      return r.ok ? `Worked out "${args.token?.replace(/_/g, " ")}" as ${formatDate(String(r.date))}` : `Couldn't work out the date "${args.token}"`;
    case "list_open_invoices":
      return `Checked unpaid invoices for ${args.client_name}`;
    default:
      return `Called ${step.name}`;
  }
}

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
