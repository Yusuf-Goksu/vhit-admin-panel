"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import PaginationControls from "@/components/ui/PaginationControls";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Textarea from "@/components/ui/Textarea";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createPatient,
  deletePatient,
  togglePatientArchive,
  updatePatient,
} from "@/features/patients/services/patientService";
import { useAdminListQuery } from "@/hooks/useAdminListQuery";
import { adminFetch, AdminApiError } from "@/lib/admin-api";
import { fetchLookups } from "@/lib/admin-list-api";
import { buildCsv, downloadCsv } from "@/lib/csv-export";
import { maskTcKimlikNo } from "@/lib/format";
import { ClinicOption, Patient } from "@/types/domain";

const emptyForm = {
  fullName: "",
  tcKimlikNo: "",
  clinicId: "",
  birthDate: "",
  gender: "",
  phone: "",
  notes: "",
};

export default function PatientsPage() {
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const listQuery = useAdminListQuery<Patient>("/api/admin/patients/list");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedClinic, setSelectedClinic] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  function buildFilters() {
    return {
      search: debouncedSearch || undefined,
      clinicId: selectedClinic || undefined,
      archived: showArchived ? "all" : "false",
    };
  }

  async function reloadAll() {
    await listQuery.reload(buildFilters());
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setInitialLoading(true);

    Promise.all([fetchLookups().then((data) => setClinics(data.clinics)), listQuery.reload(buildFilters())])
      .catch(() => showError("Hastalar yüklenemedi."))
      .finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listQuery.reload(buildFilters()).catch(() => showError("Hasta listesi güncellenemedi."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedClinic, showArchived]);

  useEffect(() => {
    setPatients(listQuery.items);
  }, [listQuery.items]);

  const isLoading = initialLoading || listQuery.isLoading;

  const clinicMap = useMemo(
    () => Object.fromEntries(clinics.map((clinic) => [clinic.id, clinic.name])),
    [clinics]
  );

  async function handleExportCsv() {
    if (patients.length === 0) return;

    setIsExporting(true);

    try {
      const response = await adminFetch<{ items: Patient[] }>("/api/admin/patients/list", {
        method: "POST",
        body: { ids: patients.map((patient) => patient.id) },
      });

      const csv = buildCsv(
        ["ID", "Ad Soyad", "T.C.", "Klinik", "Telefon", "Durum"],
        response.items.map((patient) => [
          patient.id,
          patient.fullName,
          patient.tcKimlikNo,
          clinicMap[patient.clinicId] ?? patient.clinicId,
          patient.phone,
          patient.isArchived ? "Arşiv" : "Aktif",
        ])
      );

      downloadCsv(`hastalar-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      showSuccess("CSV dosyası indirildi.");
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Export başarısız.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        clinicId: form.clinicId,
        tcKimlikNo: form.tcKimlikNo.trim(),
        fullName: form.fullName.trim(),
        birthDate: form.birthDate || null,
        gender: form.gender,
        phone: form.phone.trim(),
        notes: form.notes.trim(),
      };

      if (editing) {
        await updatePatient({ patientId: editing.id, ...payload });
        showSuccess("Hasta güncellendi.");
      } else {
        await createPatient(payload);
        showSuccess("Hasta oluşturuldu.");
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Kayıt başarısız.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(patient: Patient) {
    const approved = await confirm({
      title: patient.isArchived ? "Arşivden çıkar" : "Arşivle",
      description: patient.isArchived
        ? `${patient.fullName} arşivden çıkarılsın mı?`
        : `${patient.fullName} arşivlensin mi?`,
      confirmLabel: patient.isArchived ? "Geri Al" : "Arşivle",
    });

    if (!approved) return;

    try {
      await togglePatientArchive(patient.id, !patient.isArchived);
      showSuccess("Arşiv durumu güncellendi.");
      await reloadAll();
    } catch (error) {
      showError(
        error instanceof AdminApiError ? error.message : "Arşiv güncellenemedi."
      );
    }
  }

  async function handleDelete(patient: Patient) {
    const approved = await confirm({
      title: "Hastayı kalıcı sil",
      description: `${patient.fullName} kalıcı olarak silinecek. Bağlı test veya randevu varsa işlem reddedilir.`,
      confirmLabel: "Kalıcı Sil",
      variant: "danger",
      requireText: "SİL",
    });

    if (!approved) return;

    try {
      await deletePatient(patient.id);
      showSuccess("Hasta silindi.");
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Silme başarısız.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hastalar"
        description="Hasta kayıtlarını oluşturun, düzenleyin, arşivleyin veya silin."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={isExporting || patients.length === 0} onClick={handleExportCsv}>
              {isExporting ? "Export..." : "CSV Export"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
                setFormOpen(true);
              }}
            >
              + Hasta Ekle
            </Button>
          </div>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hasta adı, T.C. veya telefon ara..."
          />
          <Select
            value={selectedClinic}
            onChange={(e) => setSelectedClinic(e.target.value)}
          >
            <option value="">Tüm Klinikler</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </Select>
          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Arşivleri göster
          </label>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : patients.length === 0 ? (
        <EmptyState title="Hasta bulunamadı" />
      ) : (
        <Card padding="sm" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Hasta</th>
                  <th className="p-4 font-medium">T.C. Kimlik No</th>
                  <th className="p-4 font-medium">Klinik</th>
                  <th className="p-4 font-medium">Telefon</th>
                  <th className="p-4 font-medium">Durum</th>
                  <th className="p-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id} className="border-t border-slate-100">
                    <td className="p-4">
                      <Link
                        href={`/dashboard/patients/${patient.id}`}
                        className="font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {patient.fullName}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {patient.gender || "-"}
                      </p>
                    </td>
                    <td>{maskTcKimlikNo(patient.tcKimlikNo)}</td>
                    <td>{clinicMap[patient.clinicId] ?? patient.clinicId}</td>
                    <td>{patient.phone || "-"}</td>
                    <td>
                      <StatusBadge
                        active={!patient.isArchived}
                        activeLabel="Aktif"
                        inactiveLabel="Arşiv"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(patient);
                            setForm({
                              fullName: patient.fullName,
                              tcKimlikNo: patient.tcKimlikNo,
                              clinicId: patient.clinicId,
                              birthDate: patient.birthDate,
                              gender: patient.gender,
                              phone: patient.phone,
                              notes: patient.notes,
                            });
                            setFormOpen(true);
                          }}
                        >
                          Düzenle
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchive(patient)}
                        >
                          {patient.isArchived ? "Geri Al" : "Arşivle"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(patient)}
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
        </Card>
      )}

      <PaginationControls
        page={listQuery.page}
        itemCount={patients.length}
        pageSize={listQuery.pageSize}
        hasNext={listQuery.hasNext}
        hasPrevious={listQuery.hasPrevious}
        isLoading={listQuery.isLoading}
        onPrevious={() => listQuery.previousPage()}
        onNext={() => listQuery.nextPage()}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Hasta Düzenle" : "Hasta Ekle"}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              İptal
            </Button>
            <Button type="submit" form="patient-form" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </>
        }
      >
        <form id="patient-form" onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Ad Soyad"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input
            label="T.C. Kimlik No"
            value={form.tcKimlikNo}
            onChange={(e) => setForm({ ...form, tcKimlikNo: e.target.value })}
            maxLength={11}
            required
          />
          <Select
            label="Klinik"
            value={form.clinicId}
            onChange={(e) => setForm({ ...form, clinicId: e.target.value })}
            required
          >
            <option value="">Klinik seç</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </Select>
          <Input
            label="Doğum Tarihi"
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
          />
          <Select
            label="Cinsiyet"
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
          >
            <option value="">Seçin</option>
            <option value="male">Erkek</option>
            <option value="female">Kadın</option>
            <option value="other">Diğer</option>
          </Select>
          <Input
            label="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Textarea
            label="Notlar"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={4}
          />
        </form>
      </Modal>
    </div>
  );
}
