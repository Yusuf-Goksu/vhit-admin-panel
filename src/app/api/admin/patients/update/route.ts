import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

function parseBirthDate(value: unknown) {
  if (!value) return null;

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Timestamp.fromDate(date);
}

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const body = await request.json();

    const patientId = String(body.patientId ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const tcKimlikNo = String(body.tcKimlikNo ?? "").trim();
    const clinicId = String(body.clinicId ?? "").trim();
    const gender = String(body.gender ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const birthDate = parseBirthDate(body.birthDate);

    if (!patientId || !fullName || !tcKimlikNo || !clinicId) {
      return NextResponse.json(
        { message: "patientId, ad soyad, T.C. Kimlik No ve klinik zorunludur." },
        { status: 400 }
      );
    }

    const patientRef = adminDb.collection("patients").doc(patientId);
    const patientSnap = await patientRef.get();

    if (!patientSnap.exists) {
      return NextResponse.json(
        { message: "Hasta bulunamadı." },
        { status: 404 }
      );
    }

    const clinicSnap = await adminDb.collection("clinics").doc(clinicId).get();

    if (!clinicSnap.exists) {
      return NextResponse.json(
        { message: "Seçilen klinik bulunamadı." },
        { status: 404 }
      );
    }

    await patientRef.update({
      clinicId,
      tcKimlikNo,
      fullName,
      birthDate,
      gender,
      phone,
      notes,
      updatedBy: admin.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: "Hasta güncellendi." });
  } catch {
    return NextResponse.json(
      { message: "Hasta güncellenemedi." },
      { status: 500 }
    );
  }
});
