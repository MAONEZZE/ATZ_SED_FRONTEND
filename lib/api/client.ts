import { env } from "@/lib/env";
import type { ApiErrorBody } from "@/lib/api/types";

export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;

  constructor(status: number, message: string, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
  }
}

export interface TokenProvider {
  getAccessToken(): Promise<string | null>;

  refreshAccessToken(): Promise<string | null>;

  onUnauthorized(): void;
}

let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function parseErrorMessage(body: ApiErrorBody | null, fallback: string): string {
  if (!body) return fallback;
  if (Array.isArray(body.message)) return body.message.join("; ");
  return body.message ?? fallback;
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;

  skipAuth?: boolean;
}

async function buildHeaders(
  options: ApiFetchOptions,
  token: string | null,
): Promise<Headers> {
  const headers = new Headers(options.headers);
  headers.set("x-request-id", generateRequestId());
  if (token && !options.skipAuth) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

async function doFetch(
  path: string,
  options: ApiFetchOptions,
  token: string | null,
): Promise<Response> {
  const headers = await buildHeaders(options, token);
  const { body, skipAuth, ...rest } = options;
  void skipAuth;
  return fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...rest,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
}

async function rawApiFetch(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const token = options.skipAuth
    ? null
    : ((await tokenProvider?.getAccessToken()) ?? null);

  let response = await doFetch(path, options, token);

  if (response.status === 401 && !options.skipAuth && tokenProvider) {
    const refreshed = await tokenProvider.refreshAccessToken();
    if (refreshed) {
      response = await doFetch(path, options, refreshed);
    }
    if (response.status === 401) {
      tokenProvider.onUnauthorized();
    }
  }

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {}
    throw new ApiError(
      response.status,
      parseErrorMessage(errorBody, response.statusText),
      errorBody?.requestId ?? response.headers.get("x-request-id") ?? undefined,
    );
  }

  return response;
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const response = await rawApiFetch(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      response.status,
      "Resposta inválida do servidor",
      response.headers.get("x-request-id") ?? undefined,
    );
  }
}

export async function apiFetchBlob(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Blob> {
  const response = await rawApiFetch(path, options);
  return response.blob();
}

export const api = {
  get: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = void>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
