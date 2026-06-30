import { adminFetch } from "@/lib/admin-api";
import { AppointmentStatus } from "@/types/domain";

export async function createAppointment(body: Record<string, unknown>) {
  return adminFetch("/api/admin/appointments/create", { body });
}

export async function updateAppointment(body: Record<string, unknown>) {
  return adminFetch("/api/admin/appointments/update", { body });
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
) {
  return adminFetch("/api/admin/appointments/update-status", {
    body: { appointmentId, status },
  });
}

export async function deleteAppointment(appointmentId: string) {
  return adminFetch("/api/admin/appointments/delete", { body: { appointmentId } });
}
