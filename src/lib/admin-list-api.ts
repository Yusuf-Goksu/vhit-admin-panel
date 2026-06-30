import { adminFetch } from "@/lib/admin-api";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export type AdminListResponse<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
};

export type AdminListParams = Record<string, string | number | boolean | null | undefined>;

function buildQuery(path: string, params?: AdminListParams) {
  if (!params) return path;

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export async function fetchAdminList<T>(
  path: string,
  params?: AdminListParams
): Promise<AdminListResponse<T>> {
  return adminFetch<AdminListResponse<T>>(buildQuery(path, params), { method: "GET" });
}

export async function fetchLookups(clinicId?: string) {
  return adminFetch<{
    clinics: { id: string; name: string }[];
    doctors: {
      id: string;
      fullName: string;
      email: string;
      clinicId: string;
      isActive: boolean;
    }[];
  }>(buildQuery("/api/admin/lookups", { clinicId }), { method: "GET" });
}

export async function fetchClinicDetail(clinicId: string) {
  return adminFetch<{
    clinic: {
      id: string;
      name: string;
      email: string;
      phone: string;
      address: string;
      isActive: boolean;
      createdAt: string | null;
    };
    stats: {
      doctors: number;
      activeDoctors: number;
      patients: number;
      tests: number;
      appointments: number;
    };
    doctors: {
      id: string;
      fullName: string;
      email: string;
      isActive: boolean;
    }[];
  }>(`/api/admin/clinics/${clinicId}`, { method: "GET" });
}

export const DEFAULT_LIST_PAGE_SIZE = DEFAULT_PAGE_SIZE;
