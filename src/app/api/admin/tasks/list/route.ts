import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import {
  parseOptionalString,
  parsePageSize,
  queryAdminList,
  serializeDocData,
} from "@/lib/server-list";

function mapTask(id: string, data: FirebaseFirestore.DocumentData) {
  const serialized = serializeDocData(data) as Record<string, unknown>;

  return {
    id,
    title: String(serialized.title ?? ""),
    description: String(serialized.description ?? ""),
    status: String(serialized.status ?? "todo"),
    priority: String(serialized.priority ?? "normal"),
    assigneeIds: Array.isArray(serialized.assigneeIds)
      ? serialized.assigneeIds.map((item) => String(item))
      : [],
    createdBy: String(serialized.createdBy ?? ""),
    createdByName: String(serialized.createdByName ?? ""),
    updatedByName: String(serialized.updatedByName ?? ""),
    createdAt: serialized.createdAt ?? null,
    updatedAt: serialized.updatedAt ?? null,
    completedAt: serialized.completedAt ?? null,
  };
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const pageSize = parsePageSize(searchParams.get("pageSize"));
    const cursor = parseOptionalString(searchParams.get("cursor"));
    const status = parseOptionalString(searchParams.get("status"));
    const assigneeId = parseOptionalString(searchParams.get("assigneeId"));

    const result = await queryAdminList(
      {
        collection: "admin_tasks",
        orderBy: "createdAt",
        direction: "desc",
        pageSize,
        cursor,
        filters: [],
      },
      mapTask
    );

    let items = result.items;

    if (status) {
      items = items.filter((task) => task.status === status);
    }

    if (assigneeId) {
      items = items.filter((task) => task.assigneeIds.includes(assigneeId));
    }

    return NextResponse.json({ ...result, items });
  } catch (error) {
    console.error("GET /api/admin/tasks/list failed:", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Görev listesi yüklenemedi.";
    return NextResponse.json({ message }, { status: 500 });
  }
});
