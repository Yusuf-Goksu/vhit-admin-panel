"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { auth } from "@/lib/firebase";
import { getUserProfile, AdminUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/users", label: "Doktorlar" },
  { href: "/dashboard/patients", label: "Hastalar" },
  { href: "/dashboard/tests", label: "Testler" },
  { href: "/dashboard/appointments", label: "Randevular" },
  { href: "/dashboard/clinics", label: "Klinikler" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          router.replace("/login");
          return;
        }

        const profile = await getUserProfile(firebaseUser.uid);

        if (!profile || !profile.isActive || !isAdminRole(profile.role)) {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error("Kullanıcı yetkileri kontrol edilirken hata oluştu:", error);
        await signOut(auth);
        router.replace("/login");
      } finally {
        setIsChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Kontrol ediliyor...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-950 p-6 text-white">
        <h1 className="text-xl font-bold">v-HIT Admin</h1>

        <nav className="mt-8 space-y-2 text-sm">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-xl px-3 py-2 transition-colors ${
                  isActive
                    ? "bg-white/10 font-semibold text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <p className="truncate text-xs text-slate-400">{user?.email}</p>

          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}