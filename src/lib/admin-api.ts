type AdminApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

export async function adminFetch<T = { message?: string }>(
  path: string,
  options: AdminApiOptions = {}
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  if (!response.ok) {
    throw new AdminApiError(
      data.message ?? "İşlem başarısız oldu.",
      response.status
    );
  }

  return data;
}

export async function createAdminSession(idToken: string) {
  return adminFetch("/api/auth/session", {
    method: "POST",
    body: { idToken },
  });
}

export async function destroyAdminSession() {
  return adminFetch("/api/auth/session", {
    method: "DELETE",
  });
}
