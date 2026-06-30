import { adminFetch } from "@/lib/admin-api";

export async function createDoctor(body: {
  fullName: string;
  email: string;
  password: string;
  clinicId: string;
}) {
  return adminFetch("/api/admin/doctors/create", { body });
}

export async function updateDoctor(body: {
  doctorId: string;
  fullName: string;
  email: string;
  clinicId: string;
}) {
  return adminFetch("/api/admin/doctors/update", { body });
}

export async function toggleDoctorStatus(body: {
  doctorId: string;
  isActive: boolean;
}) {
  return adminFetch("/api/admin/doctors/toggle-status", { body });
}

export async function deleteDoctor(doctorId: string) {
  return adminFetch("/api/admin/doctors/delete", { body: { doctorId } });
}

export async function resetDoctorPassword(doctorId: string, password: string) {
  return adminFetch("/api/admin/doctors/reset-password", {
    body: { doctorId, password },
  });
}
