import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

function isAuthError(error: unknown): error is { code?: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const doctorId = String(body.doctorId ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const clinicId = String(body.clinicId ?? "").trim();

    if (!doctorId || !fullName || !email || !clinicId) {
      return NextResponse.json(
        { message: "doctorId, ad soyad, email ve klinik zorunludur." },
        { status: 400 }
      );
    }

    const clinicSnap = await adminDb.collection("clinics").doc(clinicId).get();

    if (!clinicSnap.exists) {
      return NextResponse.json(
        { message: "Seçilen klinik bulunamadı." },
        { status: 404 }
      );
    }

    await adminAuth.updateUser(doctorId, {
      email,
      displayName: fullName,
    });

    await adminAuth.setCustomUserClaims(doctorId, {
      role: "doctor",
      clinicId,
      isActive: true,
    });

    await adminDb.collection("users").doc(doctorId).update({
      fullName,
      email,
      clinicId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: "Doktor güncellendi.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message:
          isAuthError(error) && error.code === "auth/email-already-exists"
            ? "Bu e-posta başka bir kullanıcı tarafından kullanılıyor."
            : "Doktor güncellenemedi.",
      },
      { status: 500 }
    );
  }
});
