import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const body = await request.json();

    const feedbackId = String(body.feedbackId ?? "").trim();
    const message = String(body.message ?? "").trim();
    const adminName = String(body.adminName ?? "v-HIT Destek").trim();

    if (!feedbackId || !message) {
      return NextResponse.json(
        { message: "feedbackId ve message zorunludur." },
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

    const messageRef = feedbackRef.collection("messages").doc();
    const batch = adminDb.batch();

    batch.set(messageRef, {
      senderId: admin.uid,
      senderName: adminName,
      senderRole: "admin",
      message,
      attachmentUrl: null,
      attachmentPath: null,
      attachmentFileName: null,
      attachmentContentType: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    batch.update(feedbackRef, {
      lastMessage: message,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageSenderRole: "admin",
      unreadForUser: true,
      unreadForAdmin: false,
      messageCount: FieldValue.increment(1),
      status: "reviewing",
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({ message: "Mesaj gönderildi." });
  } catch {
    return NextResponse.json(
      { message: "Mesaj gönderilemedi." },
      { status: 500 }
    );
  }
});
