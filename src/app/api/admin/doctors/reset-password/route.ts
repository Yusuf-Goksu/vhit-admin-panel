import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminAuth } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const doctorId = String(body.doctorId ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!doctorId || !password) {
      return NextResponse.json(
        { message: "doctorId ve yeni şifre zorunludur." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Şifre en az 6 karakter olmalıdır." },
        { status: 400 }
      );
    }

    await adminAuth.updateUser(doctorId, { password });

    return NextResponse.json({ message: "Şifre güncellendi." });
  } catch {
    return NextResponse.json(
      { message: "Şifre güncellenemedi." },
      { status: 500 }
    );
  }
});
