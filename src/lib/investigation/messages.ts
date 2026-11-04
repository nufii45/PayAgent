// Drafted messages for the user to send themselves. Built from the analysis by code, so they
// only mention amounts and facts the analysis supports. Nothing is ever sent automatically.
import { moneyText, type Analysis, type MoneyFormat as Format } from "./reconcile";

const greet = (a: Analysis) => `Hi${a.summary.clientName ? ` ${a.summary.clientName.split(" ")[0]}` : ""}!`;

export function clarificationMessage(a: Analysis, format: Format): string | null {
  const questions: string[] = [];
  for (const item of a.items) {
    const name = item.label;
    if (item.status === "change_proposed" && item.agreedCentavos != null && item.proposedCentavos != null)
      questions.push(`For the ${name}, we agreed on ${format(item.agreedCentavos, item.currency)}, then ${format(item.proposedCentavos, item.currency)} came up. Which one should I bill?`);
    else if (item.status === "cancelled" && item.affectedCentavos != null)
      questions.push(`Just confirming the ${name} (${format(item.affectedCentavos, item.currency)}) is cancelled and I shouldn't include it.`);
    else if (item.status === "disputed" && item.affectedCentavos != null)
      questions.push(`The ${name} was already done when it was cancelled. Can we agree how to handle the ${format(item.affectedCentavos, item.currency)}?`);
    else if (item.status === "proposed" && item.proposedCentavos != null)
      questions.push(`Are we good with ${format(item.proposedCentavos, item.currency)} for the ${name}?`);
    else if (item.status === "requested") questions.push(`For the ${name}, should I send you a price first?`);
  }
  if (a.summary.claimedCentavos > 0) questions.push(`Could you send the receipt for the ${moneyText(a, "claimed", format)} payment so I can match it?`);
  if (!a.summary.dueDate && a.summary.agreedTotalCentavos > 0) questions.push("When would you like to settle the balance?");
  if (!questions.length) return null;
  return [`${greet(a)} Before I send the invoice, a quick check:`, ...questions.map((q, i) => `${i + 1}. ${q}`), "Thank you!"].join("\n");
}

export function followUpMessage(a: Analysis, format: Format): string | null {
  const s = a.summary;
  if (s.agreedTotalCentavos === 0) return null;
  const lines = [`${greet(a)} Friendly reminder on our agreement: ${moneyText(a, "agreed", format)} in total.`];
  if (s.promisedCentavos > 0) lines.push(`You mentioned sending ${moneyText(a, "promised", format)}. I haven't received it yet, could you let me know when it's sent?`);
  if (s.claimedCentavos > 0) lines.push(`You mentioned paying ${moneyText(a, "claimed", format)}. Could you send the receipt so I can match it?`);
  if (s.dueDate) lines.push(`The balance is due on ${new Date(`${s.dueDate}T00:00:00Z`).toLocaleDateString("en-PH", { month: "long", day: "numeric", timeZone: "UTC" })}.`);
  lines.push("Thank you!");
  return lines.join("\n");
}
