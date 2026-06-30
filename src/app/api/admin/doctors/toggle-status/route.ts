import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const body = await request.json();

    const doctorId = String(body.doctorId ?? "").trim();
    const isActive = Boolean(body.isActive);

    if (!doctorId) {
      return NextResponse.json(
        { message: "doctorId zorunludur." },
        { status: 400 }
      );
    }

    const doctorSnap = await adminDb.collection("users").doc(doctorId).get();

    if (!doctorSnap.exists) {
      return NextResponse.json(
        { message: "Doktor bulunamadı." },
        { status: 404 }
      );
    }

    const doctorData = doctorSnap.data() ?? {};

    await adminAuth.updateUser(doctorId, {
      disabled: !isActive,
    });

    await adminAuth.setCustomUserClaims(doctorId, {
      role: String(doctorData.role ?? "doctor"),
      clinicId: String(doctorData.clinicId ?? ""),
      isActive,
    });

    await adminDb.collection("users").doc(doctorId).update({
      isActive,
      lastStatusChangedBy: admin.uid,
      lastStatusChangedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: "Durum güncellendi.",
    });
  } catch {
    return NextResponse.json(
      { message: "Durum güncellenemedi." },
      { status: 500 }
    );
  }
});
