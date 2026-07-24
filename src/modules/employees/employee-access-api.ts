export interface EmployeeAccessApiResponse {
  error?: string;
  message?: string;
  access?: unknown;
  temporaryPassword?: string;
}

class EmployeeAccessResponseError extends Error {}

function getEmployeeAccessEndpoints() {
  const configuredEndpoint = import.meta.env.VITE_EMPLOYEE_ACCESS_API_URL?.trim();
  return Array.from(new Set([
    configuredEndpoint,
    "/api/manage-employee-access",
    "/.netlify/functions/manage-employee-access",
  ].filter(Boolean))) as string[];
}

function getConnectionError() {
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return localHost
    ? "Server lokal tidak terhubung ke layanan akun portal. Pastikan aplikasi dijalankan dengan npm run dev, lalu muat ulang halaman."
    : "Layanan akun portal belum tersedia pada server aplikasi. Muat ulang halaman atau periksa deployment fungsi server.";
}

export async function requestEmployeeAccess<T extends EmployeeAccessApiResponse>(
  body: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  let reachedJsonEndpoint = false;

  for (const endpoint of getEmployeeAccessEndpoints()) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) continue;

      reachedJsonEndpoint = true;
      const result = await response.json() as T;
      if (!response.ok) {
        throw new EmployeeAccessResponseError(result.error || `Layanan akun portal merespons dengan status ${response.status}.`);
      }
      return result;
    } catch (error) {
      if (error instanceof EmployeeAccessResponseError) throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw new Error(reachedJsonEndpoint
    ? "Respons layanan akun portal tidak dapat diproses."
    : getConnectionError());
}
