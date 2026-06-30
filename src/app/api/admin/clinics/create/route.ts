import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const address = String(body.address ?? "").trim();
    const isActive = body.isActive !== false;

    if (!name) {
      return NextResponse.json(
        { message: "Klinik adı zorunludur." },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection("clinics").add({
      name,
      email,
      phone,
      address,
      isActive,
      createdBy: admin.uid,
      updatedBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      id: docRef.id,
      message: "Klinik oluşturuldu.",
    });
  } catch {
    return NextResponse.json(
      { message: "Klinik oluşturulamadı." },
      { status: 500 }
    );
  }
});
