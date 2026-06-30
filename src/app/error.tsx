"use client";

import { useEffect } from "react";

import Button from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Sayfa yüklenemedi</h1>
        <p className="mt-3 text-sm text-slate-500">
          İstek işlenirken bir sorun oluştu. Sayfayı yenilemeyi deneyin.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-400">Hata kodu: {error.digest}</p>
        )}
        <div className="mt-6">
          <Button type="button" onClick={reset}>
            Tekrar Dene
          </Button>
        </div>
      </div>
    </div>
  );
}
