import { adminFetch } from "@/lib/admin-api";

export async function createPatient(body: Record<string, unknown>) {
  return adminFetch("/api/admin/patients/create", { body });
}

export async function updatePatient(body: Record<string, unknown>) {
  return adminFetch("/api/admin/patients/update", { body });
}

export async function togglePatientArchive(patientId: string, isArchived: boolean) {
  return adminFetch("/api/admin/patients/toggle-archive", {
    body: { patientId, isArchived },
  });
}

export async function deletePatient(patientId: string) {
  return adminFetch("/api/admin/patients/delete", { body: { patientId } });
}
