"use client";

import { useEffect } from "react";

import Button from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Dashboard modülü yüklenemedi</h2>
      <p className="mt-2 text-sm text-slate-500">
        Bu bölümde geçici bir hata oluştu. Tekrar deneyebilir veya ana sayfaya dönebilirsiniz.
      </p>
      <div className="mt-6 flex gap-3">
        <Button type="button" onClick={reset}>
          Tekrar Dene
        </Button>
        <Button type="button" variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Ana Sayfa
        </Button>
      </div>
    </div>
  );
}
