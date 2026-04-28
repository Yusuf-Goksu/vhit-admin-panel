import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
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

    await adminDb.collection("users").doc(doctorId).update({
      fullName,
      email,
      clinicId,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      message: "Doktor güncellendi.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        message:
          error?.code === "auth/email-already-exists"
            ? "Bu e-posta başka bir kullanıcı tarafından kullanılıyor."
            : "Doktor güncellenemedi.",
      },
      { status: 500 }
    );
  }
}