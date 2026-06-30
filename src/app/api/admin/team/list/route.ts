import { NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const GET = withAdminAuth(async (_request, admin) => {
  try {
    const snapshot = await adminDb.collection("users").where("role", "==", "super_admin").get();

    const items = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          fullName: String(data.fullName ?? ""),
          email: String(data.email ?? ""),
          isActive: data.isActive ?? true,
          isCurrentUser: doc.id === admin.uid,
        };
      })
      .filter((item) => item.isActive);

    return NextResponse.json({
      items: items.map(({ isActive: _isActive, ...item }) => item),
    });
  } catch (error) {
    console.error("GET /api/admin/team/list failed:", error);
    return NextResponse.json({ message: "Ekip listesi yüklenemedi." }, { status: 500 });
  }
});
