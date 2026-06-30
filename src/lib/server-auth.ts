import { NextRequest, NextResponse } from "next/server";
import { DecodedIdToken } from "firebase-admin/auth";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { isAdminRole } from "@/lib/roles";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

export type VerifiedAdmin = {
  uid: string;
  email: string;
  fullName: string;
  role: string;
  clinicId: string;
};

type AuthFailure = {
  response: NextResponse;
};

type AuthSuccess = {
  admin: VerifiedAdmin;
};

export type AdminAuthResult = AuthFailure | AuthSuccess;

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
}

function getSessionCookie(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

async function decodeAuthToken(token: string, isSessionCookie: boolean) {
  if (isSessionCookie) {
    return adminAuth.verifySessionCookie(token, true);
  }

  return adminAuth.verifyIdToken(token);
}

async function loadAdminProfile(
  decoded: DecodedIdToken
): Promise<VerifiedAdmin | null> {
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();

  if (!userSnap.exists) {
    return null;
  }

  const data = userSnap.data() ?? {};
  const role = String(data.role ?? "");
  const isActive = data.isActive ?? true;

  if (!isActive || !isAdminRole(role)) {
    return null;
  }

  return {
    uid: decoded.uid,
    email: String(data.email ?? decoded.email ?? ""),
    fullName: String(data.fullName ?? decoded.name ?? ""),
    role,
    clinicId: String(data.clinicId ?? ""),
  };
}

export async function requireAdmin(
  request: NextRequest
): Promise<AdminAuthResult> {
  const bearerToken = getBearerToken(request);
  const sessionCookie = getSessionCookie(request);
  const token = bearerToken ?? sessionCookie;

  if (!token) {
    return {
      response: NextResponse.json(
        { message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = await decodeAuthToken(token, !bearerToken && !!sessionCookie);
    const admin = await loadAdminProfile(decoded);

    if (!admin) {
      return {
        response: NextResponse.json(
          { message: "Bu işlem için yetkiniz yok." },
          { status: 403 }
        ),
      };
    }

    return { admin };
  } catch {
    return {
      response: NextResponse.json(
        { message: "Oturum geçersiz veya süresi dolmuş." },
        { status: 401 }
      ),
    };
  }
}

export async function syncUserCustomClaims(uid: string) {
  const userSnap = await adminDb.collection("users").doc(uid).get();

  if (!userSnap.exists) {
    return;
  }

  const data = userSnap.data() ?? {};

  await adminAuth.setCustomUserClaims(uid, {
    role: String(data.role ?? ""),
    clinicId: String(data.clinicId ?? ""),
    isActive: data.isActive ?? true,
  });
}

export function createSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSessionCookieFromIdToken(idToken: string) {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...createSessionCookieOptions(),
    maxAge: 0,
  });
}
