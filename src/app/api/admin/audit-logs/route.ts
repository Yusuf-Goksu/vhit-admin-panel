import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { parseOptionalString, parsePageSize } from "@/lib/server-list";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const pageSize = parsePageSize(searchParams.get("pageSize"));
    const cursor = parseOptionalString(searchParams.get("cursor"));
    const resourceType = parseOptionalString(searchParams.get("resourceType"));
    const action = parseOptionalString(searchParams.get("action"));
    const search = parseOptionalString(searchParams.get("search"));

    let queryRef = adminDb.collection("admin_audit_logs").orderBy("createdAt", "desc");

    if (resourceType) {
      queryRef = queryRef.where("resourceType", "==", resourceType);
    }

    if (action) {
      queryRef = queryRef.where("action", "==", action);
    }

    queryRef = queryRef.limit(pageSize);

    if (cursor) {
      const cursorDoc = await adminDb.collection("admin_audit_logs").doc(cursor).get();

      if (cursorDoc.exists) {
        let cursorQuery = adminDb.collection("admin_audit_logs").orderBy("createdAt", "desc");

        if (resourceType) {
          cursorQuery = cursorQuery.where("resourceType", "==", resourceType);
        }

        if (action) {
          cursorQuery = cursorQuery.where("action", "==", action);
        }

        queryRef = cursorQuery.startAfter(cursorDoc).limit(pageSize);
      }
    }

    const snapshot = await queryRef.get();

    let items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() ?? null,
    }));

    if (search) {
      const term = search.toLowerCase();
      items = items.filter((log) => {
        const record = log as Record<string, unknown>;
        return (
          String(record.adminName ?? "").toLowerCase().includes(term) ||
          String(record.adminEmail ?? "").toLowerCase().includes(term) ||
          String(record.action ?? "").toLowerCase().includes(term) ||
          String(record.resourceId ?? "").toLowerCase().includes(term)
        );
      });
    }

    return NextResponse.json({
      items,
      nextCursor: snapshot.docs.at(-1)?.id ?? null,
      hasNext: snapshot.docs.length === pageSize,
    });
  } catch {
    return NextResponse.json(
      { message: "Audit log kayıtları yüklenemedi." },
      { status: 500 }
    );
  }
});
