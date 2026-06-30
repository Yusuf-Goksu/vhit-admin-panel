import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const body = await request.json();

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "").trim();
    const clinicId = String(body.clinicId ?? "").trim();

    if (!fullName || !email || !password || !clinicId) {
      return NextResponse.json(
        { message: "Ad soyad, email, şifre ve klinik zorunludur." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Şifre en az 6 karakter olmalıdır." },
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

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
      disabled: false,
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: "doctor",
      clinicId,
      isActive: true,
    });

    await adminDb.collection("users").doc(userRecord.uid).set({
      fullName,
      email,
      role: "doctor",
      clinicId,
      isActive: true,
      lastStatusChangedBy: null,
      lastStatusChangedAt: null,
      createdBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      id: userRecord.uid,
      message: "Doktor oluşturuldu.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        message:
          error?.code === "auth/email-already-exists"
            ? "Bu e-posta ile kayıtlı kullanıcı zaten var."
            : "Doktor oluşturulamadı.",
      },
      { status: 500 }
    );
  }
});
