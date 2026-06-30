import { NextRequest, NextResponse } from "next/server";

import {
  extractResourceId,
  inferAuditAction,
  inferResourceType,
} from "@/lib/audit-log-utils";
import { writeAuditLog } from "@/lib/audit-log";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { getOrCreateRequestId, withRequestId } from "@/lib/request-id";
import { requireAdmin, VerifiedAdmin } from "@/lib/server-auth";

type AdminRouteHandler = (
  request: NextRequest,
  admin: VerifiedAdmin
) => Promise<NextResponse>;

export function withAdminAuth(handler: AdminRouteHandler) {
  return async (request: NextRequest) => {
    const requestId = getOrCreateRequestId(request);
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(
      `admin:${ip}`,
      RATE_LIMITS.adminApi.limit,
      RATE_LIMITS.adminApi.windowMs
    );

    if (!rateLimit.success) {
      return withRequestId(rateLimitResponse(rateLimit), requestId);
    }

    const authResult = await requireAdmin(request);

    if ("response" in authResult) {
      return withRequestId(authResult.response, requestId);
    }

    let body: Record<string, unknown> = {};

    try {
      body = (await request.clone().json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const response = await handler(request, authResult.admin);

    if (response.ok && request.method !== "GET") {
      const action = inferAuditAction(request.nextUrl.pathname);

      await writeAuditLog({
        admin: authResult.admin,
        action,
        resourceType: inferResourceType(action),
        resourceId: extractResourceId(body),
        metadata: body,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      }).catch((error) => {
        console.error("Audit log write failed:", error);
      });
    }

    return withRequestId(response, requestId);
  };
}
