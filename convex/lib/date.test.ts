import { describe, it, expect, vi, afterEach } from "vitest";
import { todaySast, currentMonthKeySast } from "./date";

describe("date", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("todaySast", () => {
    it("rolls over to the next SAST day before UTC midnight", () => {
      // 2026-01-01T22:30:00Z is 2026-01-02T00:30 in SAST (UTC+2).
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T22:30:00.000Z"));

      expect(todaySast()).toBe("2026-01-02");
    });

    it("matches the UTC date once past the SAST offset", () => {
      // 2026-01-02T10:00:00Z is 2026-01-02T12:00 in SAST — same calendar day.
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-02T10:00:00.000Z"));

      expect(todaySast()).toBe("2026-01-02");
    });

    it("stays on the previous SAST day just before the boundary", () => {
      // 2026-01-01T21:59:00Z is 2026-01-01T23:59 in SAST — still Jan 1.
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T21:59:00.000Z"));

      expect(todaySast()).toBe("2026-01-01");
    });
  });

  describe("currentMonthKeySast", () => {
    it("returns the SAST month even when UTC is still in the prior month", () => {
      // 2026-01-31T22:30:00Z is 2026-02-01T00:30 in SAST.
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-31T22:30:00.000Z"));

      expect(currentMonthKeySast()).toBe("2026-02");
    });
  });
});
