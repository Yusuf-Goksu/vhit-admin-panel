import { describe, expect, it } from "vitest";

import {
  parseOptionalBoolean,
  parseOptionalString,
  parsePageSize,
} from "@/lib/server-list-utils";

describe("server-list parsers", () => {
  it("parses page size with upper bound", () => {
    expect(parsePageSize("20")).toBe(20);
    expect(parsePageSize("999")).toBe(50);
    expect(parsePageSize("invalid", 15)).toBe(15);
  });

  it("parses optional booleans", () => {
    expect(parseOptionalBoolean("true")).toBe(true);
    expect(parseOptionalBoolean("false")).toBe(false);
    expect(parseOptionalBoolean(null)).toBeUndefined();
  });

  it("parses optional strings", () => {
    expect(parseOptionalString("  abc  ")).toBe("abc");
    expect(parseOptionalString("   ")).toBeUndefined();
    expect(parseOptionalString(null)).toBeUndefined();
  });
});
