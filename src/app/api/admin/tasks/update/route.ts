import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

const ALLOWED_STATUSES = new Set(["todo", "in_progress", "done"]);
const ALLOWED_PRIORITIES = new Set(["low", "normal", "high"]);

function parseAssigneeIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.map((item) => String(item ?? "").trim()).filter(Boolean))];
}

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const body = await request.json();
    const taskId = String(body.taskId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const status = String(body.status ?? "todo");
    const priority = String(body.priority ?? "normal");
    const assigneeIds = parseAssigneeIds(body.assigneeIds);

    if (!taskId || !title) {
      return NextResponse.json({ message: "taskId ve başlık zorunludur." }, { status: 400 });
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ message: "Geçersiz görev durumu." }, { status: 400 });
    }

    if (!ALLOWED_PRIORITIES.has(priority)) {
      return NextResponse.json({ message: "Geçersiz öncelik değeri." }, { status: 400 });
    }

    const taskRef = adminDb.collection("admin_tasks").doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return NextResponse.json({ message: "Görev bulunamadı." }, { status: 404 });
    }

    await taskRef.update({
      title,
      description,
      status,
      priority,
      assigneeIds,
      updatedBy: admin.uid,
      updatedByName: admin.fullName,
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: status === "done" ? FieldValue.serverTimestamp() : null,
    });

    return NextResponse.json({ message: "Görev güncellendi." });
  } catch (error) {
    console.error("POST /api/admin/tasks/update failed:", error);
    return NextResponse.json({ message: "Görev güncellenemedi." }, { status: 500 });
  }
});
