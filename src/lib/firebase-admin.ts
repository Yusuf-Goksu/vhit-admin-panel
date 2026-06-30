import type { App } from "firebase-admin/app";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import { getAuth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";

let app: App | undefined;
let adminAuthInstance: Auth | undefined;
let adminDbInstance: Firestore | undefined;

function getAdminApp(): App {
  if (app) return app;

  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }

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

  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });

  return app;
}

function getAdminAuthInstance(): Auth {
  if (!adminAuthInstance) {
    adminAuthInstance = getAuth(getAdminApp());
  }
  return adminAuthInstance;
}

function getAdminDbInstance(): Firestore {
  if (!adminDbInstance) {
    adminDbInstance = getFirestore(getAdminApp());
  }
  return adminDbInstance;
}

function createLazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      const instance = getInstance();
      const value = Reflect.get(instance, prop, receiver);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const adminAuth = createLazyProxy(getAdminAuthInstance);
export const adminDb = createLazyProxy(getAdminDbInstance);
