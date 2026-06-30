import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";
import {
  ListFilter,
  parseOptionalString,
  parsePageSize,
  queryAdminList,
  serializeDocData,
} from "@/lib/server-list";

function mapTest(id: string, data: FirebaseFirestore.DocumentData) {
  const serialized = serializeDocData(data) as Record<string, unknown>;

  return {
    id,
    patientId: String(serialized.patientId ?? ""),
    doctorId: String(serialized.doctorId ?? ""),
    clinicId: String(serialized.clinicId ?? ""),
    sourceType: String(serialized.sourceType ?? ""),
    note: String(serialized.note ?? ""),
    graphs: serialized.graphs ?? [],
    metrics: serialized.metrics ?? {},
    flags: serialized.flags ?? {},
    createdAt: serialized.createdAt ?? null,
  };
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const pageSize = parsePageSize(searchParams.get("pageSize"));
    const cursor = parseOptionalString(searchParams.get("cursor"));
    const clinicId = parseOptionalString(searchParams.get("clinicId"));
    const doctorId = parseOptionalString(searchParams.get("doctorId"));
    const sourceType = parseOptionalString(searchParams.get("sourceType"));
    const dateFrom = parseOptionalString(searchParams.get("dateFrom"));
    const dateTo = parseOptionalString(searchParams.get("dateTo"));

    const filters: ListFilter[] = [];

    if (clinicId) filters.push({ field: "clinicId", op: "==", value: clinicId });
    if (doctorId) filters.push({ field: "doctorId", op: "==", value: doctorId });
    if (sourceType) filters.push({ field: "sourceType", op: "==", value: sourceType });

    if (dateFrom) {
      filters.push({ field: "createdAt", op: ">=", value: new Date(dateFrom) });
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      filters.push({ field: "createdAt", op: "<=", value: end });
    }

    const result = await queryAdminList(
      {
        collection: "tests",
        orderBy: "createdAt",
        direction: "desc",
        pageSize,
        cursor,
        filters,
      },
      mapTest
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Test listesi yüklenemedi." }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = body.ids ?? [];

    if (!ids.length) {
      return NextResponse.json({ message: "Export için kayıt seçilmedi." }, { status: 400 });
    }

    const snapshots = await Promise.all(
      ids.slice(0, 100).map((id) => adminDb.collection("tests").doc(id).get())
    );

    const items = snapshots
      .filter((doc) => doc.exists)
      .map((doc) => mapTest(doc.id, doc.data()!));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ message: "Test export verisi alınamadı." }, { status: 500 });
  }
});
