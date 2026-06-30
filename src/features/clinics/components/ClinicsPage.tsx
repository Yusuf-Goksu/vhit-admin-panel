"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  DocumentData,
  orderBy,
  QueryDocumentSnapshot,
} from "firebase/firestore";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import PaginationControls from "@/components/ui/PaginationControls";
import StatusBadge from "@/components/ui/StatusBadge";
import Textarea from "@/components/ui/Textarea";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import {
  createClinic,
  deleteClinic,
  toggleClinicStatus,
  updateClinic,
} from "@/features/clinics/services/clinicService";
import { AdminApiError } from "@/lib/admin-api";
import { db } from "@/lib/firebase";
import { Clinic } from "@/types/domain";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  isActive: true,
};

export default function ClinicsPage() {
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();

  const pagination = usePagedQuery<Clinic>();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const clinicQueryConstraints = [orderBy("name")];

  function mapClinicDoc(doc: QueryDocumentSnapshot<unknown, DocumentData>) {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      name: String(data.name ?? ""),
      email: String(data.email ?? ""),
      phone: String(data.phone ?? ""),
      address: String(data.address ?? ""),
      isActive: Boolean(data.isActive ?? true),
    };
  }

  async function loadClinics(page = 1) {
    await pagination.fetchPage(
      page,
      collection(db, "clinics"),
      clinicQueryConstraints,
      (doc) => mapClinicDoc(doc)
    );
  }

  async function reloadAll() {
    pagination.reset();
    await loadClinics(1);
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => loadClinics(1))
      .catch(() => {
        if (!cancelled) showError("Klinikler yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = initialLoading || pagination.isLoading;
  const clinics = pagination.items;
  const filtersActive = Boolean(search.trim());

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return clinics.filter(
      (clinic) =>
        clinic.name.toLowerCase().includes(term) ||
        clinic.email.toLowerCase().includes(term) ||
        clinic.phone.toLowerCase().includes(term)
    );
  }, [clinics, search]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        isActive: form.isActive,
      };

      if (editing) {
        await updateClinic({ clinicId: editing.id, ...payload });
        showSuccess("Klinik güncellendi.");
      } else {
        await createClinic(payload);
        showSuccess("Klinik oluşturuldu.");
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

  async function handleToggle(clinic: Clinic) {
    try {
      await toggleClinicStatus(clinic.id, !clinic.isActive);
      showSuccess("Durum güncellendi.");
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Durum güncellenemedi.");
    }
  }

  async function handleDelete(clinic: Clinic) {
    const approved = await confirm({
      title: "Kliniği sil",
      description: `${clinic.name} kalıcı olarak silinecek. Bağlı doktor veya hasta varsa işlem reddedilir.`,
      confirmLabel: "Sil",
      variant: "danger",
      requireText: "SİL",
    });

    if (!approved) return;

    try {
      await deleteClinic(clinic.id);
      showSuccess("Klinik silindi.");
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Silme başarısız.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Klinikler"
        description="Klinik kayıtlarını oluşturun, düzenleyin, durumlarını yönetin veya silin."
        actions={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
              setFormOpen(true);
            }}
          >
            + Klinik Ekle
          </Button>
        }
      />

      <Card>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Klinik adı, e-posta veya telefon ara..."
        />
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState title="Klinik bulunamadı" />
      ) : (
        <Card padding="sm" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Klinik</th>
                  <th className="p-4 font-medium">İletişim</th>
                  <th className="p-4 font-medium">Durum</th>
                  <th className="p-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((clinic) => (
                  <tr key={clinic.id} className="border-t border-slate-100">
                    <td className="p-4">
                      <Link href={`/dashboard/clinics/${clinic.id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">
                        {clinic.name}
                      </Link>
                      <p className="text-xs text-slate-500">{clinic.address || "-"}</p>
                    </td>
                    <td className="p-4 text-slate-600">
                      <p>{clinic.email || "-"}</p>
                      <p className="text-xs">{clinic.phone || "-"}</p>
                    </td>
                    <td className="p-4">
                      <StatusBadge active={clinic.isActive} />
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(clinic);
                            setForm({
                              name: clinic.name,
                              email: clinic.email,
                              phone: clinic.phone,
                              address: clinic.address,
                              isActive: clinic.isActive,
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
                          onClick={() => handleToggle(clinic)}
                        >
                          {clinic.isActive ? "Pasif Yap" : "Aktif Yap"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(clinic)}
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

      {!filtersActive && (
        <PaginationControls
          page={pagination.page}
          itemCount={filtered.length}
          pageSize={pagination.pageSize}
          hasNext={pagination.hasNext}
          hasPrevious={pagination.hasPrevious}
          isLoading={pagination.isLoading}
          onPrevious={() =>
            pagination.previousPage(
              collection(db, "clinics"),
              clinicQueryConstraints,
              (doc) => mapClinicDoc(doc)
            )
          }
          onNext={() =>
            pagination.nextPage(
              collection(db, "clinics"),
              clinicQueryConstraints,
              (doc) => mapClinicDoc(doc)
            )
          }
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Klinik Düzenle" : "Klinik Ekle"}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              İptal
            </Button>
            <Button type="submit" form="clinic-form" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </>
        }
      >
        <form id="clinic-form" onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Klinik Adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="E-posta"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Textarea
            label="Adres"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={3}
          />
        </form>
      </Modal>
    </div>
  );
}
