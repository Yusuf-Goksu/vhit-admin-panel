import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

const ALLOWED_STATUSES = new Set(["scheduled", "completed", "cancelled"]);

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const appointmentId = String(body.appointmentId ?? "").trim();
    const status = String(body.status ?? "").trim();

    if (!appointmentId || !status) {
      return NextResponse.json(
        { message: "appointmentId ve status zorunludur." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { message: "Geçersiz randevu durumu." },
        { status: 400 }
      );
    }

    const appointmentRef = adminDb.collection("appointments").doc(appointmentId);
    const appointmentSnap = await appointmentRef.get();

    if (!appointmentSnap.exists) {
      return NextResponse.json(
        { message: "Randevu bulunamadı." },
        { status: 404 }
      );
    }

    await appointmentRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: "Randevu durumu güncellendi." });
  } catch {
    return NextResponse.json(
      { message: "Randevu durumu güncellenemedi." },
      { status: 500 }
    );
  }
});
