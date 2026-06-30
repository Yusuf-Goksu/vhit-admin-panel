"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import InfoRow from "@/components/ui/InfoRow";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/contexts/ToastContext";
import { fetchClinicDetail } from "@/lib/admin-list-api";
import { formatDate } from "@/lib/format";

type ClinicDetail = Awaited<ReturnType<typeof fetchClinicDetail>>;

export default function ClinicDetailPage({ clinicId }: { clinicId: string }) {
  const { showError } = useToast();
  const [data, setData] = useState<ClinicDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => fetchClinicDetail(clinicId))
      .then((detail) => {
        if (!cancelled) setData(detail);
      })
      .catch(() => {
        if (!cancelled) showError("Klinik detayı yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clinicId, showError]);

  if (isLoading) return <LoadingState rows={6} />;
  if (!data) return <EmptyState title="Klinik bulunamadı" />;

  const { clinic, stats, doctors } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={clinic.name}
        description="Klinik profili, bağlı doktorlar ve platform istatistikleri."
        actions={
          <Link href="/dashboard/clinics">
            <Button type="button" variant="outline">
              Kliniklere Dön
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Doktor", stats.doctors],
          ["Aktif Doktor", stats.activeDoctors],
          ["Hasta", stats.patients],
          ["Test", stats.tests],
          ["Randevu", stats.appointments],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value as number}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Klinik Bilgileri</h2>
            <p className="mt-1 text-sm text-slate-500">Kayıt tarihi: {formatDate(clinic.createdAt)}</p>
          </div>
          <StatusBadge active={clinic.isActive} />
        </div>

        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
          <InfoRow label="E-posta" value={clinic.email || "-"} />
          <InfoRow label="Telefon" value={clinic.phone || "-"} />
          <InfoRow label="Adres" value={clinic.address || "-"} />
        </div>
      </Card>

      <Card padding="sm" className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold">Bağlı Doktorlar</h2>
        </div>

        {doctors.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Bu kliniğe bağlı doktor yok" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Doktor</th>
                  <th className="p-4 font-medium">E-posta</th>
                  <th className="p-4 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="border-t border-slate-100">
                    <td className="p-4 font-semibold">{doctor.fullName || "-"}</td>
                    <td className="p-4 text-slate-600">{doctor.email}</td>
                    <td className="p-4">
                      <StatusBadge active={doctor.isActive} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
