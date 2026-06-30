import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import {
  ListFilter,
  parseOptionalString,
  parsePageSize,
  queryAdminList,
  serializeDocData,
} from "@/lib/server-list";
import { AppointmentStatus } from "@/types/domain";

function mapAppointment(id: string, data: FirebaseFirestore.DocumentData) {
  const serialized = serializeDocData(data) as Record<string, unknown>;

  return {
    id,
    clinicId: String(serialized.clinicId ?? ""),
    patientId: String(serialized.patientId ?? ""),
    doctorId: String(serialized.doctorId ?? ""),
    title: String(serialized.title ?? ""),
    note: String(serialized.note ?? ""),
    appointmentAt: serialized.appointmentAt ?? null,
    status: (serialized.status ?? "scheduled") as AppointmentStatus,
    linkedTestId: String(serialized.linkedTestId ?? ""),
  };
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const pageSize = parsePageSize(searchParams.get("pageSize"));
    const cursor = parseOptionalString(searchParams.get("cursor"));
    const clinicId = parseOptionalString(searchParams.get("clinicId"));
    const doctorId = parseOptionalString(searchParams.get("doctorId"));
    const status = parseOptionalString(searchParams.get("status"));
    const dateFrom = parseOptionalString(searchParams.get("dateFrom"));
    const dateTo = parseOptionalString(searchParams.get("dateTo"));
    const month = parseOptionalString(searchParams.get("month"));

    const filters: ListFilter[] = [];

    if (clinicId) filters.push({ field: "clinicId", op: "==", value: clinicId });
    if (doctorId) filters.push({ field: "doctorId", op: "==", value: doctorId });
    if (status) filters.push({ field: "status", op: "==", value: status });

    if (month) {
      const [year, monthIndex] = month.split("-").map(Number);
      const start = new Date(year, monthIndex - 1, 1);
      const end = new Date(year, monthIndex, 0, 23, 59, 59, 999);
      filters.push({ field: "appointmentAt", op: ">=", value: start });
      filters.push({ field: "appointmentAt", op: "<=", value: end });
    } else {
      if (dateFrom) {
        filters.push({ field: "appointmentAt", op: ">=", value: new Date(dateFrom) });
      }

      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filters.push({ field: "appointmentAt", op: "<=", value: end });
      }
    }

    const result = await queryAdminList(
      {
        collection: "appointments",
        orderBy: "appointmentAt",
        direction: "desc",
        pageSize: month ? 200 : pageSize,
        cursor: month ? null : cursor,
        filters,
      },
      mapAppointment
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Randevu listesi yüklenemedi." }, { status: 500 });
  }
});
