import { describe, expect, it } from "vitest";
import { describeStep } from "./describe-step";

describe("describeStep", () => {
  it("describes a parsed amount", () => {
    expect(describeStep({ type: "tool_call", name: "parse_amount", args: '{"text":"2.5k"}', result: { ok: true, amount: "2500.00" } })).toBe(
      'Read "2.5k" as 2,500.00',
    );
  });
});
