import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const taskId = String(body.taskId ?? "").trim();

    if (!taskId) {
      return NextResponse.json({ message: "taskId zorunludur." }, { status: 400 });
    }

    const taskRef = adminDb.collection("admin_tasks").doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return NextResponse.json({ message: "Görev bulunamadı." }, { status: 404 });
    }

    await taskRef.delete();

    return NextResponse.json({ message: "Görev silindi." });
  } catch (error) {
    console.error("POST /api/admin/tasks/delete failed:", error);
    return NextResponse.json({ message: "Görev silinemedi." }, { status: 500 });
  }
});
