import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const feedbackId = String(body.feedbackId ?? "").trim();
    const adminNote = String(body.adminNote ?? "").trim();

    if (!feedbackId) {
      return NextResponse.json(
        { message: "feedbackId zorunludur." },
        { status: 400 }
      );
    }

    const feedbackRef = adminDb.collection("feedbacks").doc(feedbackId);
    const feedbackSnap = await feedbackRef.get();

    if (!feedbackSnap.exists) {
      return NextResponse.json(
        { message: "Geri bildirim bulunamadı." },
        { status: 404 }
      );
    }

    await feedbackRef.update({
      adminNote,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: "Admin notu kaydedildi." });
  } catch {
    return NextResponse.json(
      { message: "Admin notu kaydedilemedi." },
      { status: 500 }
    );
  }
});
