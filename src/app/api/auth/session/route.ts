import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { isAdminRole } from "@/lib/roles";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { getOrCreateRequestId, withRequestId } from "@/lib/request-id";
import {
  clearSessionCookie,
  createSessionCookieFromIdToken,
  createSessionCookieOptions,
  syncUserCustomClaims,
} from "@/lib/server-auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `auth-session:${ip}`,
    RATE_LIMITS.authSession.limit,
    RATE_LIMITS.authSession.windowMs
  );

  if (!rateLimit.success) {
    return withRequestId(rateLimitResponse(rateLimit), requestId);
  }

  try {
    const body = await request.json();
    const idToken = String(body.idToken ?? "").trim();

    if (!idToken) {
      return NextResponse.json(
        { message: "idToken zorunludur." },
        { status: 400 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { message: "Kullanıcı profili bulunamadı." },
        { status: 403 }
      );
    }

    const data = userSnap.data() ?? {};
    const role = String(data.role ?? "");
    const isActive = data.isActive ?? true;

    if (!isActive || !isAdminRole(role)) {
      return NextResponse.json(
        { message: "Bu kullanıcı admin paneline erişemez." },
        { status: 403 }
      );
    }

    await syncUserCustomClaims(decoded.uid);

    const sessionCookie = await createSessionCookieFromIdToken(idToken);

    const response = NextResponse.json({ message: "Oturum oluşturuldu." });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, createSessionCookieOptions());

    return withRequestId(response, requestId);
  } catch {
    return withRequestId(
      NextResponse.json(
        { message: "Oturum oluşturulamadı." },
        { status: 401 }
      ),
      requestId
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ message: "Oturum sonlandırıldı." });
  clearSessionCookie(response);
  return response;
}
