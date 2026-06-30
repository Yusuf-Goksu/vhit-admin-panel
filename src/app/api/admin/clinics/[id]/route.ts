import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";
import { serializeDocData } from "@/lib/server-list";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const clinicId = request.nextUrl.pathname.split("/").pop()?.trim();

    if (!clinicId) {
      return NextResponse.json({ message: "Klinik ID gerekli." }, { status: 400 });
    }

    const clinicDoc = await adminDb.collection("clinics").doc(clinicId!).get();

    if (!clinicDoc.exists) {
      return NextResponse.json({ message: "Klinik bulunamadı." }, { status: 404 });
    }

    const data = serializeDocData(clinicDoc.data()!) as Record<string, unknown>;

    const [doctorsSnap, patientsCount, testsCount, appointmentsCount] = await Promise.all([
      adminDb.collection("users").where("role", "==", "doctor").where("clinicId", "==", clinicId).get(),
      adminDb.collection("patients").where("clinicId", "==", clinicId).count().get(),
      adminDb.collection("tests").where("clinicId", "==", clinicId).count().get(),
      adminDb.collection("appointments").where("clinicId", "==", clinicId).count().get(),
    ]);

    const doctors = doctorsSnap.docs
      .map((doc) => {
        const doctor = serializeDocData(doc.data()) as Record<string, unknown>;
        return {
          id: doc.id,
          fullName: String(doctor.fullName ?? ""),
          email: String(doctor.email ?? ""),
          isActive: Boolean(doctor.isActive ?? true),
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));

    return NextResponse.json({
      clinic: {
        id: clinicDoc.id,
        name: String(data.name ?? ""),
        email: String(data.email ?? ""),
        phone: String(data.phone ?? ""),
        address: String(data.address ?? ""),
        isActive: Boolean(data.isActive ?? true),
        createdAt: data.createdAt ?? null,
      },
      stats: {
        doctors: doctors.length,
        activeDoctors: doctors.filter((doctor) => doctor.isActive).length,
        patients: patientsCount.data().count,
        tests: testsCount.data().count,
        appointments: appointmentsCount.data().count,
      },
      doctors,
    });
  } catch {
    return NextResponse.json({ message: "Klinik detayı yüklenemedi." }, { status: 500 });
  }
});
