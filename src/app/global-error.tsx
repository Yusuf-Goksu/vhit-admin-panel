"use client";

import { useEffect } from "react";

import Button from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Beklenmeyen bir hata oluştu</h1>
          <p className="mt-3 text-sm text-slate-500">
            Uygulama geçici olarak yanıt veremiyor. Lütfen tekrar deneyin.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-slate-400">Hata kodu: {error.digest}</p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Button type="button" onClick={reset}>
              Tekrar Dene
            </Button>
            <Button type="button" variant="outline" onClick={() => (window.location.href = "/login")}>
              Giriş Sayfası
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
