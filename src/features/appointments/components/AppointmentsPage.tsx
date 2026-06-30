"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import PaginationControls from "@/components/ui/PaginationControls";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createAppointment,
  deleteAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from "@/features/appointments/services/appointmentService";
import AppointmentCalendar from "@/features/appointments/components/AppointmentCalendar";
import { fetchAdminList, fetchLookups } from "@/lib/admin-list-api";
import { useAdminListQuery } from "@/hooks/useAdminListQuery";
import { AdminApiError } from "@/lib/admin-api";
import { formatDateTime, toDate } from "@/lib/format";
import { db } from "@/lib/firebase";
import {
  Appointment,
  AppointmentStatus,
  ClinicOption,
  Doctor,
  Patient,
} from "@/types/domain";

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

function statusLabel(status: AppointmentStatus) {
  if (status === "scheduled") return "Planlandı";
  if (status === "completed") return "Tamamlandı";
  return "İptal";
}

function statusClass(status: AppointmentStatus) {
  if (status === "scheduled") return "bg-blue-100 text-blue-700";
  if (status === "completed") return "bg-green-100 text-green-700";
  return "bg-red-100 text-red-700";
}

function toInputDateTime(value: unknown) {
  const date = toDate(value);
  if (!date) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export default function AppointmentsPage() {
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();

  const listQuery = useAdminListQuery<Appointment>("/api/admin/appointments/list");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [stats, setStats] = useState({ total: 0, scheduled: 0, completed: 0, cancelled: 0 });

  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);

  function buildFilters() {
    return {
      clinicId: clinicFilter || undefined,
      doctorId: doctorFilter || undefined,
      status: statusFilter || undefined,
      dateFrom: dateFilter || undefined,
    };
  }

  async function reloadAll() {
    await Promise.all([listQuery.reload(buildFilters()), loadStats()]);
  }

  async function loadCalendarData() {
    const response = await fetchAdminList<Appointment>("/api/admin/appointments/list", {
      month: calendarMonth,
      clinicId: clinicFilter || undefined,
      doctorId: doctorFilter || undefined,
      status: statusFilter || undefined,
    });

    setCalendarAppointments(response.items);
  }

  async function loadStats() {
    const ref = collection(db, "appointments");
    const [total, scheduled, completed, cancelled] = await Promise.all([
      getCountFromServer(ref),
      getCountFromServer(query(ref, where("status", "==", "scheduled"))),
      getCountFromServer(query(ref, where("status", "==", "completed"))),
      getCountFromServer(query(ref, where("status", "==", "cancelled"))),
    ]);

    setStats({
      total: total.data().count,
      scheduled: scheduled.data().count,
      completed: completed.data().count,
      cancelled: cancelled.data().count,
    });
  }

  async function loadReferenceData() {
    const lookups = await fetchLookups();
    setClinics(lookups.clinics);
    setDoctors(
      lookups.doctors.map((doctor) => ({
        ...doctor,
        role: "doctor",
      }))
    );

    const patientResponse = await fetchAdminList<Patient>("/api/admin/patients/list", {
      archived: "all",
      pageSize: 500,
    });

    setPatients(patientResponse.items);
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() =>
        Promise.all([loadReferenceData(), listQuery.reload(buildFilters()), loadStats()])
      )
      .catch(() => {
        if (!cancelled) showError("Randevular yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => listQuery.reload(buildFilters()))
      .catch(() => {
        if (!cancelled) showError("Randevu listesi güncellenemedi.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicFilter, doctorFilter, statusFilter, dateFilter]);

  useEffect(() => {
    if (viewMode !== "calendar") return;

    let cancelled = false;

    void Promise.resolve()
      .then(() => loadCalendarData())
      .catch(() => {
        if (!cancelled) showError("Takvim verisi yüklenemedi.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, calendarMonth, clinicFilter, doctorFilter, statusFilter]);

  const isLoading = initialLoading || listQuery.isLoading;
  const appointments = listQuery.items;

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

  const filteredPatientsForForm = useMemo(() => {
    if (!form.clinicId) return patients;
    return patients.filter((patient) => patient.clinicId === form.clinicId);
  }, [patients, form.clinicId]);

  const filteredDoctorsForForm = useMemo(() => {
    if (!form.clinicId) return doctors;
    return doctors.filter((doctor) => doctor.clinicId === form.clinicId);
  }, [doctors, form.clinicId]);

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const patient = patientMap[appointment.patientId];
      const doctor = doctorMap[appointment.doctorId];
      const appointmentDate = toDate(appointment.appointmentAt);

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
        patient?.tcKimlikNo?.toLowerCase().includes(term) ||
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        clinicId: form.clinicId,
        patientId: form.patientId,
        doctorId: form.doctorId,
        title: form.title.trim(),
        note: form.note.trim(),
        appointmentAt: form.appointmentAt,
        status: form.status,
        linkedTestId: form.linkedTestId.trim() || null,
      };

      if (editing) {
        await updateAppointment({ appointmentId: editing.id, ...payload });
        showSuccess("Randevu güncellendi.");
      } else {
        await createAppointment(payload);
        showSuccess("Randevu oluşturuldu.");
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

  async function handleStatusChange(
    appointment: Appointment,
    status: AppointmentStatus
  ) {
    const approved = await confirm({
      title: "Durum güncelle",
      description: `Randevu durumu "${statusLabel(status)}" olarak güncellensin mi?`,
      confirmLabel: "Güncelle",
    });

    if (!approved) return;

    try {
      await updateAppointmentStatus(appointment.id, status);
      showSuccess("Durum güncellendi.");
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Durum güncellenemedi.");
    }
  }

  async function handleDelete(appointment: Appointment) {
    const approved = await confirm({
      title: "Randevuyu sil",
      description: `"${appointment.title}" kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      variant: "danger",
    });

    if (!approved) return;

    try {
      await deleteAppointment(appointment.id);
      showSuccess("Randevu silindi.");
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Silme başarısız.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Randevular"
        description="Klinik randevularını planlayın, düzenleyin, durumlarını yönetin veya silin."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={viewMode === "list" ? "primary" : "outline"}
              onClick={() => setViewMode("list")}
            >
              Liste
            </Button>
            <Button
              type="button"
              variant={viewMode === "calendar" ? "primary" : "outline"}
              onClick={() => setViewMode("calendar")}
            >
              Takvim
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
                setFormOpen(true);
              }}
            >
              + Randevu Ekle
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Toplam", stats.total],
          ["Planlanan", stats.scheduled],
          ["Tamamlanan", stats.completed],
          ["İptal", stats.cancelled],
        ].map(([title, value]) => (
          <Card key={title as string}>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold">{value as number}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">
          <Input
            className="xl:col-span-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hasta, doktor, başlık veya not ara..."
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
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tüm durumlar</option>
            <option value="scheduled">Planlandı</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </Select>
          <Button type="button" variant="outline" onClick={() => {
            setSearch("");
            setClinicFilter("");
            setDoctorFilter("");
            setStatusFilter("");
            setDateFilter("");
          }}>
            Temizle
          </Button>
        </div>
        <div className="mt-3">
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
      </Card>

      {viewMode === "calendar" ? (
        <AppointmentCalendar
          appointments={calendarAppointments}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
        />
      ) : isLoading ? (
        <LoadingState />
      ) : filteredAppointments.length === 0 ? (
        <EmptyState title="Randevu bulunamadı" />
      ) : (
        <Card padding="sm" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Tarih</th>
                  <th className="p-4 font-medium">Randevu</th>
                  <th className="p-4 font-medium">Hasta</th>
                  <th className="p-4 font-medium">Doktor</th>
                  <th className="p-4 font-medium">Klinik</th>
                  <th className="p-4 font-medium">Durum</th>
                  <th className="p-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => {
                  const patient = patientMap[appointment.patientId];
                  const doctor = doctorMap[appointment.doctorId];

                  return (
                    <tr key={appointment.id} className="border-t border-slate-100">
                      <td className="p-4">{formatDateTime(appointment.appointmentAt)}</td>
                      <td>
                        <p className="font-semibold">{appointment.title}</p>
                        <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {appointment.note || "-"}
                        </p>
                      </td>
                      <td>
                        <p className="font-medium">{patient?.fullName ?? appointment.patientId}</p>
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
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
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
                            }}
                          >
                            Düzenle
                          </Button>
                          {appointment.status !== "completed" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(appointment, "completed")}
                            >
                              Tamamla
                            </Button>
                          )}
                          {appointment.status !== "cancelled" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(appointment, "cancelled")}
                            >
                              İptal
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(appointment)}
                          >
                            Sil
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {viewMode === "list" && (
        <PaginationControls
          page={listQuery.page}
          itemCount={filteredAppointments.length}
          pageSize={listQuery.pageSize}
          hasNext={listQuery.hasNext}
          hasPrevious={listQuery.hasPrevious}
          isLoading={listQuery.isLoading}
          onPrevious={() => listQuery.previousPage()}
          onNext={() => listQuery.nextPage()}
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Randevu Düzenle" : "Randevu Ekle"}
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              İptal
            </Button>
            <Button type="submit" form="appointment-form" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </>
        }
      >
        <form id="appointment-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Select
            label="Klinik"
            value={form.clinicId}
            onChange={(e) =>
              setForm({
                ...form,
                clinicId: e.target.value,
                patientId: "",
                doctorId: "",
              })
            }
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
            label="Tarih"
            type="datetime-local"
            value={form.appointmentAt}
            onChange={(e) => setForm({ ...form, appointmentAt: e.target.value })}
            required
          />
          <Select
            label="Hasta"
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            required
          >
            <option value="">Hasta seç</option>
            {filteredPatientsForForm.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.fullName} - {patient.tcKimlikNo}
              </option>
            ))}
          </Select>
          <Select
            label="Doktor"
            value={form.doctorId}
            onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
            required
          >
            <option value="">Doktor seç</option>
            {filteredDoctorsForForm.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName || doctor.email}
              </option>
            ))}
          </Select>
          <Input
            label="Başlık"
            className="md:col-span-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Select
            label="Durum"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as AppointmentStatus })
            }
          >
            <option value="scheduled">Planlandı</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </Select>
          <Input
            label="Bağlı Test ID"
            value={form.linkedTestId}
            onChange={(e) => setForm({ ...form, linkedTestId: e.target.value })}
          />
          <Textarea
            label="Not"
            className="md:col-span-2"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={4}
          />
        </form>
      </Modal>
    </div>
  );
}
