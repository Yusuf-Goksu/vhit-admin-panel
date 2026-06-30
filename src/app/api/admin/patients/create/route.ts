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

    const fullName = String(body.fullName ?? "").trim();
    const tcKimlikNo = String(body.tcKimlikNo ?? "").trim();
    const clinicId = String(body.clinicId ?? "").trim();
    const gender = String(body.gender ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const birthDate = parseBirthDate(body.birthDate);

    if (!fullName || !tcKimlikNo || !clinicId) {
      return NextResponse.json(
        { message: "Ad soyad, T.C. Kimlik No ve klinik zorunludur." },
        { status: 400 }
      );
    }

    const clinicSnap = await adminDb.collection("clinics").doc(clinicId).get();

    if (!clinicSnap.exists) {
      return NextResponse.json(
        { message: "Seçilen klinik bulunamadı." },
        { status: 404 }
      );
    }

    const docRef = await adminDb.collection("patients").add({
      clinicId,
      tcKimlikNo,
      fullName,
      birthDate,
      gender,
      phone,
      notes,
      isArchived: false,
      createdBy: admin.uid,
      updatedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      id: docRef.id,
      message: "Hasta oluşturuldu.",
    });
  } catch {
    return NextResponse.json(
      { message: "Hasta oluşturulamadı." },
      { status: 500 }
    );
  }
});
