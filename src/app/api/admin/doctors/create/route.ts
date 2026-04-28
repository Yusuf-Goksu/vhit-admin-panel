import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";

export async function POST(request: NextRequest) {
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

    await adminDb.collection("users").doc(userRecord.uid).set({
      fullName,
      email,
      role: "doctor",
      clinicId,
      isActive: true,
      lastStatusChangedBy: null,
      lastStatusChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
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
}