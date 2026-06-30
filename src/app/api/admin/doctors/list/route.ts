import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import {
  ListFilter,
  parseOptionalString,
  parsePageSize,
  queryAdminList,
  serializeDocData,
} from "@/lib/server-list";

function mapDoctor(id: string, data: FirebaseFirestore.DocumentData) {
  const serialized = serializeDocData(data) as Record<string, unknown>;

  return {
    id,
    fullName: String(serialized.fullName ?? ""),
    email: String(serialized.email ?? ""),
    role: String(serialized.role ?? "doctor"),
    clinicId: String(serialized.clinicId ?? ""),
    isActive: Boolean(serialized.isActive ?? true),
    profilePhotoUrl:
      (serialized.profilePhotoUrl ??
        serialized.photoUrl ??
        serialized.photoURL ??
        serialized.profileImageUrl ??
        null) as string | null,
    createdAt: serialized.createdAt ?? null,
  };
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const pageSize = parsePageSize(searchParams.get("pageSize"));
    const cursor = parseOptionalString(searchParams.get("cursor"));
    const clinicId = parseOptionalString(searchParams.get("clinicId"));
    const search = parseOptionalString(searchParams.get("search"));

    const filters: ListFilter[] = [{ field: "role", op: "==", value: "doctor" }];

    if (clinicId) {
      filters.push({ field: "clinicId", op: "==", value: clinicId });
    }

    if (search) {
      filters.push({ field: "fullName", op: ">=", value: search });
      filters.push({ field: "fullName", op: "<=", value: `${search}\uf8ff` });
    }

    const result = await queryAdminList(
      {
        collection: "users",
        orderBy: search ? "fullName" : "createdAt",
        direction: search ? "asc" : "desc",
        pageSize,
        cursor,
        filters,
      },
      mapDoctor
    );

    let items = result.items;

    if (search) {
      const term = search.toLowerCase();
      items = items.filter(
        (doctor) =>
          doctor.fullName.toLowerCase().includes(term) ||
          doctor.email.toLowerCase().includes(term)
      );
    }

    return NextResponse.json({ ...result, items });
  } catch {
    return NextResponse.json({ message: "Doktor listesi yüklenemedi." }, { status: 500 });
  }
});
