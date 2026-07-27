import { describe, expect, it } from "vitest";
import { localDateInputValue } from "../../lib/date/local-date";

describe("local date defaults", () => {
  it("uses the local calendar date rather than UTC", () => {
    expect(localDateInputValue(new Date(2026, 6, 12, 17, 30))).toBe(
      "2026-07-12",
    );
  });
});
