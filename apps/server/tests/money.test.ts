import { describe, it, expect } from "vitest";
import { toPaisa, toRupees, mul, taxOn } from "../src/lib/money.js";

describe("money", () => {
  it("parses rupees to paisa without float drift", () => {
    expect(toPaisa("800.00")).toBe(80000);
    expect(toPaisa("232000.00")).toBe(23200000);
    expect(toPaisa("0.01")).toBe(1);
  });

  it("renders paisa back to rupees", () => {
    expect(toRupees(80000)).toBe("800.00");
    expect(toRupees(1)).toBe("0.01");
  });

  it("multiplies and rounds half-up", () => {
    expect(mul(80000, 200)).toBe(16000000);
  });

  it("computes tax matching the PRA discount example", () => {
    // SaleValue 1298, TaxCharged 221 at 17% per PRA_INTEGRATION.md §6
    expect(taxOn(129800, 17)).toBe(22066);
  });
});
