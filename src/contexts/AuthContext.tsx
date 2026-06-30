"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";

import { destroyAdminSession } from "@/lib/admin-api";
import { getUserProfile, AdminUser } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { isAdminRole } from "@/lib/roles";

type AuthContextValue = {
  user: AdminUser | null;
  firebaseUser: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      try {
        if (!nextUser) {
          setUser(null);
          setFirebaseUser(null);
          router.replace("/login");
          return;
        }

        const profile = await getUserProfile(nextUser.uid);

        if (!profile || !profile.isActive || !isAdminRole(profile.role)) {
          await destroyAdminSession().catch(() => undefined);
          await signOut(auth);
          setUser(null);
          setFirebaseUser(null);
          router.replace("/login");
          return;
        }

        setUser(profile);
        setFirebaseUser(nextUser);
      } catch (error) {
        console.error("Auth state error:", error);
        await destroyAdminSession().catch(() => undefined);
        await signOut(auth);
        setUser(null);
        setFirebaseUser(null);
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function logout() {
    try {
      await destroyAdminSession();
    } catch {
      // Session may already be cleared.
    }

    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
