import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";
import { queryByFieldSorted, serializeDocData } from "@/lib/server-list";

function formatBirthDate(value: unknown) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value ?? null;
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const patientId = request.nextUrl.pathname.split("/").pop()?.trim();

    if (!patientId) {
      return NextResponse.json({ message: "Hasta ID gerekli." }, { status: 400 });
    }

    const patientDoc = await adminDb.collection("patients").doc(patientId).get();

    if (!patientDoc.exists) {
      return NextResponse.json({ message: "Hasta bulunamadı." }, { status: 404 });
    }

    const data = serializeDocData(patientDoc.data()!) as Record<string, unknown>;
    const clinicId = String(data.clinicId ?? "");

    const [clinicDoc, tests, appointments] = await Promise.all([
      clinicId ? adminDb.collection("clinics").doc(clinicId).get() : Promise.resolve(null),
      queryByFieldSorted(
        "tests",
        "patientId",
        patientId,
        {
          orderBy: "createdAt",
          direction: "desc",
          limit: 50,
          mapItem: (id, testData) => {
            const serialized = serializeDocData(testData) as Record<string, unknown>;
            return {
              id,
              sourceType: String(serialized.sourceType ?? ""),
              note: String(serialized.note ?? ""),
              graphs: serialized.graphs ?? [],
              metrics: serialized.metrics ?? {},
              flags: serialized.flags ?? {},
              createdAt: serialized.createdAt ?? null,
              doctorId: String(serialized.doctorId ?? ""),
              clinicId: String(serialized.clinicId ?? ""),
            };
          },
        }
      ),
      queryByFieldSorted(
        "appointments",
        "patientId",
        patientId,
        {
          orderBy: "appointmentAt",
          direction: "desc",
          limit: 20,
          mapItem: (id, appointmentData) => {
            const serialized = serializeDocData(appointmentData) as Record<string, unknown>;
            return {
              id,
              title: String(serialized.title ?? ""),
              status: String(serialized.status ?? "scheduled"),
              appointmentAt: serialized.appointmentAt ?? null,
              doctorId: String(serialized.doctorId ?? ""),
            };
          },
        }
      ),
    ]);

    return NextResponse.json({
      patient: {
        id: patientDoc.id,
        fullName: String(data.fullName ?? ""),
        tcKimlikNo: String(data.tcKimlikNo ?? ""),
        clinicId,
        clinicName: clinicDoc?.exists ? String(clinicDoc.data()?.name ?? clinicId) : clinicId,
        phone: String(data.phone ?? ""),
        gender: String(data.gender ?? ""),
        notes: String(data.notes ?? ""),
        birthDate: formatBirthDate(data.birthDate),
        isArchived: Boolean(data.isArchived ?? false),
        createdAt: data.createdAt ?? null,
      },
      stats: {
        tests: tests.length,
        appointments: appointments.length,
      },
      tests,
      appointments,
    });
  } catch (error) {
    console.error(`GET /api/admin/patients/${request.nextUrl.pathname.split("/").pop()} failed:`, error);

    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Hasta detayı yüklenemedi.";

    return NextResponse.json({ message }, { status: 500 });
  }
});
