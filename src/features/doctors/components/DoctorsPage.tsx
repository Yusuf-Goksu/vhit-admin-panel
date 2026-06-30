"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  collection,
  DocumentData,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  where,
} from "firebase/firestore";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ImageLightbox from "@/components/ui/ImageLightbox";
import InfoRow from "@/components/ui/InfoRow";
import Input from "@/components/ui/Input";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import PaginationControls from "@/components/ui/PaginationControls";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createDoctor,
  deleteDoctor,
  resetDoctorPassword,
  toggleDoctorStatus,
  updateDoctor,
} from "@/features/doctors/services/doctorService";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { AdminApiError } from "@/lib/admin-api";
import { db } from "@/lib/firebase";
import { ClinicOption, Doctor } from "@/types/domain";

type DoctorForm = {
  fullName: string;
  email: string;
  password: string;
  clinicId: string;
};

const emptyForm: DoctorForm = {
  fullName: "",
  email: "",
  password: "",
  clinicId: "",
};

export default function DoctorsPage() {
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();

  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const pagination = usePagedQuery<Doctor>();

  const [searchText, setSearchText] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState<DoctorForm>(emptyForm);
  const [previewPhoto, setPreviewPhoto] = useState<{ src: string; alt: string } | null>(
    null
  );

  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const doctorQueryConstraints = [where("role", "==", "doctor"), orderBy("createdAt", "desc")];

  function mapDoctorDoc(doc: QueryDocumentSnapshot<unknown, DocumentData>) {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      fullName: String(data.fullName ?? ""),
      email: String(data.email ?? ""),
      role: String(data.role ?? "doctor"),
      clinicId: String(data.clinicId ?? ""),
      isActive: Boolean(data.isActive ?? true),
      profilePhotoUrl:
        (data.profilePhotoUrl ??
          data.photoUrl ??
          data.photoURL ??
          data.profileImageUrl ??
          null) as string | null,
    };
  }

  async function loadClinics() {
    const snapshot = await getDocs(
      query(
        collection(db, "clinics"),
        where("isActive", "==", true),
        orderBy("name")
      )
    );

    setClinics(
      snapshot.docs.map((item) => ({
        id: item.id,
        name: item.data().name ?? item.id,
      }))
    );
  }

  async function loadDoctors(page = 1) {
    await pagination.fetchPage(
      page,
      collection(db, "users"),
      doctorQueryConstraints,
      (doc) => mapDoctorDoc(doc)
    );
  }

  async function reloadAll() {
    pagination.reset();
    await loadDoctors(1);
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => Promise.all([loadClinics(), loadDoctors(1)]))
      .catch(() => {
        if (!cancelled) showError("Doktorlar yüklenemedi.");
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
  const doctors = pagination.items;
  const filtersActive = Boolean(searchText.trim());

  const clinicNameById = useMemo(
    () => Object.fromEntries(clinics.map((clinic) => [clinic.id, clinic.name])),
    [clinics]
  );

  const filteredDoctors = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return doctors;

    return doctors.filter(
      (doctor) =>
        doctor.fullName.toLowerCase().includes(term) ||
        doctor.email.toLowerCase().includes(term) ||
        doctor.clinicId.toLowerCase().includes(term)
    );
  }, [doctors, searchText]);

  function openCreateForm() {
    setEditingDoctor(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEditForm(doctor: Doctor) {
    setEditingDoctor(doctor);
    setForm({
      fullName: doctor.fullName,
      email: doctor.email,
      password: "",
      clinicId: doctor.clinicId,
    });
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingDoctor) {
        await updateDoctor({
          doctorId: editingDoctor.id,
          fullName: form.fullName,
          email: form.email,
          clinicId: form.clinicId,
        });
        showSuccess("Doktor güncellendi.");
      } else {
        await createDoctor(form);
        showSuccess("Doktor oluşturuldu.");
      }

      setIsFormOpen(false);
      setEditingDoctor(null);
      setForm(emptyForm);
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "İşlem başarısız.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(doctor: Doctor) {
    try {
      await toggleDoctorStatus({
        doctorId: doctor.id,
        isActive: !doctor.isActive,
      });
      showSuccess("Durum güncellendi.");
      setSelectedDoctor(null);
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Durum güncellenemedi.");
    }
  }

  async function handleDelete(doctor: Doctor) {
    const approved = await confirm({
      title: "Doktoru kalıcı sil",
      description: `${doctor.fullName || doctor.email} kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      confirmLabel: "Kalıcı Sil",
      variant: "danger",
      requireText: "SİL",
    });

    if (!approved) return;

    try {
      await deleteDoctor(doctor.id);
      showSuccess("Doktor silindi.");
      setSelectedDoctor(null);
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Silme başarısız.");
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDoctor) return;

    setIsResettingPassword(true);

    try {
      await resetDoctorPassword(selectedDoctor.id, newPassword);
      showSuccess("Şifre güncellendi.");
      setIsPasswordOpen(false);
      setNewPassword("");
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Şifre güncellenemedi.");
    } finally {
      setIsResettingPassword(false);
    }
  }

  function openPhotoPreview(doctor: Doctor) {
    if (!doctor.profilePhotoUrl) return;
    setPreviewPhoto({
      src: doctor.profilePhotoUrl,
      alt: doctor.fullName || "Doktor profil fotoğrafı",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doktorlar"
        description="Doktor hesaplarını oluşturun, düzenleyin, şifre sıfırlayın veya yönetin."
        actions={
          <Button type="button" onClick={openCreateForm}>
            + Doktor Ekle
          </Button>
        }
      />

      <Card>
        <div className="flex w-full flex-col gap-3 md:flex-row md:max-w-xl">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Doktor adı, e-posta veya klinik ara..."
          />
          <Button type="button" variant="outline" onClick={reloadAll}>
            Yenile
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : filteredDoctors.length === 0 ? (
        <EmptyState title="Doktor bulunamadı" />
      ) : (
        <>
          <Card padding="sm" className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-6 py-4 font-medium">Doktor</th>
                    <th className="px-6 py-4 font-medium">E-posta</th>
                    <th className="px-6 py-4 font-medium">Klinik</th>
                    <th className="px-6 py-4 font-medium">Durum</th>
                    <th className="px-6 py-4 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map((doctor) => (
                    <tr key={doctor.id} className="border-t border-slate-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={doctor.fullName || doctor.email}
                            photoUrl={doctor.profilePhotoUrl}
                            size="sm"
                            onClick={
                              doctor.profilePhotoUrl
                                ? () => openPhotoPreview(doctor)
                                : undefined
                            }
                          />
                          <div>
                            <p className="font-semibold">{doctor.fullName || "-"}</p>
                            <p className="text-xs text-slate-500">{doctor.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{doctor.email}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {clinicNameById[doctor.clinicId] ?? doctor.clinicId ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge active={doctor.isActive} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDoctor(doctor)}
                          >
                            Detay
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openEditForm(doctor)}
                          >
                            Düzenle
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {!filtersActive && (
            <PaginationControls
              page={pagination.page}
              itemCount={filteredDoctors.length}
              pageSize={pagination.pageSize}
              hasNext={pagination.hasNext}
              hasPrevious={pagination.hasPrevious}
              isLoading={pagination.isLoading}
              onPrevious={() =>
                pagination.previousPage(
                  collection(db, "users"),
                  doctorQueryConstraints,
                  (doc) => mapDoctorDoc(doc)
                )
              }
              onNext={() =>
                pagination.nextPage(
                  collection(db, "users"),
                  doctorQueryConstraints,
                  (doc) => mapDoctorDoc(doc)
                )
              }
            />
          )}
        </>
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingDoctor ? "Doktor Düzenle" : "Doktor Ekle"}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" form="doctor-form" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </>
        }
      >
        <form id="doctor-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ad Soyad"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input
            label="E-posta"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          {!editingDoctor && (
            <Input
              label="Geçici Şifre"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          )}
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
        </form>
      </Modal>

      <Modal
        open={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        title="Doktor Detayı"
        description="Kullanıcı bilgileri ve yönetim işlemleri."
        footer={
          selectedDoctor && (
            <>
              <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(true)}>
                Şifre Sıfırla
              </Button>
              <Button
                type="button"
                onClick={() => handleToggleActive(selectedDoctor)}
              >
                {selectedDoctor.isActive ? "Pasifleştir" : "Aktifleştir"}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => handleDelete(selectedDoctor)}
              >
                Kalıcı Sil
              </Button>
            </>
          )
        }
      >
        {selectedDoctor && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar
                name={selectedDoctor.fullName || selectedDoctor.email}
                photoUrl={selectedDoctor.profilePhotoUrl}
                size="lg"
                onClick={
                  selectedDoctor.profilePhotoUrl
                    ? () => openPhotoPreview(selectedDoctor)
                    : undefined
                }
              />
              <div>
                <p className="text-lg font-bold">{selectedDoctor.fullName || "-"}</p>
                <p className="text-sm text-slate-500">{selectedDoctor.email}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <InfoRow label="ID" value={selectedDoctor.id} />
              <InfoRow
                label="Klinik"
                value={
                  clinicNameById[selectedDoctor.clinicId] ??
                  selectedDoctor.clinicId ??
                  "-"
                }
              />
              <InfoRow
                label="Durum"
                value={selectedDoctor.isActive ? "Aktif" : "Pasif"}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        title="Şifre Sıfırla"
        description="Doktor için yeni geçici şifre belirleyin."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              form="reset-password-form"
              disabled={isResettingPassword}
            >
              {isResettingPassword ? "Kaydediliyor..." : "Şifreyi Güncelle"}
            </Button>
          </>
        }
      >
        <form id="reset-password-form" onSubmit={handleResetPassword}>
          <Input
            label="Yeni Şifre"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
        </form>
      </Modal>

      <ImageLightbox
        open={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        src={previewPhoto?.src ?? ""}
        alt={previewPhoto?.alt ?? ""}
      />
    </div>
  );
}
