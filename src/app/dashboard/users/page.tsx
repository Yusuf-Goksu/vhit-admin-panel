"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  updateDoc,
  where,
  DocumentData,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

const PAGE_SIZE = 25;

type Doctor = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  clinicId: string;
  isActive: boolean;
};

type ClinicOption = {
  id: string;
  name: string;
};

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

export default function UsersPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [searchText, setSearchText] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<DoctorForm>(emptyForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function loadClinics() {
    const q = query(
      collection(db, "clinics"),
      where("isActive", "==", true),
      orderBy("name")
    );

    const snapshot = await getDocs(q);

    setClinics(
      snapshot.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          name: data.name ?? item.id,
        };
      })
    );
  }

  async function loadDoctors(reset = true) {
    reset ? setIsLoading(true) : setIsLoadingMore(true);

    try {
      const constraints = [
        where("role", "==", "doctor"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE),
      ];

      if (!reset && lastDoc) {
        constraints.splice(2, 0, startAfter(lastDoc) as any);
      }

      const q = query(collection(db, "users"), ...(constraints as any));
      const snapshot = await getDocs(q);

      const list: Doctor[] = snapshot.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          fullName: data.fullName ?? "",
          email: data.email ?? "",
          role: data.role ?? "doctor",
          clinicId: data.clinicId ?? "",
          isActive: data.isActive ?? true,
        };
      });

      setDoctors((prev) => (reset ? list : [...prev, ...list]));
      setLastDoc(snapshot.docs.at(-1) ?? null);
    } catch (error) {
      console.error("Doctor fetch error:", error);
      alert(
        "Doktorlar yüklenemedi. Firestore index gerekiyorsa Firebase Console'daki index linkini oluştur."
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    loadClinics();
    loadDoctors(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDoctors = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) return doctors;

    return doctors.filter((doctor) => {
      return (
        doctor.fullName.toLowerCase().includes(term) ||
        doctor.email.toLowerCase().includes(term) ||
        doctor.clinicId.toLowerCase().includes(term)
      );
    });
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

  function closeForm() {
    setIsFormOpen(false);
    setEditingDoctor(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (!form.fullName.trim()) {
        alert("Ad soyad zorunlu.");
        return;
      }

      if (!form.email.trim()) {
        alert("Email zorunlu.");
        return;
      }

      if (!form.clinicId.trim()) {
        alert("Klinik seçimi zorunlu.");
        return;
      }

      if (editingDoctor) {
        const response = await fetch("/api/admin/doctors/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            doctorId: editingDoctor.id,
            fullName: form.fullName,
            email: form.email,
            clinicId: form.clinicId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Doktor güncellenemedi.");
        }
      } else {
        if (!form.password.trim()) {
          alert("Yeni doktor için şifre zorunlu.");
          return;
        }

        const response = await fetch("/api/admin/doctors/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            clinicId: form.clinicId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Doktor oluşturulamadı.");
        }
      }

      closeForm();
      await loadDoctors(true);
    } catch (error: any) {
      alert(error?.message ?? "İşlem başarısız.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleDoctorActive(doctor: Doctor) {
    try {
      const response = await fetch("/api/admin/doctors/toggle-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: doctor.id,
          isActive: !doctor.isActive,
          changedBy: auth.currentUser?.uid ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Durum güncellenemedi.");
      }

      setSelectedDoctor(null);
      await loadDoctors(true);
    } catch (error: any) {
      alert(error?.message ?? "Durum güncellenemedi.");
    }
  }

  async function hardDeleteDoctor(doctor: Doctor) {
    const firstConfirm = window.confirm(
      `${doctor.fullName || doctor.email} kalıcı olarak silinecek. Bu işlem geri alınamaz.`
    );

    if (!firstConfirm) return;

    const typed = window.prompt("Kalıcı silmek için SİL yaz.");
    if (typed !== "SİL") return;

    try {
      const response = await fetch("/api/admin/doctors/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: doctor.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Kalıcı silme başarısız.");
      }

      setSelectedDoctor(null);
      await loadDoctors(true);
    } catch (error: any) {
      alert(error?.message ?? "Doktor kalıcı olarak silinemedi.");
    }
  }

  const clinicNameById = useMemo(() => {
    return Object.fromEntries(clinics.map((clinic) => [clinic.id, clinic.name]));
  }, [clinics]);

  const canLoadMore = !!lastDoc && !searchText.trim();

  return (
    <div className="text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Doktorlar</h1>
          <p className="mt-2 text-slate-600">
            Doktor hesaplarını oluşturun, düzenleyin, pasifleştirin veya kalıcı silin.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Doktor Ekle
        </button>
      </div>

      <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex w-full gap-2 md:max-w-xl">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Doktor adı, e-posta veya klinik ara..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
          />

          <button
            onClick={() => loadDoctors(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Yenile
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-500">Yükleniyor...</p>
      ) : filteredDoctors.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-slate-500 shadow-sm">
          Doktor bulunamadı.
        </div>
      ) : (
        <>
          <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-sm text-slate-900">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-6 py-4 font-medium text-slate-600">Doktor</th>
                  <th className="px-6 py-4 font-medium text-slate-600">Email</th>
                  <th className="px-6 py-4 font-medium text-slate-600">Klinik</th>
                  <th className="px-6 py-4 font-medium text-slate-600">Durum</th>
                  <th className="px-6 py-4 font-medium text-slate-600">İşlem</th>
                </tr>
              </thead>

              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{doctor.fullName || "-"}</p>
                    </td>

                    <td className="px-6 py-4 text-slate-600">{doctor.email}</td>

                    <td className="px-6 py-4 text-slate-600">
                      {clinicNameById[doctor.clinicId] ?? doctor.clinicId ?? "-"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          doctor.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {doctor.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedDoctor(doctor)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Detay
                        </button>

                        <button
                          onClick={() => openEditForm(doctor)}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Düzenle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canLoadMore && (
            <div className="mt-6 flex justify-center">
              <button
                disabled={isLoadingMore}
                onClick={() => loadDoctors(false)}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm disabled:opacity-50"
              >
                {isLoadingMore ? "Yükleniyor..." : "Daha Fazla Yükle"}
              </button>
            </div>
          )}
        </>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 text-slate-900 shadow-xl"
          >
            <h2 className="text-xl font-bold">
              {editingDoctor ? "Doktor Düzenle" : "Doktor Ekle"}
            </h2>

            <div className="mt-6 space-y-4">
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Ad soyad"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none"
                required
              />

              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                type="email"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none"
                required
              />

              {!editingDoctor && (
                <input
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Geçici şifre"
                  type="password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none"
                  required
                />
              )}

              <select
                value={form.clinicId}
                onChange={(e) => setForm({ ...form, clinicId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none"
                required
              >
                <option value="">Klinik seç</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold"
              >
                Vazgeç
              </button>

              <button
                disabled={isSaving}
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-slate-900 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Doktor Detayı</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Kullanıcı bilgileri ve yönetim işlemleri.
                </p>
              </div>

              <button
                onClick={() => setSelectedDoctor(null)}
                className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <InfoRow label="ID" value={selectedDoctor.id} />
              <InfoRow label="Ad Soyad" value={selectedDoctor.fullName || "-"} />
              <InfoRow label="Email" value={selectedDoctor.email || "-"} />
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

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={() => toggleDoctorActive(selectedDoctor)}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white md:col-span-2"
              >
                {selectedDoctor.isActive ? "Pasifleştir" : "Aktifleştir"}
              </button>

              <button
                onClick={() => hardDeleteDoctor(selectedDoctor)}
                className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white md:col-span-2"
              >
                Kalıcı Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 font-semibold text-slate-500">{label}</span>
      <span className="break-all text-slate-900">{value}</span>
    </div>
  );
}