import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  clinicId: string;
  isActive: boolean;
};

export async function getUserProfile(uid: string): Promise<AdminUser | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();

  return {
    id: snap.id,
    fullName: data.fullName ?? "",
    email: data.email ?? "",
    role: data.role ?? "",
    clinicId: data.clinicId ?? "",
    isActive: data.isActive ?? true,
  };
}