import { adminFetch } from "@/lib/admin-api";

export async function deleteTest(testId: string) {
  return adminFetch("/api/admin/tests/delete", { body: { testId } });
}
