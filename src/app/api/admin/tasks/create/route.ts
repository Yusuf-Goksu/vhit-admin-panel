import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

const ALLOWED_PRIORITIES = new Set(["low", "normal", "high"]);

function parseAssigneeIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.map((item) => String(item ?? "").trim()).filter(Boolean))];
}

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const priority = String(body.priority ?? "normal");
    const assigneeIds = parseAssigneeIds(body.assigneeIds);

    if (!title) {
      return NextResponse.json({ message: "Görev başlığı zorunludur." }, { status: 400 });
    }

    if (!ALLOWED_PRIORITIES.has(priority)) {
      return NextResponse.json({ message: "Geçersiz öncelik değeri." }, { status: 400 });
    }

    const docRef = await adminDb.collection("admin_tasks").add({
      title,
      description,
      status: "todo",
      priority,
      assigneeIds,
      createdBy: admin.uid,
      createdByName: admin.fullName,
      updatedBy: admin.uid,
      updatedByName: admin.fullName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
    });

    return NextResponse.json({ id: docRef.id, message: "Görev oluşturuldu." });
  } catch (error) {
    console.error("POST /api/admin/tasks/create failed:", error);
    return NextResponse.json({ message: "Görev oluşturulamadı." }, { status: 500 });
  }
});
