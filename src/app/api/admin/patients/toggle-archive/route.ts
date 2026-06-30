import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const body = await request.json();

    const patientId = String(body.patientId ?? "").trim();
    const isArchived = Boolean(body.isArchived);

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

    await patientRef.update({
      isArchived,
      updatedBy: admin.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: "Hasta arşiv durumu güncellendi." });
  } catch {
    return NextResponse.json(
      { message: "Hasta arşiv durumu güncellenemedi." },
      { status: 500 }
    );
  }
});
