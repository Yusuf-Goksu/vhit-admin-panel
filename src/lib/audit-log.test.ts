import { describe, expect, it } from "vitest";

import {
  extractResourceId,
  inferAuditAction,
  inferResourceType,
  sanitizeMetadata,
} from "@/lib/audit-log-utils";

describe("audit-log helpers", () => {
  it("infers audit action from API path", () => {
    expect(inferAuditAction("/api/admin/patients/create")).toBe("patients.create");
    expect(inferAuditAction("/api/admin/doctors/reset-password")).toBe(
      "doctors.reset-password"
    );
  });

  it("infers resource type from action", () => {
    expect(inferResourceType("patients.create")).toBe("patients");
    expect(inferResourceType("feedbacks.delete-message")).toBe("feedbacks");
  });

  it("extracts resource id from known body keys", () => {
    expect(extractResourceId({ patientId: "p1", fullName: "Ali" })).toBe("p1");
    expect(extractResourceId({ doctorId: "d1" })).toBe("d1");
    expect(extractResourceId({ fullName: "Ali" })).toBeNull();
  });

  it("redacts sensitive metadata keys", () => {
    expect(
      sanitizeMetadata({
        fullName: "Ali",
        password: "secret",
        newPassword: "secret2",
        idToken: "token",
      })
    ).toEqual({
      fullName: "Ali",
      password: "[REDACTED]",
      newPassword: "[REDACTED]",
      idToken: "[REDACTED]",
    });
  });
});
