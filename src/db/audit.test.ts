import { describe, expect, it, vi } from "vitest";
import { recordAudit } from "./audit";

describe("recordAudit", () => {
  it("inserts one row and returns its id", async () => {
    const values = vi.fn().mockReturnValue({ returning: () => Promise.resolve([{ id: "e1" }]) });
    const db = { insert: vi.fn().mockReturnValue({ values }) };
    const row = await recordAudit(db as never, "invoice", "11111111-1111-1111-1111-111111111111", "invoice.approved", { by: "user" });
    expect(row).toEqual({ id: "e1" });
    expect(values).toHaveBeenCalledWith({
      entityType: "invoice",
      entityId: "11111111-1111-1111-1111-111111111111",
      eventType: "invoice.approved",
      payload: { by: "user" },
    });
  });
});
