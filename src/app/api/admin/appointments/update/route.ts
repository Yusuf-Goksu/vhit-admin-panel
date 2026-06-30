import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

const ALLOWED_STATUSES = new Set(["scheduled", "completed", "cancelled"]);

function parseAppointmentAt(value: unknown) {
  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Timestamp.fromDate(date);
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const appointmentId = String(body.appointmentId ?? "").trim();
    const clinicId = String(body.clinicId ?? "").trim();
    const patientId = String(body.patientId ?? "").trim();
    const doctorId = String(body.doctorId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const note = String(body.note ?? "").trim();
    const status = String(body.status ?? "scheduled").trim();
    const linkedTestId = String(body.linkedTestId ?? "").trim();
    const appointmentAt = parseAppointmentAt(body.appointmentAt);

    if (
      !appointmentId ||
      !clinicId ||
      !patientId ||
      !doctorId ||
      !title ||
      !appointmentAt
    ) {
      return NextResponse.json(
        { message: "Randevu bilgileri eksik veya geçersiz." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { message: "Geçersiz randevu durumu." },
        { status: 400 }
      );
    }

    const appointmentRef = adminDb.collection("appointments").doc(appointmentId);
    const appointmentSnap = await appointmentRef.get();

    if (!appointmentSnap.exists) {
      return NextResponse.json(
        { message: "Randevu bulunamadı." },
        { status: 404 }
      );
    }

    await appointmentRef.update({
      clinicId,
      patientId,
      doctorId,
      title,
      note,
      appointmentAt,
      status,
      linkedTestId: linkedTestId || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: "Randevu güncellendi." });
  } catch {
    return NextResponse.json(
      { message: "Randevu güncellenemedi." },
      { status: 500 }
    );
  }
});
