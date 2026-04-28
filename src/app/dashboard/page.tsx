"use client";

import { useEffect, useMemo, useState } from "react";
import {
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

type DashboardCounts = {
  clinics: number;
  doctors: number;
  patients: number;
  tests: number;
  appointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
};

type RecentTest = {
  id: string;
  patientId: string;
  doctorId: string;
  sourceType: string;
  createdAt: any;
};

type Appointment = {
  id: string;
  title: string;
  patientId: string;
  doctorId: string;
  appointmentAt: any;
  status: string;
};

type Patient = {
  id: string;
  fullName: string;
  patientCode: string;
};

type Doctor = {
  id: string;
  fullName: string;
  email: string;
};

export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>({
    clinics: 0,
    doctors: 0,
    patients: 0,
    tests: 0,
    appointments: 0,
    scheduledAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
  });

  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const doctorsQuery = query(
        collection(db, "users"),
        where("role", "==", "doctor")
      );

      const [
        clinicsSnap,
        doctorsSnap,
        patientsSnap,
        testsSnap,
        appointmentsSnap,
        scheduledSnap,
        completedSnap,
        cancelledSnap,
        recentTestsSnap,
        appointmentsListSnap,
        patientsListSnap,
        doctorsListSnap,
      ] = await Promise.all([
        getCountFromServer(collection(db, "clinics")),
        getCountFromServer(doctorsQuery),
        getCountFromServer(collection(db, "patients")),
        getCountFromServer(collection(db, "tests")),
        getCountFromServer(collection(db, "appointments")),
        getCountFromServer(
          query(collection(db, "appointments"), where("status", "==", "scheduled"))
        ),
        getCountFromServer(
          query(collection(db, "appointments"), where("status", "==", "completed"))
        ),
        getCountFromServer(
          query(collection(db, "appointments"), where("status", "==", "cancelled"))
        ),
        getDocs(query(collection(db, "tests"), orderBy("createdAt", "desc"), limit(5))),
        getDocs(
          query(
            collection(db, "appointments"),
            orderBy("appointmentAt", "asc"),
            limit(20)
          )
        ),
        getDocs(collection(db, "patients")),
        getDocs(doctorsQuery),
      ]);

      setCounts({
        clinics: clinicsSnap.data().count,
        doctors: doctorsSnap.data().count,
        patients: patientsSnap.data().count,
        tests: testsSnap.data().count,
        appointments: appointmentsSnap.data().count,
        scheduledAppointments: scheduledSnap.data().count,
        completedAppointments: completedSnap.data().count,
        cancelledAppointments: cancelledSnap.data().count,
      });

      setRecentTests(
        recentTestsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            patientId: data.patientId ?? "",
            doctorId: data.doctorId ?? "",
            sourceType: data.sourceType ?? "",
            createdAt: data.createdAt,
          };
        })
      );

      setTodayAppointments(
        appointmentsListSnap.docs
          .map((item) => {
            const data = item.data();

            return {
              id: item.id,
              title: data.title ?? "",
              patientId: data.patientId ?? "",
              doctorId: data.doctorId ?? "",
              appointmentAt: data.appointmentAt,
              status: data.status ?? "scheduled",
            };
          })
          .filter((appointment) => isToday(appointment.appointmentAt?.toDate?.()))
      );

      setPatients(
        patientsListSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            fullName: data.fullName ?? "",
            patientCode: data.patientCode ?? "",
          };
        })
      );

      setDoctors(
        doctorsListSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            fullName: data.fullName ?? "",
            email: data.email ?? "",
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

  const patientMap = useMemo(() => {
    return Object.fromEntries(patients.map((patient) => [patient.id, patient]));
  }, [patients]);

  const doctorMap = useMemo(() => {
    return Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor]));
  }, [doctors]);

  function formatDate(value: any) {
    return value?.toDate?.().toLocaleString("tr-TR") ?? "-";
  }

  function sourceLabel(sourceType: string) {
    if (sourceType === "live_camera") return "Canlı Kamera";
    if (sourceType === "gallery_video") return "Galeri Video";
    return sourceType || "-";
  }

  return (
    <div className="text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Klinik sisteminin genel durumu ve günlük operasyon özeti.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Yenile
        </button>
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-500">Veriler yükleniyor...</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-5">
            <StatCard title="Klinik" value={counts.clinics} href="/dashboard/clinics" />
            <StatCard title="Doktor" value={counts.doctors} href="/dashboard/users" />
            <StatCard title="Hasta" value={counts.patients} href="/dashboard/patients" />
            <StatCard title="Test" value={counts.tests} href="/dashboard/tests" />
            <StatCard
              title="Randevu"
              value={counts.appointments}
              href="/dashboard/appointments"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            <StatusCard
              title="Planlanan Randevu"
              value={counts.scheduledAppointments}
              className="bg-blue-50 text-blue-700"
            />
            <StatusCard
              title="Tamamlanan Randevu"
              value={counts.completedAppointments}
              className="bg-green-50 text-green-700"
            />
            <StatusCard
              title="İptal Randevu"
              value={counts.cancelledAppointments}
              className="bg-red-50 text-red-700"
            />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Bugünkü Randevular</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Bugün planlanan operasyonlar.
                  </p>
                </div>

                <Link
                  href="/dashboard/appointments"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Tümünü gör
                </Link>
              </div>

              {todayAppointments.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">
                  Bugün için randevu görünmüyor.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {todayAppointments.slice(0, 5).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-xl border border-slate-100 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{appointment.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {patientMap[appointment.patientId]?.fullName ??
                              appointment.patientId}
                            {" · "}
                            {doctorMap[appointment.doctorId]?.fullName ??
                              appointment.doctorId}
                          </p>
                        </div>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {formatDate(appointment.appointmentAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Son Testler</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Sisteme kaydedilen son test kayıtları.
                  </p>
                </div>

                <Link
                  href="/dashboard/tests"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Tümünü gör
                </Link>
              </div>

              {recentTests.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">
                  Henüz test kaydı yok.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {recentTests.map((test) => (
                    <div
                      key={test.id}
                      className="rounded-xl border border-slate-100 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {patientMap[test.patientId]?.fullName ?? test.patientId}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {doctorMap[test.doctorId]?.fullName ?? test.doctorId}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {sourceLabel(test.sourceType)}
                          </span>
                          <p className="mt-2 text-xs text-slate-500">
                            {formatDate(test.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Hızlı İşlemler</h2>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              <QuickAction href="/dashboard/clinics" label="Klinik Yönet" />
              <QuickAction href="/dashboard/users" label="Doktor Yönet" />
              <QuickAction href="/dashboard/patients" label="Hasta Yönet" />
              <QuickAction href="/dashboard/appointments" label="Randevu Oluştur" />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  href,
}: {
  title: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </Link>
  );
}

function StatusCard({
  title,
  value,
  className,
}: {
  title: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${className}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
    >
      {label}
    </Link>
  );
}

function isToday(date?: Date) {
  if (!date) return false;

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}