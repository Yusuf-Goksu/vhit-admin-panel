import { describe, expect, it } from "vitest";

import { buildCsv, escapeCsvValue } from "@/lib/csv-export";

describe("csv-export", () => {
  it("escapes quotes in csv values", () => {
    expect(escapeCsvValue('Ali "Test"')).toBe('"Ali ""Test"""');
  });

  it("builds csv with utf-8 bom", () => {
    const csv = buildCsv(["Ad", "Not"], [["Ali", "Merhaba"]]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Ad","Not"');
    expect(csv).toContain('"Ali","Merhaba"');
  });
});
