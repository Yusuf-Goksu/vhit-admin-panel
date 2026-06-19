import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const ADMIN_ROLES = new Set(["admin", "super_admin", "owner"]);

type AuthResult =
  | {
      ok: true;
      source: "admin" | "webhook";
      uid?: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

function verifyWebhookSecret(request: NextRequest): AuthResult | null {
  const expectedSecret = process.env.VHIT_WEBHOOK_SECRET;

  if (!expectedSecret) return null;

  const providedSecret = request.headers.get("x-vhit-webhook-secret");

  if (!providedSecret) return null;

  if (providedSecret !== expectedSecret) {
    return {
      ok: false,
      status: 401,
      message: "Webhook doğrulaması başarısız.",
    };
  }

  return {
    ok: true,
    source: "webhook",
  };
}

export async function requireAdminOrWebhookSecret(
  request: NextRequest
): Promise<AuthResult> {
  const webhookResult = verifyWebhookSecret(request);

  if (webhookResult) {
    return webhookResult;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!token) {
    return {
      ok: false,
      status: 401,
      message: "Yetkilendirme token'ı eksik.",
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();

    if (!userSnap.exists) {
      return {
        ok: false,
        status: 403,
        message: "Kullanıcı profili bulunamadı.",
      };
    }

    const user = userSnap.data();
    const role = String(user?.role ?? "");
    const isActive = user?.isActive ?? true;

    if (!isActive || !ADMIN_ROLES.has(role)) {
      return {
        ok: false,
        status: 403,
        message: "Bu işlem için admin yetkisi gerekir.",
      };
    }

    return {
      ok: true,
      source: "admin",
      uid: decoded.uid,
    };
  } catch {
    return {
      ok: false,
      status: 401,
      message: "Geçersiz token.",
    };
  }
}