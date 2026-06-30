import { FieldValue } from "firebase-admin/firestore";

import { sanitizeMetadata } from "@/lib/audit-log-utils";
import { adminDb } from "@/lib/firebase-admin";
import { VerifiedAdmin } from "@/lib/server-auth";

export {
  extractResourceId,
  inferAuditAction,
  inferResourceType,
  sanitizeMetadata,
} from "@/lib/audit-log-utils";

export type AuditLogInput = {
  admin: VerifiedAdmin;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(input: AuditLogInput) {
  const metadata = sanitizeMetadata(input.metadata ?? {});

  await adminDb.collection("admin_audit_logs").add({
    adminId: input.admin.uid,
    adminEmail: input.admin.email,
    adminName: input.admin.fullName,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    metadata,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}
