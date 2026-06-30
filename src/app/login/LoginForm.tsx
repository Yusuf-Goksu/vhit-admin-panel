"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";

import { createAdminSession } from "@/lib/admin-api";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setError("");

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const profile = await getUserProfile(credential.user.uid);

      if (!profile || !profile.isActive || !isAdminRole(profile.role)) {
        await signOut(auth);
        setError("Bu kullanıcı admin paneline erişemez.");
        return;
      }

      const idToken = await credential.user.getIdToken(true);
      await createAdminSession(idToken);
      await credential.user.getIdToken(true);

      const nextPath = searchParams.get("next");
      router.replace(
        nextPath && nextPath.startsWith("/dashboard") ? nextPath : "/dashboard"
      );
    } catch {
      await signOut(auth).catch(() => undefined);
      setError("Giriş başarısız. E-posta veya şifreyi kontrol edin.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
      >
        <h1 className="text-2xl font-bold text-slate-900">v-HIT Admin</h1>
        <p className="mt-2 text-sm text-slate-500">
          Yönetim paneline giriş yapın.
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              E-posta
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Şifre</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-60"
            type="submit"
          >
            {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </div>
      </form>
    </main>
  );
}
