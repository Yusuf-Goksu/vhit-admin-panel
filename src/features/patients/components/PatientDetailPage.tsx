"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import TestGraph from "@/components/graphs/TestGraph";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import InfoRow from "@/components/ui/InfoRow";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { deleteTest } from "@/features/tests/services/testService";
import { AdminApiError, adminFetch } from "@/lib/admin-api";
import { formatDate, formatDateTime, maskTcKimlikNo } from "@/lib/format";

type PatientDetailResponse = {
  patient: {
    id: string;
    fullName: string;
    tcKimlikNo: string;
    clinicId: string;
    clinicName: string;
    phone: string;
    gender: string;
    notes: string;
    birthDate: string | null;
    isArchived: boolean;
    createdAt: string | null;
  };
  stats: { tests: number; appointments: number };
  tests: {
    id: string;
    sourceType: string;
    note: string;
    graphs: unknown[];
    metrics: Record<string, number>;
    flags: Record<string, boolean>;
    createdAt: string | null;
  }[];
  appointments: {
    id: string;
    title: string;
    status: string;
    appointmentAt: string | null;
    doctorId: string;
  }[];
};

function sourceLabel(sourceType: string) {
  if (sourceType === "live_camera") return "Canlı Kamera";
  if (sourceType === "gallery_video") return "Galeri Video";
  return sourceType || "-";
}

export default function PatientDetailPage({ patientId }: { patientId: string }) {
  const { confirm } = useConfirm();
  const { showError, showSuccess } = useToast();
  const [data, setData] = useState<PatientDetailResponse | null>(null);
  const [selectedTest, setSelectedTest] = useState<PatientDetailResponse["tests"][number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    adminFetch<PatientDetailResponse>(`/api/admin/patients/${patientId}`, { method: "GET" })
      .then(setData)
      .catch(() => showError("Hasta detayı yüklenemedi."))
      .finally(() => setIsLoading(false));
  }, [patientId, showError]);

  async function handleDeleteTest(test: PatientDetailResponse["tests"][number]) {
    const approved = await confirm({
      title: "Test kaydını sil",
      description: "Bu test kaydı kalıcı olarak silinecek.",
      confirmLabel: "Kalıcı Sil",
      variant: "danger",
      requireText: "SİL",
    });

    if (!approved) return;

    setDeletingTestId(test.id);

    try {
      await deleteTest(test.id);
      showSuccess("Test kaydı silindi.");
      setSelectedTest((current) => (current?.id === test.id ? null : current));
      setData((current) =>
        current
          ? {
              ...current,
              tests: current.tests.filter((item) => item.id !== test.id),
              stats: { ...current.stats, tests: Math.max(0, current.stats.tests - 1) },
            }
          : current
      );
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Test silinemedi.");
    } finally {
      setDeletingTestId(null);
    }
  }

  if (isLoading) return <LoadingState rows={8} />;
  if (!data) return <EmptyState title="Hasta bulunamadı" />;

  const { patient, stats, tests, appointments } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.fullName}
        description={`${patient.clinicName} · ${maskTcKimlikNo(patient.tcKimlikNo)}`}
        actions={
          <Link href="/dashboard/patients">
            <Button type="button" variant="outline">
              Hastalara Dön
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Test Sayısı</p>
          <p className="mt-2 text-2xl font-bold">{stats.tests}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Randevu Sayısı</p>
          <p className="mt-2 text-2xl font-bold">{stats.appointments}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Kayıt Tarihi</p>
          <p className="mt-2 text-lg font-bold">{formatDate(patient.createdAt)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Durum</p>
          <div className="mt-3">
            <StatusBadge active={!patient.isArchived} activeLabel="Aktif" inactiveLabel="Arşiv" />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-bold">Hasta Bilgileri</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <InfoRow label="Telefon" value={patient.phone || "-"} />
          <InfoRow label="Cinsiyet" value={patient.gender || "-"} />
          <InfoRow label="Doğum Tarihi" value={formatDate(patient.birthDate)} />
          <InfoRow label="Klinik" value={patient.clinicName} />
        </div>
        {patient.notes && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{patient.notes}</div>
        )}
      </Card>

      <Card padding="sm" className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold">Test Geçmişi</h2>
        </div>
        {tests.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Test kaydı yok" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Tarih</th>
                  <th className="p-4 font-medium">Kaynak</th>
                  <th className="p-4 font-medium">Not</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={test.id} className="border-t border-slate-100">
                    <td className="p-4">{formatDateTime(test.createdAt)}</td>
                    <td className="p-4">{sourceLabel(test.sourceType)}</td>
                    <td className="p-4 text-slate-600">{test.note || "-"}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedTest(test)}>
                          Detay
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={deletingTestId === test.id}
                          onClick={() => handleDeleteTest(test)}
                        >
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="sm" className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold">Randevu Geçmişi</h2>
        </div>
        {appointments.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Randevu kaydı yok" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Tarih</th>
                  <th className="p-4 font-medium">Başlık</th>
                  <th className="p-4 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-t border-slate-100">
                    <td className="p-4">{formatDateTime(appointment.appointmentAt)}</td>
                    <td className="p-4 font-medium">{appointment.title}</td>
                    <td className="p-4 capitalize">{appointment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!selectedTest}
        onClose={() => setSelectedTest(null)}
        title="Test Detayı"
        description={selectedTest ? formatDateTime(selectedTest.createdAt) : undefined}
        size="xl"
        footer={
          selectedTest && (
            <>
              <Button
                type="button"
                variant="danger"
                disabled={deletingTestId === selectedTest.id}
                onClick={() => handleDeleteTest(selectedTest)}
              >
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.entries(selectedTest.metrics).map(([key, value]) => (
                <Card key={key} padding="sm">
                  <p className="text-xs text-slate-500">{key}</p>
                  <p className="mt-1 font-bold">{value}</p>
                </Card>
              ))}
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
