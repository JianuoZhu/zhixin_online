export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type ApiBody = BodyInit | Record<string, unknown> | null;
type FetchOptions = Omit<RequestInit, "body"> & { token?: string; body?: ApiBody };

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isJsonBody =
    body !== undefined &&
    body !== null &&
    typeof body === "object" &&
    !isFormData &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(body) &&
    !(typeof ReadableStream !== "undefined" && body instanceof ReadableStream);

  const finalHeaders = new Headers(headers);

  if (isJsonBody && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: isJsonBody ? JSON.stringify(body) : body,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.detail || response.statusText;
    throw new ApiError(response.status, message, payload?.detail);
  }

  return payload as T;
}
