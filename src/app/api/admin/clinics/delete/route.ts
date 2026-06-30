import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const clinicId = String(body.clinicId ?? "").trim();

    if (!clinicId) {
      return NextResponse.json(
        { message: "clinicId zorunludur." },
        { status: 400 }
      );
    }

    const clinicRef = adminDb.collection("clinics").doc(clinicId);
    const clinicSnap = await clinicRef.get();

    if (!clinicSnap.exists) {
      return NextResponse.json(
        { message: "Klinik bulunamadı." },
        { status: 404 }
      );
    }

    const [doctorsSnap, patientsSnap] = await Promise.all([
      adminDb.collection("users").where("clinicId", "==", clinicId).limit(1).get(),
      adminDb.collection("patients").where("clinicId", "==", clinicId).limit(1).get(),
    ]);

    if (!doctorsSnap.empty || !patientsSnap.empty) {
      return NextResponse.json(
        {
          message:
            "Bu kliniğe bağlı doktor veya hasta kaydı var. Önce ilişkili kayıtları taşıyın veya silin.",
        },
        { status: 409 }
      );
    }

    await clinicRef.delete();

    return NextResponse.json({ message: "Klinik silindi." });
  } catch {
    return NextResponse.json(
      { message: "Klinik silinemedi." },
      { status: 500 }
    );
  }
});
