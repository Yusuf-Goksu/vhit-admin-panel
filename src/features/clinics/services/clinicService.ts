import { adminFetch } from "@/lib/admin-api";

export async function createClinic(body: {
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}) {
  return adminFetch("/api/admin/clinics/create", { body });
}

export async function updateClinic(body: {
  clinicId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}) {
  return adminFetch("/api/admin/clinics/update", { body });
}

export async function toggleClinicStatus(clinicId: string, isActive: boolean) {
  return adminFetch("/api/admin/clinics/toggle-status", {
    body: { clinicId, isActive },
  });
}

export async function deleteClinic(clinicId: string) {
  return adminFetch("/api/admin/clinics/delete", { body: { clinicId } });
}
