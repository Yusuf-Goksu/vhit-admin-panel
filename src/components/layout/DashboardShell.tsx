"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/users", label: "Doktorlar" },
  { href: "/dashboard/patients", label: "Hastalar" },
  { href: "/dashboard/tests", label: "Testler" },
  { href: "/dashboard/appointments", label: "Randevular" },
  { href: "/dashboard/clinics", label: "Klinikler" },
  { href: "/dashboard/feedbacks", label: "Geri Bildirimler" },
  { href: "/dashboard/audit-logs", label: "Audit Log" },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <LoadingState label="Oturum doğrulanıyor..." />
      </main>
    );
  }

  const sidebar = (
    <>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
          v-HIT
        </p>
        <h1 className="mt-2 text-xl font-bold">Admin Panel</h1>
      </div>

      <nav className="space-y-1 text-sm">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
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

      <div className="mt-auto border-t border-white/10 pt-6">
        <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full border-white/20 bg-white text-slate-900 hover:bg-slate-100"
          onClick={logout}
        >
          Çıkış Yap
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div>
          <p className="text-sm font-bold text-slate-900">v-HIT Admin</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setMobileOpen(true)}>
          Menü
        </Button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-slate-950 p-6 text-white">
            {sidebar}
          </aside>
        </div>
      )}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col bg-slate-950 p-6 text-white lg:flex">
        {sidebar}
      </aside>

      <main className="min-h-screen p-4 lg:ml-64 lg:p-8">{children}</main>
    </div>
  );
}
