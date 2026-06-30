import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const patientId = String(body.patientId ?? "").trim();

    if (!patientId) {
      return NextResponse.json(
        { message: "patientId zorunludur." },
        { status: 400 }
      );
    }

    const patientRef = adminDb.collection("patients").doc(patientId);
    const patientSnap = await patientRef.get();

    if (!patientSnap.exists) {
      return NextResponse.json(
        { message: "Hasta bulunamadı." },
        { status: 404 }
      );
    }

    const [testsSnap, appointmentsSnap] = await Promise.all([
      adminDb.collection("tests").where("patientId", "==", patientId).limit(1).get(),
      adminDb
        .collection("appointments")
        .where("patientId", "==", patientId)
        .limit(1)
        .get(),
    ]);

    if (!testsSnap.empty || !appointmentsSnap.empty) {
      return NextResponse.json(
        {
          message:
            "Bu hastaya bağlı test veya randevu kaydı var. Önce ilişkili kayıtları silin.",
        },
        { status: 409 }
      );
    }

    await patientRef.delete();

    return NextResponse.json({ message: "Hasta kalıcı olarak silindi." });
  } catch {
    return NextResponse.json(
      { message: "Hasta silinemedi." },
      { status: 500 }
    );
  }
});
