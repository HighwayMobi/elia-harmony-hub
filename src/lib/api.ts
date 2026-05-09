// Axios instance for Supabase Edge Functions with automatic token refresh
// on 401 responses. On refresh failure, redirects to /login.

import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { supabase } from "@/integrations/supabase/client";
import { getFTSession, setFTSession, clearFTSession } from "./ft-auth";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export const api = axios.create({
  baseURL: FUNCTIONS_URL,
});

// Attach Supabase auth header on every request
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const authToken = data.session?.access_token;
  if (authToken) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// --- Refresh token logic with single-flight + queue ---

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let pendingQueue: Array<(token: string | null) => void> = [];

const flushQueue = (token: string | null) => {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
};

const performRefresh = async (): Promise<string | null> => {
  const ft = getFTSession();
  const refresh_token = ft?.refresh_token;
  if (!refresh_token) return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const authToken = sessionData.session?.access_token;
    const res = await fetch(`${FUNCTIONS_URL}/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ refresh_token }),
    });
    const json = await res.json().catch(() => ({}));
    const upstreamStatus = json?.status ?? res.status;
    if (!res.ok || !json?.ok || upstreamStatus === 401) return null;
    const inner = json.data?.data ? json.data.data : json.data;
    const newToken = inner?.token || inner?.access_token;
    const newRefresh = inner?.refresh_token;
    if (!newToken) return null;
    setFTSession({ ...ft, token: newToken, refresh_token: newRefresh ?? ft.refresh_token });
    return newToken;
  } catch {
    return null;
  }
};

const redirectToLogin = () => {
  clearFTSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.assign("/");
  } else if (typeof window !== "undefined") {
    // Force a re-render by dispatching the auth-change event (handled in clearFTSession),
    // but also reload as a safety net.
    window.location.reload();
  }
};

// Detect 401 either at HTTP level OR inside the proxied edge function envelope
// `{ ok: false, status: 401, data: {...} }`.
const is401 = (error: AxiosError): boolean => {
  if (error.response?.status === 401) return true;
  const body: any = error.response?.data;
  if (body && body.ok === false && body.status === 401) return true;
  return false;
};

api.interceptors.response.use(
  // Also flag a successful HTTP 200 from edge fn that contains an inner 401
  (response) => {
    const body: any = response.data;
    if (body && body.ok === false && body.status === 401) {
      return Promise.reject({
        isAxiosError: true,
        response,
        config: response.config,
        message: "Upstream 401",
      } as any);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalConfig = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!originalConfig || !is401(error) || originalConfig._retry) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    // Single-flight refresh
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = performRefresh().finally(() => {
        isRefreshing = false;
      });
      const newToken = await refreshPromise;
      flushQueue(newToken);
      if (!newToken) {
        redirectToLogin();
        return Promise.reject(error);
      }
      // Replace the token in body if present
      if (originalConfig.data) {
        try {
          const parsed =
            typeof originalConfig.data === "string"
              ? JSON.parse(originalConfig.data)
              : originalConfig.data;
          if (parsed && typeof parsed === "object" && "token" in parsed) {
            parsed.token = newToken;
            originalConfig.data =
              typeof originalConfig.data === "string"
                ? JSON.stringify(parsed)
                : parsed;
          }
        } catch {
          // ignore — non-JSON body (e.g. FormData)
        }
      }
      return api.request(originalConfig);
    }

    // Wait for the in-flight refresh
    return new Promise((resolve, reject) => {
      pendingQueue.push((newToken) => {
        if (!newToken) {
          redirectToLogin();
          reject(error);
          return;
        }
        if (originalConfig.data) {
          try {
            const parsed =
              typeof originalConfig.data === "string"
                ? JSON.parse(originalConfig.data)
                : originalConfig.data;
            if (parsed && typeof parsed === "object" && "token" in parsed) {
              parsed.token = newToken;
              originalConfig.data =
                typeof originalConfig.data === "string"
                  ? JSON.stringify(parsed)
                  : parsed;
            }
          } catch {
            // ignore
          }
        }
        resolve(api.request(originalConfig));
      });
    });
  }
);

// Helper that injects the FactoryTele token into a JSON body automatically.
export const ftPost = <T = any>(path: string, body: Record<string, any> = {}) => {
  const ft = getFTSession();
  return api.post<T>(path, { ...body, token: ft?.token });
};
