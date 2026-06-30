"use client";

import { ReactNode } from "react";

import DashboardShell from "@/components/layout/DashboardShell";
import AppProviders from "@/components/providers/AppProviders";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <DashboardShell>{children}</DashboardShell>
    </AppProviders>
  );
}
