import { describe, expect, it } from "bun:test";
import { formatNpr, isValidEmail, isValidPhone, toTitleCase } from "../../src/utils";

describe("Utils: Formatters & Validators", () => {
  it("formats NPR currency numbers with commas properly", () => {
    expect(formatNpr(85000)).toBe("NPR 85,000");
    expect(formatNpr(1500000)).toBe("NPR 15,00,000");
    expect(formatNpr(0)).toBe("NPR 0");
    expect(formatNpr(null)).toBe("NPR 0");
    expect(formatNpr(undefined)).toBe("NPR 0");
  });

  it("converts strings to Title Case", () => {
    expect(toTitleCase("grand royal stage")).toBe("Grand Royal Stage");
    expect(toTitleCase("WEDDING RECEPTION")).toBe("Wedding Reception");
  });

  it("validates emails correctly", () => {
    expect(isValidEmail("client@example.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("user@domain")).toBe(false);
  });

  it("validates Nepal phone numbers", () => {
    expect(isValidPhone("9841234567")).toBe(true);
    expect(isValidPhone("+977 9801234567")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
  });
});
