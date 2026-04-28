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
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type AppointmentStatus = "scheduled" | "completed" | "cancelled";

type Appointment = {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  title: string;
  note: string;
  appointmentAt: any;
  status: AppointmentStatus;
  linkedTestId?: string;
};

type Patient = {
  id: string;
  fullName: string;
  patientCode: string;
  clinicId: string;
};

type Doctor = {
  id: string;
  fullName: string;
  email: string;
  clinicId: string;
};

type Clinic = {
  id: string;
  name: string;
};

const emptyForm = {
  clinicId: "",
  patientId: "",
  doctorId: "",
  title: "",
  note: "",
  appointmentAt: "",
  status: "scheduled" as AppointmentStatus,
  linkedTestId: "",
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    setIsLoading(true);

    try {
      const [appointmentsSnap, patientsSnap, doctorsSnap, clinicsSnap] =
        await Promise.all([
          getDocs(
            query(
              collection(db, "appointments"),
              orderBy("appointmentAt", "desc")
            )
          ),
          getDocs(collection(db, "patients")),
          getDocs(query(collection(db, "users"), where("role", "==", "doctor"))),
          getDocs(collection(db, "clinics")),
        ]);

      setAppointments(
        appointmentsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            clinicId: data.clinicId ?? "",
            patientId: data.patientId ?? "",
            doctorId: data.doctorId ?? "",
            title: data.title ?? "",
            note: data.note ?? "",
            appointmentAt: data.appointmentAt,
            status: data.status ?? "scheduled",
            linkedTestId: data.linkedTestId ?? "",
          };
        })
      );

      setPatients(
        patientsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            fullName: data.fullName ?? "",
            patientCode: data.patientCode ?? "",
            clinicId: data.clinicId ?? "",
          };
        })
      );

      setDoctors(
        doctorsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            fullName: data.fullName ?? "",
            email: data.email ?? "",
            clinicId: data.clinicId ?? "",
          };
        })
      );

      setClinics(
        clinicsSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            name: data.name ?? item.id,
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

  const patientMap = useMemo(() => {
    return Object.fromEntries(patients.map((p) => [p.id, p]));
  }, [patients]);

  const doctorMap = useMemo(() => {
    return Object.fromEntries(doctors.map((d) => [d.id, d]));
  }, [doctors]);

  const clinicMap = useMemo(() => {
    return Object.fromEntries(clinics.map((c) => [c.id, c.name]));
  }, [clinics]);

  const filteredPatientsForForm = useMemo(() => {
    if (!form.clinicId) return patients;
    return patients.filter((p) => p.clinicId === form.clinicId);
  }, [patients, form.clinicId]);

  const filteredDoctorsForForm = useMemo(() => {
    if (!form.clinicId) return doctors;
    return doctors.filter((d) => d.clinicId === form.clinicId);
  }, [doctors, form.clinicId]);

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const patient = patientMap[appointment.patientId];
      const doctor = doctorMap[appointment.doctorId];
      const appointmentDate = appointment.appointmentAt?.toDate?.();

      if (clinicFilter && appointment.clinicId !== clinicFilter) return false;
      if (doctorFilter && appointment.doctorId !== doctorFilter) return false;
      if (statusFilter && appointment.status !== statusFilter) return false;

      if (dateFilter && appointmentDate) {
        const selected = new Date(dateFilter);
        const start = new Date(selected);
        start.setHours(0, 0, 0, 0);

        const end = new Date(selected);
        end.setHours(23, 59, 59, 999);

        if (appointmentDate < start || appointmentDate > end) return false;
      }

      if (!term) return true;

      return (
        appointment.title.toLowerCase().includes(term) ||
        appointment.note.toLowerCase().includes(term) ||
        patient?.fullName?.toLowerCase().includes(term) ||
        patient?.patientCode?.toLowerCase().includes(term) ||
        doctor?.fullName?.toLowerCase().includes(term)
      );
    });
  }, [
    appointments,
    search,
    clinicFilter,
    doctorFilter,
    statusFilter,
    dateFilter,
    patientMap,
    doctorMap,
  ]);

  function formatDate(value: any) {
    return value?.toDate?.().toLocaleString("tr-TR") ?? "-";
  }

  function toInputDateTime(value: any) {
    const date = value?.toDate?.();
    if (!date) return "";

    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }

  function statusLabel(status: AppointmentStatus) {
    if (status === "scheduled") return "Planlandı";
    if (status === "completed") return "Tamamlandı";
    if (status === "cancelled") return "İptal";
    return status;
  }

  function statusClass(status: AppointmentStatus) {
    if (status === "scheduled") return "bg-blue-100 text-blue-700";
    if (status === "completed") return "bg-green-100 text-green-700";
    return "bg-red-100 text-red-700";
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(appointment: Appointment) {
    setEditing(appointment);
    setForm({
      clinicId: appointment.clinicId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      title: appointment.title,
      note: appointment.note,
      appointmentAt: toInputDateTime(appointment.appointmentAt),
      status: appointment.status,
      linkedTestId: appointment.linkedTestId ?? "",
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

    if (
      !form.clinicId ||
      !form.patientId ||
      !form.doctorId ||
      !form.title.trim() ||
      !form.appointmentAt
    ) {
      alert("Klinik, hasta, doktor, başlık ve tarih zorunludur.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        clinicId: form.clinicId,
        patientId: form.patientId,
        doctorId: form.doctorId,
        title: form.title.trim(),
        note: form.note.trim(),
        appointmentAt: Timestamp.fromDate(new Date(form.appointmentAt)),
        status: form.status,
        linkedTestId: form.linkedTestId.trim() || null,
        updatedAt: serverTimestamp(),
      };

      if (editing) {
        await updateDoc(doc(db, "appointments", editing.id), payload);
      } else {
        await addDoc(collection(db, "appointments"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      closeForm();
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(
    appointment: Appointment,
    status: AppointmentStatus
  ) {
    const confirmed = window.confirm(
      `Randevu durumu "${statusLabel(status)}" olarak güncellensin mi?`
    );

    if (!confirmed) return;

    await updateDoc(doc(db, "appointments", appointment.id), {
      status,
      updatedAt: serverTimestamp(),
    });

    await loadData();
  }

  function resetFilters() {
    setSearch("");
    setClinicFilter("");
    setDoctorFilter("");
    setStatusFilter("");
    setDateFilter("");
  }

  return (
    <div className="text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Randevular</h1>
          <p className="mt-1 text-sm text-slate-500">
            Klinik randevularını planlayın, takip edin ve yönetin.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          + Randevu Ekle
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Toplam" value={appointments.length} />
        <StatCard
          title="Planlanan"
          value={appointments.filter((a) => a.status === "scheduled").length}
        />
        <StatCard
          title="Tamamlanan"
          value={appointments.filter((a) => a.status === "completed").length}
        />
        <StatCard
          title="İptal"
          value={appointments.filter((a) => a.status === "cancelled").length}
        />
      </div>

      <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hasta, doktor, başlık veya not ara..."
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 md:col-span-2"
          />

          <select
            value={clinicFilter}
            onChange={(e) => setClinicFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Tüm klinikler</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>

          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Tüm doktorlar</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName || doctor.email}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Tüm durumlar</option>
            <option value="scheduled">Planlandı</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </select>

          <button
            onClick={resetFilters}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Temizle
          </button>
        </div>

        <div className="mt-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 md:w-auto"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-500">Randevular yükleniyor...</p>
      ) : filteredAppointments.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-slate-500 shadow-sm">
          Randevu bulunamadı.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-4">Tarih</th>
                <th>Randevu</th>
                <th>Hasta</th>
                <th>Doktor</th>
                <th>Klinik</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredAppointments.map((appointment) => {
                const patient = patientMap[appointment.patientId];
                const doctor = doctorMap[appointment.doctorId];

                return (
                  <tr key={appointment.id} className="border-t">
                    <td className="p-4">{formatDate(appointment.appointmentAt)}</td>

                    <td>
                      <p className="font-semibold">{appointment.title}</p>
                      <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                        {appointment.note || "-"}
                      </p>
                    </td>

                    <td>
                      <p className="font-medium">
                        {patient?.fullName ?? appointment.patientId}
                      </p>
                      <p className="text-xs text-slate-500">
                        {patient?.patientCode ?? "-"}
                      </p>
                    </td>

                    <td>{doctor?.fullName ?? appointment.doctorId}</td>
                    <td>{clinicMap[appointment.clinicId] ?? appointment.clinicId}</td>

                    <td>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                          appointment.status
                        )}`}
                      >
                        {statusLabel(appointment.status)}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEdit(appointment)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Düzenle
                        </button>

                        {appointment.status !== "completed" && (
                          <button
                            onClick={() => updateStatus(appointment, "completed")}
                            className="text-xs font-semibold text-green-600 hover:text-green-800"
                          >
                            Tamamla
                          </button>
                        )}

                        {appointment.status !== "cancelled" && (
                          <button
                            onClick={() => updateStatus(appointment, "cancelled")}
                            className="text-xs font-semibold text-red-600 hover:text-red-800"
                          >
                            İptal
                          </button>
                        )}

                        {appointment.linkedTestId && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                            Test bağlı
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold">
              {editing ? "Randevu Düzenle" : "Randevu Ekle"}
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={form.clinicId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    clinicId: e.target.value,
                    patientId: "",
                    doctorId: "",
                  })
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Klinik seç</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={form.appointmentAt}
                onChange={(e) =>
                  setForm({ ...form, appointmentAt: e.target.value })
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />

              <select
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Hasta seç</option>
                {filteredPatientsForForm.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} - {patient.patientCode}
                  </option>
                ))}
              </select>

              <select
                value={form.doctorId}
                onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Doktor seç</option>
                {filteredDoctorsForForm.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.fullName || doctor.email}
                  </option>
                ))}
              </select>

              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Randevu başlığı"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 md:col-span-2"
              />

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as AppointmentStatus,
                  })
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="scheduled">Planlandı</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal</option>
              </select>

              <input
                value={form.linkedTestId}
                onChange={(e) =>
                  setForm({ ...form, linkedTestId: e.target.value })
                }
                placeholder="Bağlı test ID (opsiyonel)"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />

              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Not"
                className="min-h-24 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 md:col-span-2"
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

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}