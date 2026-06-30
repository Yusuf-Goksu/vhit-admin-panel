import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const feedbackId = String(body.feedbackId ?? "").trim();
    const messageId = String(body.messageId ?? "").trim();

    if (!feedbackId || !messageId) {
      return NextResponse.json(
        { message: "feedbackId ve messageId zorunludur." },
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

    const messageRef = feedbackRef.collection("messages").doc(messageId);
    const messageSnap = await messageRef.get();

    if (!messageSnap.exists) {
      return NextResponse.json(
        { message: "Mesaj bulunamadı." },
        { status: 404 }
      );
    }

    await messageRef.delete();

    const remainingMessages = await feedbackRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (remainingMessages.empty) {
      const feedbackData = feedbackSnap.data() ?? {};

      await feedbackRef.update({
        lastMessage: feedbackData.message ?? null,
        lastMessageAt: feedbackData.createdAt ?? null,
        lastMessageSenderRole: "user",
        messageCount: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      const latest = remainingMessages.docs[0].data();
      const allMessages = await feedbackRef.collection("messages").get();

      await feedbackRef.update({
        lastMessage: latest.message ?? null,
        lastMessageAt: latest.createdAt ?? null,
        lastMessageSenderRole: latest.senderRole ?? "user",
        messageCount: allMessages.size,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ message: "Mesaj silindi." });
  } catch {
    return NextResponse.json(
      { message: "Mesaj silinemedi." },
      { status: 500 }
    );
  }
});
