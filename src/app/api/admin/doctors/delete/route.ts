import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const doctorId = String(body.doctorId ?? "").trim();

    if (!doctorId) {
      return NextResponse.json(
        { message: "doctorId zorunludur." },
        { status: 400 }
      );
    }

    await adminDb.collection("users").doc(doctorId).delete();

    try {
      await adminAuth.deleteUser(doctorId);
    } catch (error: any) {
      if (error?.code !== "auth/user-not-found") {
        throw error;
      }
    }

    return NextResponse.json({
      message: "Doktor kalıcı olarak silindi.",
    });
  } catch (error) {
    console.error("Delete doctor error:", error);

    return NextResponse.json(
      { message: "Doktor kalıcı olarak silinemedi." },
      { status: 500 }
    );
  }
}