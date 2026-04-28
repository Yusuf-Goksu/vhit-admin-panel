"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

type Patient = {
  id: string;
  clinicId: string;
  patientCode: string;
  fullName: string;
  birthDate: string;
  gender: string;
  phone: string;
  notes: string;
  isArchived: boolean;
};

type Clinic = {
  id: string;
  name: string;
};

const emptyForm = {
  fullName: "",
  patientCode: "",
  clinicId: "",
  birthDate: "",
  gender: "",
  phone: "",
  notes: "",
};

export default function PatientsPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  const [search, setSearch] = useState("");
  const [selectedClinic, setSelectedClinic] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    setIsLoading(true);

    try {
      const clinicSnap = await getDocs(
        query(collection(db, "clinics"), orderBy("name"))
      );

      setClinics(
        clinicSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? d.id,
        }))
      );

      const patientSnap = await getDocs(
        query(collection(db, "patients"), orderBy("createdAt", "desc"))
      );

      setPatients(
        patientSnap.docs.map((d) => {
          const data = d.data();

          return {
            id: d.id,
            clinicId: data.clinicId ?? "",
            patientCode: data.patientCode ?? "",
            fullName: data.fullName ?? "",
            birthDate: data.birthDate?.toDate?.()
              ? data.birthDate.toDate().toISOString().slice(0, 10)
              : "",
            gender: data.gender ?? "",
            phone: data.phone ?? "",
            notes: data.notes ?? "",
            isArchived: data.isArchived ?? false,
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

  const clinicMap = useMemo(() => {
    return Object.fromEntries(clinics.map((c) => [c.id, c.name]));
  }, [clinics]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return patients.filter((patient) => {
      if (!showArchived && patient.isArchived) return false;
      if (selectedClinic && patient.clinicId !== selectedClinic) return false;

      return (
        patient.fullName.toLowerCase().includes(term) ||
        patient.patientCode.toLowerCase().includes(term) ||
        patient.phone.toLowerCase().includes(term)
      );
    });
  }, [patients, search, selectedClinic, showArchived]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(patient: Patient) {
    setEditing(patient);
    setForm({
      fullName: patient.fullName,
      patientCode: patient.patientCode,
      clinicId: patient.clinicId,
      birthDate: patient.birthDate,
      gender: patient.gender,
      phone: patient.phone,
      notes: patient.notes,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const userId = auth.currentUser?.uid;

    if (!userId) {
      alert("Oturum bulunamadı.");
      return;
    }

    if (!form.fullName.trim() || !form.patientCode.trim() || !form.clinicId) {
      alert("Ad soyad, hasta kodu ve klinik zorunludur.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        clinicId: form.clinicId,
        patientCode: form.patientCode.trim(),
        fullName: form.fullName.trim(),
        birthDate: form.birthDate
          ? Timestamp.fromDate(new Date(form.birthDate))
          : null,
        gender: form.gender,
        phone: form.phone.trim(),
        notes: form.notes.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editing) {
        await updateDoc(doc(db, "patients", editing.id), {
          ...payload,
          updatedBy: userId,
        });
      } else {
        await addDoc(collection(db, "patients"), {
          ...payload,
          isArchived: false,
          createdBy: userId,
          updatedBy: null,
          createdAt: serverTimestamp(),
        });
      }

      closeForm();
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleArchive(patient: Patient) {
    const confirmed = window.confirm(
      patient.isArchived
        ? "Hasta arşivden çıkarılsın mı?"
        : "Hasta arşivlensin mi?"
    );

    if (!confirmed) return;

    await updateDoc(doc(db, "patients", patient.id), {
      isArchived: !patient.isArchived,
      updatedBy: auth.currentUser?.uid ?? null,
      updatedAt: serverTimestamp(),
    });

    await loadData();
  }

  return (
    <div className="text-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hastalar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hasta kayıtlarını yönetin.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          + Hasta Ekle
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center">
        <input
          placeholder="Hasta adı, kodu veya telefon ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
        />

        <select
          value={selectedClinic}
          onChange={(e) => setSelectedClinic(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">Tüm Klinikler</option>
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </select>

        <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Arşivleri göster
        </label>
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-500">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-slate-500 shadow-sm">
          Hasta bulunamadı.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-4">Hasta</th>
                <th>Kod</th>
                <th>Klinik</th>
                <th>Telefon</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((patient) => (
                <tr key={patient.id} className="border-t">
                  <td className="p-4">
                    <button
                      onClick={() =>
                        router.push(`/dashboard/patients/${patient.id}`)
                      }
                      className="font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {patient.fullName}
                    </button>
                    <p className="mt-1 text-xs text-slate-500">
                      {patient.gender || "-"}
                    </p>
                  </td>

                  <td>{patient.patientCode}</td>
                  <td>{clinicMap[patient.clinicId] ?? patient.clinicId}</td>
                  <td>{patient.phone || "-"}</td>

                  <td>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        patient.isArchived
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {patient.isArchived ? "Arşiv" : "Aktif"}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEdit(patient)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Düzenle
                      </button>

                      <button
                        onClick={() => toggleArchive(patient)}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-800"
                      >
                        {patient.isArchived ? "Geri Al" : "Arşivle"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold">
              {editing ? "Hasta Düzenle" : "Hasta Ekle"}
            </h2>

            <div className="mt-5 space-y-3">
              <input
                placeholder="Ad Soyad"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />

              <input
                placeholder="Hasta Kodu"
                value={form.patientCode}
                onChange={(e) =>
                  setForm({ ...form, patientCode: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />

              <select
                value={form.clinicId}
                onChange={(e) =>
                  setForm({ ...form, clinicId: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Klinik seç</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={form.birthDate}
                onChange={(e) =>
                  setForm({ ...form, birthDate: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />

              <select
                value={form.gender}
                onChange={(e) =>
                  setForm({ ...form, gender: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Cinsiyet seç</option>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="other">Diğer</option>
              </select>

              <input
                placeholder="Telefon"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />

              <textarea
                placeholder="Notlar"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                İptal
              </button>

              <button
                disabled={isSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}