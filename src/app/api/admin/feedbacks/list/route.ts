import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import {
  ListFilter,
  parseOptionalString,
  parsePageSize,
  queryAdminList,
  serializeDocData,
} from "@/lib/server-list";

function mapFeedback(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    ...(serializeDocData(data) as Record<string, unknown>),
  };
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const pageSize = parsePageSize(searchParams.get("pageSize"));
    const cursor = parseOptionalString(searchParams.get("cursor"));
    const status = parseOptionalString(searchParams.get("status"));
    const priority = parseOptionalString(searchParams.get("priority"));
    const type = parseOptionalString(searchParams.get("type"));
    const search = parseOptionalString(searchParams.get("search"));

    const filters: ListFilter[] = [];

    if (status) filters.push({ field: "status", op: "==", value: status });
    if (priority) filters.push({ field: "priority", op: "==", value: priority });
    if (type) filters.push({ field: "type", op: "==", value: type });

    const result = await queryAdminList(
      {
        collection: "feedbacks",
        orderBy: "lastMessageAt",
        direction: "desc",
        pageSize,
        cursor,
        filters,
      },
      mapFeedback
    );

    let items = result.items;

    if (search) {
      const term = search.toLowerCase();
      items = items.filter((item) => {
        const record = item as Record<string, unknown>;
        return (
          String(record.ticketCode ?? "").toLowerCase().includes(term) ||
          String(record.subject ?? "").toLowerCase().includes(term) ||
          String(record.userFullName ?? "").toLowerCase().includes(term) ||
          String(record.userEmail ?? "").toLowerCase().includes(term)
        );
      });
    }

    return NextResponse.json({ ...result, items });
  } catch {
    return NextResponse.json(
      { message: "Geri bildirim listesi yüklenemedi." },
      { status: 500 }
    );
  }
});
