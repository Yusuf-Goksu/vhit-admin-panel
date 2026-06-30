import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const appointmentId = String(body.appointmentId ?? "").trim();

    if (!appointmentId) {
      return NextResponse.json(
        { message: "appointmentId zorunludur." },
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

    await appointmentRef.delete();

    return NextResponse.json({ message: "Randevu silindi." });
  } catch {
    return NextResponse.json(
      { message: "Randevu silinemedi." },
      { status: 500 }
    );
  }
});
