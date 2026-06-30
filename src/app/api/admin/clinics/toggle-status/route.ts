import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const body = await request.json();

    const clinicId = String(body.clinicId ?? "").trim();
    const isActive = Boolean(body.isActive);

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

    await clinicRef.update({
      isActive,
      updatedBy: admin.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: "Klinik durumu güncellendi." });
  } catch {
    return NextResponse.json(
      { message: "Klinik durumu güncellenemedi." },
      { status: 500 }
    );
  }
});
