"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  DocumentData,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  where,
} from "firebase/firestore";

import TestGraph from "@/components/graphs/TestGraph";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import PaginationControls from "@/components/ui/PaginationControls";
import Select from "@/components/ui/Select";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { deleteTest } from "@/features/tests/services/testService";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { adminFetch, AdminApiError } from "@/lib/admin-api";
import { buildCsv, downloadCsv } from "@/lib/csv-export";
import { formatDateTime, maskTcKimlikNo, toDate } from "@/lib/format";
import { db } from "@/lib/firebase";
import { TestRecord } from "@/types/domain";

type Patient = { id: string; fullName: string; tcKimlikNo: string };
type Doctor = { id: string; fullName: string; email: string };
type Clinic = { id: string; name: string };

function sourceLabel(sourceType: string) {
  if (sourceType === "live_camera") return "Canlı Kamera";
  if (sourceType === "gallery_video") return "Galeri Video";
  return sourceType || "-";
}

function getTotalImpulseCount(graphs: unknown[]) {
  return graphs.reduce<number>((total, graph) => {
    const item = graph as { impulseCount?: number; segments?: unknown[] };
    if (typeof item.impulseCount === "number") return total + item.impulseCount;
    if (Array.isArray(item.segments)) return total + item.segments.length;
    return total;
  }, 0);
}

export default function TestsPage() {
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();

  const [tests, setTests] = useState<TestRecord[]>([]);
  const pagination = usePagedQuery<TestRecord>();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [stats, setStats] = useState({ total: 0, liveCamera: 0, galleryVideo: 0 });
  const [selectedTest, setSelectedTest] = useState<TestRecord | null>(null);
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const testQueryConstraints = [orderBy("createdAt", "desc")];

  function mapTestDoc(doc: QueryDocumentSnapshot<unknown, DocumentData>) {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      patientId: String(data.patientId ?? ""),
      doctorId: String(data.doctorId ?? ""),
      clinicId: String(data.clinicId ?? ""),
      sourceType: String(data.sourceType ?? ""),
      note: String(data.note ?? ""),
      graphs: (data.graphs ?? []) as unknown[],
      metrics: (data.metrics ?? {}) as Record<string, number>,
      flags: (data.flags ?? {}) as Record<string, boolean>,
      createdAt: data.createdAt,
    };
  }

  async function loadStats() {
    const ref = collection(db, "tests");
    const [total, liveCamera, galleryVideo] = await Promise.all([
      getCountFromServer(ref),
      getCountFromServer(query(ref, where("sourceType", "==", "live_camera"))),
      getCountFromServer(query(ref, where("sourceType", "==", "gallery_video"))),
    ]);

    setStats({
      total: total.data().count,
      liveCamera: liveCamera.data().count,
      galleryVideo: galleryVideo.data().count,
    });
  }

  async function loadReferenceData() {
    const [patientsSnap, doctorsSnap, clinicsSnap] = await Promise.all([
      getDocs(collection(db, "patients")),
      getDocs(collection(db, "users")),
      getDocs(collection(db, "clinics")),
    ]);

    setPatients(
      patientsSnap.docs.map((item) => ({
        id: item.id,
        fullName: item.data().fullName ?? "",
        tcKimlikNo: item.data().tcKimlikNo ?? "",
      }))
    );

    setDoctors(
      doctorsSnap.docs
        .filter((item) => item.data().role === "doctor")
        .map((item) => ({
          id: item.id,
          fullName: item.data().fullName ?? "",
          email: item.data().email ?? "",
        }))
    );

    setClinics(
      clinicsSnap.docs.map((item) => ({
        id: item.id,
        name: item.data().name ?? "",
      }))
    );
  }

  async function loadTests(page = 1) {
    await pagination.fetchPage(
      page,
      collection(db, "tests"),
      testQueryConstraints,
      (doc) => mapTestDoc(doc)
    );
  }

  async function reloadAll() {
    pagination.reset();
    await Promise.all([loadTests(1), loadStats()]);
  }

  useEffect(() => {
    setInitialLoading(true);

    Promise.all([loadReferenceData(), loadTests(1), loadStats()])
      .catch(() => showError("Test kayıtları yüklenemedi."))
      .finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTests(pagination.items);
  }, [pagination.items]);

  const isLoading = initialLoading || pagination.isLoading;
  const filtersActive = Boolean(
    search.trim() || clinicFilter || doctorFilter || sourceFilter || dateFrom || dateTo
  );

  const patientMap = useMemo(
    () => Object.fromEntries(patients.map((patient) => [patient.id, patient])),
    [patients]
  );
  const doctorMap = useMemo(
    () => Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors]
  );
  const clinicMap = useMemo(
    () => Object.fromEntries(clinics.map((clinic) => [clinic.id, clinic.name])),
    [clinics]
  );

  const filteredTests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tests.filter((test) => {
      const patient = patientMap[test.patientId];
      const doctor = doctorMap[test.doctorId];
      const createdDate = toDate(test.createdAt);

      if (clinicFilter && test.clinicId !== clinicFilter) return false;
      if (doctorFilter && test.doctorId !== doctorFilter) return false;
      if (sourceFilter && test.sourceType !== sourceFilter) return false;

      if (dateFrom && createdDate && createdDate < new Date(dateFrom)) return false;

      if (dateTo && createdDate) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (createdDate > to) return false;
      }

      if (!term) return true;

      return (
        patient?.fullName?.toLowerCase().includes(term) ||
        patient?.tcKimlikNo?.toLowerCase().includes(term) ||
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

  async function handleExportCsv() {
    if (filteredTests.length === 0) return;

    setIsExporting(true);

    try {
      const response = await adminFetch<{ items: TestRecord[] }>("/api/admin/tests/list", {
        method: "POST",
        body: { ids: filteredTests.map((test) => test.id) },
      });

      const csv = buildCsv(
        ["ID", "Hasta", "Doktor", "Klinik", "Kaynak", "Tarih"],
        response.items.map((test) => [
          test.id,
          patientMap[test.patientId]?.fullName ?? test.patientId,
          doctorMap[test.doctorId]?.fullName ?? test.doctorId,
          clinicMap[test.clinicId] ?? test.clinicId,
          sourceLabel(test.sourceType),
          formatDateTime(test.createdAt),
        ])
      );

      downloadCsv(`testler-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      showSuccess("CSV dosyası indirildi.");
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Export başarısız.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete(test: TestRecord) {
    const approved = await confirm({
      title: "Test kaydını sil",
      description: "Bu test kaydı kalıcı olarak silinecek.",
      confirmLabel: "Kalıcı Sil",
      variant: "danger",
      requireText: "SİL",
    });

    if (!approved) return;

    try {
      await deleteTest(test.id);
      showSuccess("Test kaydı silindi.");
      setSelectedTest(null);
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Test silinemedi.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testler"
        description="Sistemdeki tüm v-HIT test kayıtlarını analiz edin."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isExporting || filteredTests.length === 0}
              onClick={handleExportCsv}
            >
              {isExporting ? "Export..." : "CSV Export"}
            </Button>
            <Button type="button" variant="outline" onClick={reloadAll}>
              Yenile
            </Button>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">
          <Input
            className="xl:col-span-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hasta, T.C., doktor veya not ara..."
          />
          <Select value={clinicFilter} onChange={(e) => setClinicFilter(e.target.value)}>
            <option value="">Tüm klinikler</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </Select>
          <Select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
            <option value="">Tüm doktorlar</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName || doctor.email}
              </option>
            ))}
          </Select>
          <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">Tüm kaynaklar</option>
            <option value="live_camera">Canlı Kamera</option>
            <option value="gallery_video">Galeri Video</option>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch("");
              setClinicFilter("");
              setDoctorFilter("");
              setSourceFilter("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Temizle
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Toplam Test", stats.total],
          ["Filtrelenen", filteredTests.length],
          ["Canlı Kamera", stats.liveCamera],
          ["Galeri Video", stats.galleryVideo],
        ].map(([title, value]) => (
          <Card key={title as string}>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold">{value as number}</p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <LoadingState label="Test kayıtları yükleniyor..." />
      ) : filteredTests.length === 0 ? (
        <EmptyState title="Test kaydı bulunamadı" />
      ) : (
        <Card padding="sm" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Tarih</th>
                  <th className="p-4 font-medium">Hasta</th>
                  <th className="p-4 font-medium">Doktor</th>
                  <th className="p-4 font-medium">Klinik</th>
                  <th className="p-4 font-medium">Kaynak</th>
                  <th className="p-4 font-medium">Impulse</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test) => {
                  const patient = patientMap[test.patientId];
                  const doctor = doctorMap[test.doctorId];

                  return (
                    <tr key={test.id} className="border-t border-slate-100">
                      <td className="p-4">{formatDateTime(test.createdAt)}</td>
                      <td>
                        <p className="font-semibold">{patient?.fullName ?? test.patientId}</p>
                        <p className="text-xs text-slate-500">
                          {patient?.tcKimlikNo ? maskTcKimlikNo(patient.tcKimlikNo) : "-"}
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
                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedTest(test)}>
                          Detay Gör
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!filtersActive && (
        <PaginationControls
          page={pagination.page}
          itemCount={filteredTests.length}
          pageSize={pagination.pageSize}
          hasNext={pagination.hasNext}
          hasPrevious={pagination.hasPrevious}
          isLoading={pagination.isLoading}
          onPrevious={() =>
            pagination.previousPage(
              collection(db, "tests"),
              testQueryConstraints,
              (doc) => mapTestDoc(doc)
            )
          }
          onNext={() =>
            pagination.nextPage(
              collection(db, "tests"),
              testQueryConstraints,
              (doc) => mapTestDoc(doc)
            )
          }
        />
      )}

      <Modal
        open={!!selectedTest}
        onClose={() => setSelectedTest(null)}
        title="Test Detayı"
        description={selectedTest ? formatDateTime(selectedTest.createdAt) : undefined}
        size="xl"
        footer={
          selectedTest && (
            <>
              <Button type="button" variant="danger" onClick={() => handleDelete(selectedTest)}>
                Kalıcı Sil
              </Button>
              <Button type="button" onClick={() => setSelectedTest(null)}>
                Kapat
              </Button>
            </>
          )
        }
      >
        {selectedTest && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-4">
              <Info label="Hasta" value={patientMap[selectedTest.patientId]?.fullName ?? selectedTest.patientId} />
              <Info label="Doktor" value={doctorMap[selectedTest.doctorId]?.fullName ?? selectedTest.doctorId} />
              <Info label="Klinik" value={clinicMap[selectedTest.clinicId] ?? selectedTest.clinicId} />
              <Info label="Kaynak" value={sourceLabel(selectedTest.sourceType)} />
            </div>

            {selectedTest.note && (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                <strong>Not:</strong> {selectedTest.note}
              </div>
            )}

            <div>
              <h3 className="font-semibold">Metrikler</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {Object.entries(selectedTest.metrics).map(([key, value]) => (
                  <Card key={key} padding="sm">
                    <p className="text-xs text-slate-500">{key}</p>
                    <p className="mt-1 font-bold">{value}</p>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {selectedTest.graphs.length ? (
                selectedTest.graphs.map((graph, index) => (
                  <TestGraph key={index} graph={graph as never} />
                ))
              ) : (
                <EmptyState title="Grafik verisi yok" />
              )}
            </div>
          </div>
        )}
      </Modal>
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
