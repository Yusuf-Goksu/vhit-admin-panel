import { describe, expect, it, beforeEach } from "vitest";

import { checkRateLimit, resetRateLimitBuckets } from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("allows requests under the limit", () => {
    const first = checkRateLimit("test-key", 3, 60_000);
    const second = checkRateLimit("test-key", 3, 60_000);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it("blocks requests over the limit", () => {
    checkRateLimit("blocked-key", 2, 60_000);
    checkRateLimit("blocked-key", 2, 60_000);
    const third = checkRateLimit("blocked-key", 2, 60_000);

    expect(third.success).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("isolates buckets by key", () => {
    checkRateLimit("a", 1, 60_000);
    const blockedA = checkRateLimit("a", 1, 60_000);
    const allowedB = checkRateLimit("b", 1, 60_000);

    expect(blockedA.success).toBe(false);
    expect(allowedB.success).toBe(true);
  });
});
