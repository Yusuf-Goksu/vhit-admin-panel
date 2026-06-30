import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

const ALLOWED_STATUSES = new Set(["open", "reviewing", "resolved", "closed"]);

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const feedbackId = String(body.feedbackId ?? "").trim();
    const status = String(body.status ?? "").trim();

    if (!feedbackId || !status) {
      return NextResponse.json(
        { message: "feedbackId ve status zorunludur." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { message: "Geçersiz geri bildirim durumu." },
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

    const payload: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (status === "resolved") {
      payload.resolvedAt = FieldValue.serverTimestamp();
      payload.closedAt = null;
    } else if (status === "closed") {
      payload.closedAt = FieldValue.serverTimestamp();
    } else {
      payload.resolvedAt = null;
      payload.closedAt = null;
    }

    await feedbackRef.update(payload);

    return NextResponse.json({ message: "Geri bildirim durumu güncellendi." });
  } catch {
    return NextResponse.json(
      { message: "Geri bildirim durumu güncellenemedi." },
      { status: 500 }
    );
  }
});
