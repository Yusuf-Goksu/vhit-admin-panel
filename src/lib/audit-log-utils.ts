const SENSITIVE_KEYS = new Set([
  "password",
  "newPassword",
  "idToken",
  "adminNote",
]);

export function sanitizeMetadata(metadata: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    if (value === undefined) continue;
    sanitized[key] = value;
  }

  return sanitized;
}

export function inferAuditAction(pathname: string) {
  return pathname.replace(/^\/api\/admin\//, "").replace(/\//g, ".");
}

export function inferResourceType(action: string) {
  return action.split(".")[0] ?? "unknown";
}

export function extractResourceId(body: Record<string, unknown>) {
  const keys = [
    "doctorId",
    "patientId",
    "clinicId",
    "appointmentId",
    "testId",
    "feedbackId",
    "messageId",
  ];

  for (const key of keys) {
    const value = body[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return null;
}
