"use client";

import Link from "next/link";
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

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/contexts/ToastContext";
import {
  AuditLogItem,
  fetchAuditLogs,
} from "@/features/audit-logs/services/auditLogService";
import { getAuditActionLabel } from "@/lib/audit-labels";
import { formatDate, formatDateTime } from "@/lib/format";
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

const adminModules = [
  {
    title: "Klinik Yönetimi",
    description: "Klinik kayıtları ve aktiflik durumları.",
    href: "/dashboard/clinics",
    badge: "Klinikler",
  },
  {
    title: "Doktor Yönetimi",
    description: "Doktor hesapları, roller ve erişim.",
    href: "/dashboard/users",
    badge: "Doktorlar",
  },
  {
    title: "Hasta Veri Havuzu",
    description: "Hasta kayıtları ve arşiv yönetimi.",
    href: "/dashboard/patients",
    badge: "Hastalar",
  },
  {
    title: "Test Kayıtları",
    description: "v-HIT test hacmi ve analiz kayıtları.",
    href: "/dashboard/tests",
    badge: "Testler",
  },
  {
    title: "Audit Log",
    description: "Admin işlem geçmişi ve iz kayıtları.",
    href: "/dashboard/audit-logs",
    badge: "Güvenlik",
  },
];

export default function DashboardPage() {
  const { showError } = useToast();

  const [counts, setCounts] = useState<PlatformCounts>(emptyCounts);
  const [recentClinics, setRecentClinics] = useState<
    { id: string; name: string; email: string; phone: string; isActive: boolean; createdAt: unknown }[]
  >([]);
  const [recentUsers, setRecentUsers] = useState<
    { id: string; fullName: string; email: string; role: string; isActive: boolean; createdAt: unknown }[]
  >([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLogItem[]>([]);
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
        auditResponse,
      ] = await Promise.all([
        getCountFromServer(clinicsRef),
        getCountFromServer(query(clinicsRef, where("isActive", "==", true))),
        getCountFromServer(usersRef),
        getCountFromServer(query(usersRef, where("isActive", "==", true))),
        getCountFromServer(query(usersRef, where("role", "==", "doctor"))),
        getCountFromServer(patientsRef),
        getCountFromServer(testsRef),
        getCountFromServer(appointmentsRef),
        getCountFromServer(query(clinicsRef, where("createdAt", ">=", thirtyDaysAgoTimestamp))),
        getCountFromServer(query(usersRef, where("createdAt", ">=", thirtyDaysAgoTimestamp))),
        getCountFromServer(query(patientsRef, where("createdAt", ">=", thirtyDaysAgoTimestamp))),
        getCountFromServer(query(testsRef, where("createdAt", ">=", thirtyDaysAgoTimestamp))),
        getDocs(query(clinicsRef, orderBy("createdAt", "desc"), limit(5))),
        getDocs(query(usersRef, orderBy("createdAt", "desc"), limit(5))),
        fetchAuditLogs({ pageSize: 6 }).catch(() => ({ items: [], nextCursor: null, hasNext: false })),
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
        recentClinicsSnap.docs.map((item) => ({
          id: item.id,
          name: String(item.data().name ?? ""),
          email: String(item.data().email ?? ""),
          phone: String(item.data().phone ?? ""),
          isActive: Boolean(item.data().isActive ?? true),
          createdAt: item.data().createdAt,
        }))
      );

      setRecentUsers(
        recentUsersSnap.docs.map((item) => ({
          id: item.id,
          fullName: String(item.data().fullName ?? ""),
          email: String(item.data().email ?? ""),
          role: String(item.data().role ?? ""),
          isActive: Boolean(item.data().isActive ?? true),
          createdAt: item.data().createdAt,
        }))
      );

      setRecentAuditLogs(auditResponse.items);
    } catch {
      showError("Dashboard verileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeClinicRate = useMemo(() => {
    if (counts.clinics === 0) return 0;
    return Math.round((counts.activeClinics / counts.clinics) * 100);
  }, [counts.activeClinics, counts.clinics]);

  const activeUserRate = useMemo(() => {
    if (counts.users === 0) return 0;
    return Math.round((counts.activeUsers / counts.users) * 100);
  }, [counts.activeUsers, counts.users]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Dashboard"
        description="Platform büyüklüğü, aktiflik, veri hacmi ve son admin işlemleri."
        actions={
          <Button type="button" variant="outline" disabled={isLoading} onClick={loadDashboard}>
            {isLoading ? "Yükleniyor..." : "Yenile"}
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState rows={8} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Toplam Klinik" value={counts.clinics} description={`${counts.activeClinics} aktif`} href="/dashboard/clinics" />
            <MetricCard title="Toplam Kullanıcı" value={counts.users} description={`${counts.doctors} doktor`} href="/dashboard/users" />
            <MetricCard title="Toplam Hasta" value={counts.patients} description="Kayıtlı hasta" href="/dashboard/patients" />
            <MetricCard title="Toplam Test" value={counts.tests} description="v-HIT test kaydı" href="/dashboard/tests" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <HealthCard title="Klinik Aktiflik" value={`${activeClinicRate}%`} progress={activeClinicRate} />
            <HealthCard title="Kullanıcı Aktiflik" value={`${activeUserRate}%`} progress={activeUserRate} />
            <HealthCard title="Randevu Hacmi" value={counts.appointments.toLocaleString("tr-TR")} progress={Math.min(100, counts.appointments)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <GrowthCard title="Yeni Klinik" value={counts.newClinics30d} />
            <GrowthCard title="Yeni Kullanıcı" value={counts.newUsers30d} />
            <GrowthCard title="Yeni Hasta" value={counts.newPatients30d} />
            <GrowthCard title="Yeni Test" value={counts.newTests30d} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <h2 className="text-lg font-bold">Yönetim Modülleri</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {adminModules.map((module) => (
                  <Link
                    key={module.href}
                    href={module.href}
                    className="rounded-2xl border border-slate-100 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                  >
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {module.badge}
                    </span>
                    <h3 className="mt-3 font-bold">{module.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">{module.description}</p>
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Son Admin İşlemleri</h2>
                <Link href="/dashboard/audit-logs" className="text-sm font-semibold text-indigo-600">
                  Tümünü gör
                </Link>
              </div>
              {recentAuditLogs.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Henüz audit log kaydı yok.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {recentAuditLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-100 p-3">
                      <p className="font-medium">{getAuditActionLabel(log.action)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {log.adminName} · {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Son Klinikler</h2>
                <Link href="/dashboard/clinics" className="text-sm font-semibold text-indigo-600">
                  Tümünü gör
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {recentClinics.map((clinic) => (
                  <div key={clinic.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{clinic.name || "İsimsiz Klinik"}</p>
                        <p className="text-xs text-slate-500">{clinic.email || clinic.phone || "-"}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge active={clinic.isActive} />
                        <p className="mt-2 text-xs text-slate-400">{formatDate(clinic.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Son Kullanıcılar</h2>
                <Link href="/dashboard/users" className="text-sm font-semibold text-indigo-600">
                  Tümünü gör
                </Link>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Kullanıcı</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{user.fullName || "İsimsiz"}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge active={user.isActive} />
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
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
    <Link href={href}>
      <Card className="transition hover:shadow-md">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-bold">{value.toLocaleString("tr-TR")}</p>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </Card>
    </Link>
  );
}

function HealthCard({
  title,
  value,
  progress,
}: {
  title: string;
  value: string;
  progress: number;
}) {
  const bounded = Math.max(0, Math.min(100, progress));

  return (
    <Card>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${bounded}%` }} />
      </div>
    </Card>
  );
}

function GrowthCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border border-indigo-100 bg-indigo-50/50">
      <p className="text-sm font-medium text-indigo-700">Son 30 Gün</p>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString("tr-TR")}</p>
      <p className="mt-1 text-sm text-slate-600">{title}</p>
    </Card>
  );
}
