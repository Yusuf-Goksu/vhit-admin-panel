import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";
import {
  ListFilter,
  parseOptionalBoolean,
  parseOptionalString,
  parsePageSize,
  queryAdminList,
  serializeDocData,
} from "@/lib/server-list";

function mapPatient(id: string, data: FirebaseFirestore.DocumentData) {
  const serialized = serializeDocData(data) as Record<string, unknown>;
  const birthDate = serialized.birthDate;

  return {
    id,
    clinicId: String(serialized.clinicId ?? ""),
    tcKimlikNo: String(serialized.tcKimlikNo ?? ""),
    fullName: String(serialized.fullName ?? ""),
    birthDate:
      typeof birthDate === "string" ? birthDate.slice(0, 10) : "",
    gender: String(serialized.gender ?? ""),
    phone: String(serialized.phone ?? ""),
    notes: String(serialized.notes ?? ""),
    isArchived: Boolean(serialized.isArchived ?? false),
    createdAt: serialized.createdAt ?? null,
  };
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const pageSize = parsePageSize(searchParams.get("pageSize"));
    const cursor = parseOptionalString(searchParams.get("cursor"));
    const clinicId = parseOptionalString(searchParams.get("clinicId"));
    const archivedParam = searchParams.get("archived");
    const archived = parseOptionalBoolean(archivedParam);
    const search = parseOptionalString(searchParams.get("search"));

    const filters: ListFilter[] = [];

    if (search) {
      filters.push({ field: "fullName", op: ">=", value: search });
      filters.push({ field: "fullName", op: "<=", value: `${search}\uf8ff` });
    } else if (clinicId) {
      filters.push({ field: "clinicId", op: "==", value: clinicId });
    }

    const result = await queryAdminList(
      {
        collection: "patients",
        orderBy: search ? "fullName" : "createdAt",
        direction: search ? "asc" : "desc",
        pageSize,
        cursor,
        filters,
      },
      mapPatient
    );

    let items = result.items;

    if (!search) {
      if (archivedParam === "all") {
        // tüm kayıtlar
      } else if (archived !== undefined) {
        items = items.filter((patient) => patient.isArchived === archived);
      } else {
        items = items.filter((patient) => !patient.isArchived);
      }
    } else {
      if (clinicId) {
        items = items.filter((patient) => patient.clinicId === clinicId);
      }

      if (archived !== undefined) {
        items = items.filter((patient) => patient.isArchived === archived);
      } else if (!showArchivedParam(searchParams.get("archived"))) {
        items = items.filter((patient) => !patient.isArchived);
      }
    }

    return NextResponse.json({ ...result, items });
  } catch (error) {
    console.error("GET /api/admin/patients/list failed:", error);

    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Hasta listesi yüklenemedi.";

    return NextResponse.json({ message }, { status: 500 });
  }
});

function showArchivedParam(value: string | null) {
  return value === "true" || value === "all";
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = body.ids ?? [];

    if (!ids.length) {
      return NextResponse.json({ message: "Export için kayıt seçilmedi." }, { status: 400 });
    }

    const snapshots = await Promise.all(
      ids.slice(0, 500).map((id) => adminDb.collection("patients").doc(id).get())
    );

    const items = snapshots
      .filter((doc) => doc.exists)
      .map((doc) => mapPatient(doc.id, doc.data()!));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ message: "Hasta export verisi alınamadı." }, { status: 500 });
  }
});
