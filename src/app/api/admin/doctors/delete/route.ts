import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

function isAuthError(error: unknown): error is { code?: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const doctorId = String(body.doctorId ?? "").trim();

    if (!doctorId) {
      return NextResponse.json(
        { message: "doctorId zorunludur." },
        { status: 400 }
      );
    }

    await adminDb.collection("users").doc(doctorId).delete();

    try {
      await adminAuth.deleteUser(doctorId);
    } catch (error: unknown) {
      if (!isAuthError(error) || error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    return NextResponse.json({
      message: "Doktor kalıcı olarak silindi.",
    });
  } catch (error) {
    console.error("Delete doctor error:", error);

    return NextResponse.json(
      { message: "Doktor kalıcı olarak silinemedi." },
      { status: 500 }
    );
  }
});
