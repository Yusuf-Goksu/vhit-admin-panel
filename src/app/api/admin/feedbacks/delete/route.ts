import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

async function deleteCollection(path: FirebaseFirestore.CollectionReference) {
  const snapshot = await path.limit(200).get();

  if (snapshot.empty) return;

  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  if (snapshot.size >= 200) {
    await deleteCollection(path);
  }
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const feedbackId = String(body.feedbackId ?? "").trim();

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

    await deleteCollection(feedbackRef.collection("messages"));
    await feedbackRef.delete();

    return NextResponse.json({ message: "Geri bildirim kalıcı olarak silindi." });
  } catch {
    return NextResponse.json(
      { message: "Geri bildirim silinemedi." },
      { status: 500 }
    );
  }
});
