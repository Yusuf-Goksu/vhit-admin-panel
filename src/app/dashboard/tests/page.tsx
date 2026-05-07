"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import TestGraph from "@/components/graphs/TestGraph";

type TestRecord = {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  sourceType: string;
  note: string;
  graphs: any[];
  metrics: Record<string, number>;
  flags: Record<string, boolean>;
  summaryText?: string;
  createdAt: any;
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

type Clinic = {
  id: string;
  name: string;
};

export default function TestsPage() {
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  const [selectedTest, setSelectedTest] = useState<TestRecord | null>(null);

  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);

    try {
      const [testsSnap, patientsSnap, doctorsSnap, clinicsSnap] =
        await Promise.all([
          getDocs(query(collection(db, "tests"), orderBy("createdAt", "desc"))),
          getDocs(collection(db, "patients")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "clinics")),
        ]);

      setTests(
        testsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            patientId: data.patientId ?? "",
            doctorId: data.doctorId ?? "",
            clinicId: data.clinicId ?? "",
            sourceType: data.sourceType ?? "",
            note: data.note ?? "",
            graphs: data.graphs ?? [],
            metrics: data.metrics ?? {},
            flags: data.flags ?? {},
            summaryText: data.summaryText ?? "",
            createdAt: data.createdAt,
          };
        })
      );

      setPatients(
        patientsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            fullName: data.fullName ?? "",
            patientCode: data.patientCode ?? "",
          };
        })
      );

      setDoctors(
        doctorsSnap.docs
          .filter((item) => item.data().role === "doctor")
          .map((item) => {
            const data = item.data();

            return {
              id: item.id,
              fullName: data.fullName ?? "",
              email: data.email ?? "",
            };
          })
      );

      setClinics(
        clinicsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            name: data.name ?? "",
          };
        })
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const patientMap = useMemo(() => {
    return Object.fromEntries(patients.map((p) => [p.id, p]));
  }, [patients]);

  const doctorMap = useMemo(() => {
    return Object.fromEntries(doctors.map((d) => [d.id, d]));
  }, [doctors]);

  const clinicMap = useMemo(() => {
    return Object.fromEntries(clinics.map((c) => [c.id, c.name]));
  }, [clinics]);

  const filteredTests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tests.filter((test) => {
      const patient = patientMap[test.patientId];
      const doctor = doctorMap[test.doctorId];

      const createdDate = test.createdAt?.toDate?.();

      if (clinicFilter && test.clinicId !== clinicFilter) return false;
      if (doctorFilter && test.doctorId !== doctorFilter) return false;
      if (sourceFilter && test.sourceType !== sourceFilter) return false;

      if (dateFrom && createdDate) {
        const from = new Date(dateFrom);
        if (createdDate < from) return false;
      }

      if (dateTo && createdDate) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (createdDate > to) return false;
      }

      if (!term) return true;

      return (
        patient?.fullName?.toLowerCase().includes(term) ||
        patient?.patientCode?.toLowerCase().includes(term) ||
        doctor?.fullName?.toLowerCase().includes(term) ||
        test.note?.toLowerCase().includes(term)
      );
    });
  }, [
    tests,
    search,
    clinicFilter,
    doctorFilter,
    sourceFilter,
    dateFrom,
    dateTo,
    patientMap,
    doctorMap,
  ]);

  function formatDate(value: any) {
    return value?.toDate?.().toLocaleString("tr-TR") ?? "-";
  }

  function sourceLabel(sourceType: string) {
    if (sourceType === "live_camera") return "Canlı Kamera";
    if (sourceType === "gallery_video") return "Galeri Video";
    return sourceType || "-";
  }

  async function hardDeleteTest(test: TestRecord) {
    const first = window.confirm(
      "Bu test kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam edilsin mi?"
    );

    if (!first) return;

    const typed = window.prompt("Kalıcı silmek için SİL yaz.");
    if (typed !== "SİL") return;

    await deleteDoc(doc(db, "tests", test.id));

    setSelectedTest(null);
    await loadData();
  }

  function resetFilters() {
    setSearch("");
    setClinicFilter("");
    setDoctorFilter("");
    setSourceFilter("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Testler</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sistemdeki tüm v-HIT test kayıtlarını analiz edin.
          </p>
        </div>

        <button
          onClick={loadData}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Yenile
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hasta, kod, doktor veya not ara..."
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 md:col-span-2"
          />

          <select
            value={clinicFilter}
            onChange={(e) => setClinicFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Tüm klinikler</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>

          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Tüm doktorlar</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName || doctor.email}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Tüm kaynaklar</option>
            <option value="live_camera">Canlı Kamera</option>
            <option value="gallery_video">Galeri Video</option>
          </select>

          <button
            onClick={resetFilters}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Filtreleri Temizle
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Toplam Test" value={tests.length} />
        <StatCard title="Filtrelenen" value={filteredTests.length} />
        <StatCard
          title="Canlı Kamera"
          value={tests.filter((t) => t.sourceType === "live_camera").length}
        />
        <StatCard
          title="Galeri Video"
          value={tests.filter((t) => t.sourceType === "gallery_video").length}
        />
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-500">Test kayıtları yükleniyor...</p>
      ) : filteredTests.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-slate-500 shadow-sm">
          Test kaydı bulunamadı.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-4">Tarih</th>
                <th>Hasta</th>
                <th>Doktor</th>
                <th>Klinik</th>
                <th>Kaynak</th>
                <th>Impulse</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredTests.map((test) => {
                const patient = patientMap[test.patientId];
                const doctor = doctorMap[test.doctorId];

                return (
                  <tr key={test.id} className="border-t">
                    <td className="p-4">{formatDate(test.createdAt)}</td>

                    <td>
                      <p className="font-semibold">
                        {patient?.fullName ?? test.patientId}
                      </p>
                      <p className="text-xs text-slate-500">
                        {patient?.patientCode ?? "-"}
                      </p>
                    </td>

                    <td>{doctor?.fullName ?? test.doctorId}</td>

                    <td>{clinicMap[test.clinicId] ?? test.clinicId}</td>

                    <td>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {sourceLabel(test.sourceType)}
                      </span>
                    </td>

<td>{getTotalImpulseCount(test.graphs)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedTest(test)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Detay Gör
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Test Detayı</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(selectedTest.createdAt)}
                </p>
              </div>

              <button
                onClick={() => setSelectedTest(null)}
                className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-4">
              <Info
                label="Hasta"
                value={
                  patientMap[selectedTest.patientId]?.fullName ??
                  selectedTest.patientId
                }
              />
              <Info
                label="Doktor"
                value={
                  doctorMap[selectedTest.doctorId]?.fullName ??
                  selectedTest.doctorId
                }
              />
              <Info
                label="Klinik"
                value={clinicMap[selectedTest.clinicId] ?? selectedTest.clinicId}
              />
              <Info label="Kaynak" value={sourceLabel(selectedTest.sourceType)} />
            </div>

            {selectedTest.note && (
              <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                <strong>Not:</strong> {selectedTest.note}
              </div>
            )}

            {selectedTest.summaryText && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {selectedTest.summaryText}
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-semibold">Metrikler</h3>

              {Object.keys(selectedTest.metrics).length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Metrik yok.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {Object.entries(selectedTest.metrics).map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">{key}</p>
                      <p className="mt-1 font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Uyarılar</h3>

              {Object.keys(selectedTest.flags).length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Uyarı yok.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(selectedTest.flags).map(([key, value]) => (
                    <span
                      key={key}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        value
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {key}: {value ? "Var" : "Yok"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {selectedTest.graphs.length ? (
                selectedTest.graphs.map((graph: any, index: number) => (
                  <TestGraph key={index} graph={graph} />
                ))
              ) : (
                <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
                  Grafik verisi yok.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => hardDeleteTest(selectedTest)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Kalıcı Sil
              </button>

              <button
                onClick={() => setSelectedTest(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function getTotalImpulseCount(graphs: any[]) {
  return graphs.reduce((total, graph) => {
    if (typeof graph.impulseCount === "number") {
      return total + graph.impulseCount;
    }

    if (Array.isArray(graph.segments)) {
      return total + graph.segments.length;
    }

    return total;
  }, 0);
}