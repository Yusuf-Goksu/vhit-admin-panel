import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/api-route-auth";
import { adminDb } from "@/lib/firebase-admin";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const testId = String(body.testId ?? "").trim();

    if (!testId) {
      return NextResponse.json(
        { message: "testId zorunludur." },
        { status: 400 }
      );
    }

    const testRef = adminDb.collection("tests").doc(testId);
    const testSnap = await testRef.get();

    if (!testSnap.exists) {
      return NextResponse.json(
        { message: "Test kaydı bulunamadı." },
        { status: 404 }
      );
    }

    await testRef.delete();

    return NextResponse.json({ message: "Test kaydı silindi." });
  } catch {
    return NextResponse.json(
      { message: "Test kaydı silinemedi." },
      { status: 500 }
    );
  }
});
