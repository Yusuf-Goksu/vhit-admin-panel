import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
  throw new Error("FIREBASE_ADMIN_PROJECT_ID missing");
}

if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
  throw new Error("FIREBASE_ADMIN_CLIENT_EMAIL missing");
}

if (!privateKey) {
  throw new Error("FIREBASE_ADMIN_PRIVATE_KEY missing");
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey,
        }),
      });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);