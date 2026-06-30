import { Suspense } from "react";

import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950">
          <p className="text-slate-400">Yükleniyor...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
