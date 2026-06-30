import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";
import { serializeDocData } from "@/lib/server-list";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const clinicId = request.nextUrl.searchParams.get("clinicId")?.trim();

    const [clinicsSnap, doctorsSnap] = await Promise.all([
      adminDb.collection("clinics").orderBy("name").get(),
      clinicId
        ? adminDb
            .collection("users")
            .where("role", "==", "doctor")
            .where("clinicId", "==", clinicId)
            .get()
        : adminDb.collection("users").where("role", "==", "doctor").get(),
    ]);

    const doctors = doctorsSnap.docs
      .map((doc) => {
        const data = serializeDocData(doc.data()) as Record<string, unknown>;
        return {
          id: doc.id,
          fullName: String(data.fullName ?? ""),
          email: String(data.email ?? ""),
          clinicId: String(data.clinicId ?? ""),
          isActive: Boolean(data.isActive ?? true),
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));

    return NextResponse.json({
      clinics: clinicsSnap.docs.map((doc) => ({
        id: doc.id,
        name: String(doc.data().name ?? doc.id),
      })),
      doctors,
    });
  } catch {
    return NextResponse.json({ message: "Lookup verileri yüklenemedi." }, { status: 500 });
  }
});
