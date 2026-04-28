"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

type Clinic = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
};

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    isActive: true,
  });

  async function loadClinics() {
    setLoading(true);

    const snapshot = await getDocs(collection(db, "clinics"));

    const list: Clinic[] = snapshot.docs.map((docItem) => {
      const data = docItem.data();

      return {
        id: docItem.id,
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        isActive: data.isActive ?? true,
      };
    });

    setClinics(list);
    setLoading(false);
  }

  useEffect(() => {
    loadClinics();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return clinics.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
    );
  }, [clinics, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      isActive: true,
    });
    setFormOpen(true);
  }

  function openEdit(clinic: Clinic) {
    setEditing(clinic);
    setForm({
      name: clinic.name,
      email: clinic.email,
      phone: clinic.phone,
      address: clinic.address,
      isActive: clinic.isActive,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Klinik adı zorunlu");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      isActive: form.isActive,
      updatedBy: auth.currentUser?.uid ?? null,
      updatedAt: serverTimestamp(),
    };

    if (editing) {
      await updateDoc(doc(db, "clinics", editing.id), payload);
    } else {
      await addDoc(collection(db, "clinics"), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }

    closeForm();
    await loadClinics();
  }

  async function toggleActive(clinic: Clinic) {
    await updateDoc(doc(db, "clinics", clinic.id), {
      isActive: !clinic.isActive,
      updatedBy: auth.currentUser?.uid ?? null,
      updatedAt: serverTimestamp(),
    });

    await loadClinics();
  }

  return (
    <div className="text-slate-900">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Klinikler</h1>
          <p className="text-sm text-slate-500 mt-1">
            Klinik yönetimi
          </p>
        </div>

        <button
          onClick={openCreate}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm"
        >
          + Klinik Ekle
        </button>
      </div>

      {/* SEARCH */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Klinik ara..."
          className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none"
        />
      </div>

      {/* TABLE */}
      {loading ? (
        <p className="mt-6 text-slate-500">Yükleniyor...</p>
      ) : (
        <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 text-left">Klinik</th>
                <th className="p-4 text-left">İletişim</th>
                <th className="p-4 text-left">Durum</th>
                <th className="p-4"></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-4">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.address}
                    </p>
                  </td>

                  <td className="p-4 text-slate-600">
                    <p>{c.email}</p>
                    <p className="text-xs">{c.phone}</p>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        c.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>

                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-blue-600 text-xs"
                    >
                      Düzenle
                    </button>

                    <button
                      onClick={() => toggleActive(c)}
                      className="text-red-600 text-xs"
                    >
                      {c.isActive ? "Pasif Yap" : "Aktif Yap"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl w-[420px]"
          >
            <h2 className="font-bold mb-4 text-lg">
              {editing ? "Klinik Düzenle" : "Klinik Ekle"}
            </h2>

            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Klinik adı"
                className="w-full border p-2 rounded"
              />

              <input
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="Email"
                className="w-full border p-2 rounded"
              />

              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="Telefon"
                className="w-full border p-2 rounded"
              />

              <textarea
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                placeholder="Adres"
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm border rounded"
              >
                İptal
              </button>

              <button className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}