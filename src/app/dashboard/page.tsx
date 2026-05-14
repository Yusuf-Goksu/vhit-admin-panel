"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";

import { db } from "@/lib/firebase";

type PlatformCounts = {
  clinics: number;
  activeClinics: number;
  users: number;
  activeUsers: number;
  doctors: number;
  patients: number;
  tests: number;
  appointments: number;
  newClinics30d: number;
  newUsers30d: number;
  newPatients30d: number;
  newTests30d: number;
};

type Clinic = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: any;
};

type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  clinicId: string;
  isActive: boolean;
  createdAt: any;
};

type AdminModule = {
  title: string;
  description: string;
  href: string;
  badge: string;
};

const emptyCounts: PlatformCounts = {
  clinics: 0,
  activeClinics: 0,
  users: 0,
  activeUsers: 0,
  doctors: 0,
  patients: 0,
  tests: 0,
  appointments: 0,
  newClinics30d: 0,
  newUsers30d: 0,
  newPatients30d: 0,
  newTests30d: 0,
};

const adminModules: AdminModule[] = [
  {
    title: "Klinik Yönetimi",
    description: "Hastane / klinik kayıtlarını, aktiflik durumlarını ve iletişim bilgilerini yönetin.",
    href: "/dashboard/clinics",
    badge: "Klinikler",
  },
  {
    title: "Kullanıcı Yönetimi",
    description: "Doktor ve admin hesaplarını, rollerini ve hesap durumlarını kontrol edin.",
    href: "/dashboard/users",
    badge: "Kullanıcılar",
  },
  {
    title: "Hasta Veri Havuzu",
    description: "Klinikler genelindeki hasta kayıtlarını ve veri dağılımını izleyin.",
    href: "/dashboard/patients",
    badge: "Hastalar",
  },
  {
    title: "Test Kayıtları",
    description: "v-HIT test hacmini, kayıt yoğunluğunu ve analiz kayıtlarını takip edin.",
    href: "/dashboard/tests",
    badge: "Testler",
  },
];

export default function DashboardPage() {
  const [counts, setCounts] = useState<PlatformCounts>(emptyCounts);
  const [recentClinics, setRecentClinics] = useState<Clinic[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);

      const usersRef = collection(db, "users");
      const clinicsRef = collection(db, "clinics");
      const patientsRef = collection(db, "patients");
      const testsRef = collection(db, "tests");
      const appointmentsRef = collection(db, "appointments");

      const doctorsQuery = query(usersRef, where("role", "==", "doctor"));
      const activeUsersQuery = query(usersRef, where("isActive", "==", true));
      const activeClinicsQuery = query(clinicsRef, where("isActive", "==", true));

      const [
        clinicsSnap,
        activeClinicsSnap,
        usersSnap,
        activeUsersSnap,
        doctorsSnap,
        patientsSnap,
        testsSnap,
        appointmentsSnap,
        newClinicsSnap,
        newUsersSnap,
        newPatientsSnap,
        newTestsSnap,
        recentClinicsSnap,
        recentUsersSnap,
      ] = await Promise.all([
        getCountFromServer(clinicsRef),
        getCountFromServer(activeClinicsQuery),
        getCountFromServer(usersRef),
        getCountFromServer(activeUsersQuery),
        getCountFromServer(doctorsQuery),
        getCountFromServer(patientsRef),
        getCountFromServer(testsRef),
        getCountFromServer(appointmentsRef),
        getCountFromServer(
          query(clinicsRef, where("createdAt", ">=", thirtyDaysAgoTimestamp))
        ),
        getCountFromServer(
          query(usersRef, where("createdAt", ">=", thirtyDaysAgoTimestamp))
        ),
        getCountFromServer(
          query(patientsRef, where("createdAt", ">=", thirtyDaysAgoTimestamp))
        ),
        getCountFromServer(
          query(testsRef, where("createdAt", ">=", thirtyDaysAgoTimestamp))
        ),
        getDocs(query(clinicsRef, orderBy("createdAt", "desc"), limit(5))),
        getDocs(query(usersRef, orderBy("createdAt", "desc"), limit(5))),
      ]);

      setCounts({
        clinics: clinicsSnap.data().count,
        activeClinics: activeClinicsSnap.data().count,
        users: usersSnap.data().count,
        activeUsers: activeUsersSnap.data().count,
        doctors: doctorsSnap.data().count,
        patients: patientsSnap.data().count,
        tests: testsSnap.data().count,
        appointments: appointmentsSnap.data().count,
        newClinics30d: newClinicsSnap.data().count,
        newUsers30d: newUsersSnap.data().count,
        newPatients30d: newPatientsSnap.data().count,
        newTests30d: newTestsSnap.data().count,
      });

      setRecentClinics(
        recentClinicsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            name: data.name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            isActive: data.isActive ?? true,
            createdAt: data.createdAt,
          };
        })
      );

      setRecentUsers(
        recentUsersSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            fullName: data.fullName ?? "",
            email: data.email ?? "",
            role: data.role ?? "",
            clinicId: data.clinicId ?? "",
            isActive: data.isActive ?? true,
            createdAt: data.createdAt,
          };
        })
      );
    } catch (error) {
      console.error("Dashboard load error:", error);
      alert("Dashboard verileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeClinicRate = useMemo(() => {
    if (counts.clinics === 0) return 0;
    return Math.round((counts.activeClinics / counts.clinics) * 100);
  }, [counts.activeClinics, counts.clinics]);

  const activeUserRate = useMemo(() => {
    if (counts.users === 0) return 0;
    return Math.round((counts.activeUsers / counts.users) * 100);
  }, [counts.activeUsers, counts.users]);

  const testsPerClinic = useMemo(() => {
    if (counts.clinics === 0) return 0;
    return Number((counts.tests / counts.clinics).toFixed(1));
  }, [counts.tests, counts.clinics]);

  const patientsPerClinic = useMemo(() => {
    if (counts.clinics === 0) return 0;
    return Number((counts.patients / counts.clinics).toFixed(1));
  }, [counts.patients, counts.clinics]);

  function formatDate(value: any) {
    return value?.toDate?.().toLocaleDateString("tr-TR") ?? "-";
  }

  function roleLabel(role: string) {
    if (role === "admin") return "Admin";
    if (role === "doctor") return "Doktor";
    return role || "Kullanıcı";
  }

  return (
    <div className="text-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            v-HIT Mobil Admin
          </p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Platform Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Çoklu klinik yapısı için genel sistem görünümü. Bu ekran günlük randevu
            operasyonu yerine platform büyüklüğü, aktiflik, veri hacmi ve yönetim
            kısayollarına odaklanır.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          disabled={isLoading}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Yükleniyor..." : "Yenile"}
        </button>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Toplam Klinik"
              value={counts.clinics}
              description={`${counts.activeClinics} aktif klinik`}
              href="/dashboard/clinics"
            />
            <MetricCard
              title="Toplam Kullanıcı"
              value={counts.users}
              description={`${counts.doctors} doktor hesabı`}
              href="/dashboard/users"
            />
            <MetricCard
              title="Toplam Hasta"
              value={counts.patients}
              description={`${patientsPerClinic} hasta / klinik`}
              href="/dashboard/patients"
            />
            <MetricCard
              title="Toplam Test"
              value={counts.tests}
              description={`${testsPerClinic} test / klinik`}
              href="/dashboard/tests"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <HealthCard
              title="Klinik Aktiflik Oranı"
              value={`${activeClinicRate}%`}
              description={`${counts.activeClinics} aktif / ${counts.clinics} toplam klinik`}
              progress={activeClinicRate}
            />
            <HealthCard
              title="Kullanıcı Aktiflik Oranı"
              value={`${activeUserRate}%`}
              description={`${counts.activeUsers} aktif / ${counts.users} toplam kullanıcı`}
              progress={activeUserRate}
            />
            <HealthCard
              title="Veri Hacmi"
              value={counts.appointments.toLocaleString("tr-TR")}
              description="Sistemdeki toplam randevu kaydı"
              progress={Math.min(100, counts.appointments)}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <GrowthCard title="Yeni Klinik" value={counts.newClinics30d} />
            <GrowthCard title="Yeni Kullanıcı" value={counts.newUsers30d} />
            <GrowthCard title="Yeni Hasta" value={counts.newPatients30d} />
            <GrowthCard title="Yeni Test" value={counts.newTests30d} />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Yönetim Modülleri</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Admin panelinde en sık kullanılacak ana modüller.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {adminModules.map((module) => (
                  <Link
                    key={module.href}
                    href={module.href}
                    className="rounded-2xl border border-slate-100 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                  >
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {module.badge}
                    </span>
                    <h3 className="mt-3 font-bold text-slate-900">{module.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-slate-500">
                      {module.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Son Eklenen Klinikler</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Platforma en son dahil edilen kurumlar.
                  </p>
                </div>

                <Link
                  href="/dashboard/clinics"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Tümünü gör
                </Link>
              </div>

              {recentClinics.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">Henüz klinik kaydı yok.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {recentClinics.map((clinic) => (
                    <div key={clinic.id} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {clinic.name.trim() === "" ? "İsimsiz Klinik" : clinic.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[clinic.email, clinic.phone].filter(Boolean).join(" · ") || "İletişim bilgisi yok"}
                          </p>
                        </div>

                        <div className="text-right">
                          <StatusPill isActive={clinic.isActive} />
                          <p className="mt-2 text-xs text-slate-400">{formatDate(clinic.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Son Eklenen Kullanıcılar</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Yeni açılan admin/doktor hesapları ve hesap durumları.
                </p>
              </div>

              <Link
                href="/dashboard/users"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Tümünü gör
              </Link>
            </div>

            {recentUsers.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">Henüz kullanıcı kaydı yok.</p>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Kullanıcı</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3">Oluşturulma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                              {user.fullName.trim() === "" ? "İsimsiz Kullanıcı" : user.fullName}                          </p>
                          <p className="mt-1 text-xs text-slate-500">{user.email || "E-posta yok"}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{roleLabel(user.role)}</td>
                        <td className="px-4 py-3">
                          <StatusPill isActive={user.isActive} />
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  href,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value.toLocaleString("tr-TR")}
      </p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </Link>
  );
}

function HealthCard({
  title,
  value,
  description,
  progress,
}: {
  title: string;
  value: string;
  description: string;
  progress: number;
}) {
  const boundedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-indigo-600"
          style={{ width: `${boundedProgress}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function GrowthCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
      <p className="text-sm font-medium text-indigo-700">Son 30 Gün</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value.toLocaleString("tr-TR")}
      </p>
      <p className="mt-1 text-sm text-slate-600">{title}</p>
    </div>
  );
}

function StatusPill({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {isActive ? "Aktif" : "Pasif"}
    </span>
  );
}
