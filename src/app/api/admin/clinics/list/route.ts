import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import {
  parseOptionalString,
  parsePageSize,
  queryAdminList,
  serializeDocData,
} from "@/lib/server-list";

function mapClinic(id: string, data: FirebaseFirestore.DocumentData) {
  const serialized = serializeDocData(data) as Record<string, unknown>;

  return {
    id,
    name: String(serialized.name ?? ""),
    email: String(serialized.email ?? ""),
    phone: String(serialized.phone ?? ""),
    address: String(serialized.address ?? ""),
    isActive: Boolean(serialized.isActive ?? true),
    createdAt: serialized.createdAt ?? null,
  };
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const pageSize = parsePageSize(searchParams.get("pageSize"));
    const cursor = parseOptionalString(searchParams.get("cursor"));
    const search = parseOptionalString(searchParams.get("search"));

    const result = await queryAdminList(
      {
        collection: "clinics",
        orderBy: search ? "name" : "name",
        direction: "asc",
        pageSize,
        cursor,
        filters: search
          ? [
              { field: "name", op: ">=", value: search },
              { field: "name", op: "<=", value: `${search}\uf8ff` },
            ]
          : [],
      },
      mapClinic
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Klinik listesi yüklenemedi." }, { status: 500 });
  }
});
