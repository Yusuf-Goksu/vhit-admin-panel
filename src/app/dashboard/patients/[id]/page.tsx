"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useParams } from "next/navigation";

import { db } from "@/lib/firebase";
import TestGraph from "@/components/graphs/TestGraph";

type Patient = {
  id: string;
  fullName: string;
  patientCode: string;
  clinicId: string;
  phone: string;
  gender: string;
  notes: string;
};

type TestRecord = {
  id: string;
  sourceType: string;
  note: string;
  graphs: any[];
  metrics: Record<string, number>;
  flags: Record<string, boolean>;
  summaryText?: string;
  createdAt: any;
};

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = String(params.id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);

    try {
      const patientSnap = await getDoc(doc(db, "patients", patientId));

      if (patientSnap.exists()) {
        const data = patientSnap.data();

        setPatient({
          id: patientSnap.id,
          fullName: data.fullName ?? "",
          patientCode: data.patientCode ?? "",
          clinicId: data.clinicId ?? "",
          phone: data.phone ?? "",
          gender: data.gender ?? "",
          notes: data.notes ?? "",
        });
      }

      const testsQuery = query(
        collection(db, "tests"),
        where("patientId", "==", patientId),
        orderBy("createdAt", "desc")
      );

      const testsSnap = await getDocs(testsQuery);

      setTests(
        testsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
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
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function formatDate(value: any) {
    return value?.toDate?.().toLocaleString("tr-TR") ?? "-";
  }

  if (isLoading) {
    return <p className="text-slate-500">Yükleniyor...</p>;
  }

  if (!patient) {
    return <p className="text-red-600">Hasta bulunamadı.</p>;
  }

  return (
    <div className="text-slate-900">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{patient.fullName}</h1>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <Info label="Hasta Kodu" value={patient.patientCode} />
          <Info label="Telefon" value={patient.phone || "-"} />
          <Info label="Cinsiyet" value={patient.gender || "-"} />
          <Info label="Klinik ID" value={patient.clinicId} />
        </div>

        {patient.notes && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            {patient.notes}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold">Test Geçmişi</h2>

        {tests.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white p-8 text-slate-500 shadow-sm">
            Bu hastaya ait test kaydı bulunamadı.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4">Tarih</th>
                  <th>Kaynak</th>
                  <th>Not</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {tests.map((test) => (
                  <tr key={test.id} className="border-t">
                    <td className="p-4">{formatDate(test.createdAt)}</td>

                    <td>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {test.sourceType === "live_camera"
                          ? "Canlı Kamera"
                          : "Galeri Video"}
                      </span>
                    </td>

                    <td className="text-slate-600">{test.note || "-"}</td>

                    <td>
                      <button
                        onClick={() => setSelectedTest(test)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Detay Gör
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
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

            {selectedTest.summaryText && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {selectedTest.summaryText}
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-semibold">Metrikler</h3>

              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {Object.entries(selectedTest.metrics).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{key}</p>
                    <p className="mt-1 font-bold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Uyarılar</h3>

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
            </div>

            <div className="mt-6 space-y-4">
              {selectedTest.graphs?.length ? (
                selectedTest.graphs.map((graph: any, index: number) => (
                 <TestGraph key={index} graph={graph} />
                ))
              ) : (
                <p className="text-sm text-slate-500">Grafik verisi yok.</p>
              )}
            </div>
          </div>
        </div>
      )}
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