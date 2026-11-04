/**
 * A static picture of a conversation becoming an agreement, labelled as an example so it is never
 * mistaken for the user's data. The rows mirror what reconcile.ts records today: a percentage deposit
 * without an amount, and payment due dates rather than delivery dates.
 */
const ROWS = [
  { label: "Project", value: "Website", found: true },
  { label: "Amount", value: "₱15,000", found: true },
  { label: "Upfront", value: "50%", found: true },
  { label: "Due date", value: "Not mentioned", found: false },
];

function Bubble({ from, children }: { from: "client" | "you"; children: string }) {
  return (
    <p className={`max-w-[85%] rounded-card px-4 py-2 ${from === "you" ? "self-end rounded-br-sm bg-action text-on-action" : "self-start rounded-bl-sm bg-page"}`}>
      <span className="sr-only">{from === "you" ? "You: " : "Client: "}</span>
      {children}
    </p>
  );
}

export function WelcomeDemo() {
  return (
    <figure className="tr-surface flex flex-col gap-4 p-4 sm:p-5">
      <figcaption className="text-sm text-muted">Example: a chat and what PayAgent finds in it</figcaption>
      <div className="flex flex-col gap-2">
        <Bubble from="client">Let’s do the website for ₱15,000.</Bubble>
        <Bubble from="you">50% upfront, then the rest after delivery.</Bubble>
      </div>
      <svg aria-hidden="true" className="self-center text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v16M6 14l6 6 6-6" />
      </svg>
      <dl className="flex flex-col divide-y divide-line overflow-hidden rounded-control border-2 border-line">
        {ROWS.map((r) => (
          <div key={r.label} className={`flex items-center justify-between gap-3 px-4 py-3 ${r.found ? "" : "bg-warning-bg"}`}>
            <dt className={`shrink-0 ${r.found ? "text-muted" : "text-warning"}`}>{r.label}</dt>
            <dd className={`flex items-center gap-2 text-right font-bold tabular-nums ${r.found ? "" : "text-warning"}`}>
              <span>
                {r.value}
                <span className="sr-only">{r.found ? ", found in the chat" : ", missing"}</span>
              </span>
              <svg aria-hidden="true" className={`shrink-0 ${r.found ? "text-success" : ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {r.found ? <path d="M5 12l5 5 9-10" /> : <path d="M12 6v8M12 18h.01" />}
              </svg>
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
