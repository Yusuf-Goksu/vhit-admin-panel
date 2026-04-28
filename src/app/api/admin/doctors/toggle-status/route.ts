import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const doctorId = String(body.doctorId ?? "").trim();
    const isActive = Boolean(body.isActive);
    const changedBy = body.changedBy ? String(body.changedBy) : null;

    if (!doctorId) {
      return NextResponse.json(
        { message: "doctorId zorunludur." },
        { status: 400 }
      );
    }

    await adminAuth.updateUser(doctorId, {
      disabled: !isActive,
    });

    await adminDb.collection("users").doc(doctorId).update({
      isActive,
      lastStatusChangedBy: changedBy,
      lastStatusChangedAt: new Date(),
      updatedAt: new Date(),
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
}