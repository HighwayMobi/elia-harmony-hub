// Simple in-memory cache for FactoryTele API data.
// Avoids re-fetching profile / lines / line details / avatar across re-renders
// and route changes. Cleared after writes (plan change, profile update, avatar
// upload, password change) and on logout.

import { ftPost, ftUpload } from "./api";
import { clearFTSession, TOKEN_CHANGED_EVENT } from "./ft-auth";

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
  inflight?: Promise<T>;
};

type Cache = {
  profile?: CacheEntry<any>;
  avatarUrl?: CacheEntry<string | null>;
  lines?: CacheEntry<any[]>;
  lineDetails: Map<string, CacheEntry<any>>;
};

const cache: Cache = {
  lineDetails: new Map(),
};

// Subscribers fire whenever a slice changes so consumers can re-render.
type Slice = "profile" | "avatarUrl" | "lines" | "lineDetails";
const listeners = new Set<(slice: Slice, key?: string) => void>();
const notify = (slice: Slice, key?: string) => {
  listeners.forEach((l) => l(slice, key));
};

export const subscribeApiCache = (cb: (slice: Slice, key?: string) => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

// ---------------- Getters ----------------

export const getCachedProfile = () => cache.profile?.data;
export const getCachedAvatarUrl = () => cache.avatarUrl?.data ?? null;
export const getCachedLines = () => cache.lines?.data;
export const getCachedLineDetails = (id: string | number | undefined) =>
  id != null ? cache.lineDetails.get(String(id))?.data : undefined;

// ---------------- Fetchers (with single-flight + cache) ----------------

const unwrap = (json: any) => {
  if (!json) return null;
  const inner = json.data?.data ?? json.data;
  return inner ?? null;
};

export const fetchProfile = async (force = false): Promise<any> => {
  if (!force && cache.profile) return cache.profile.data;
  if (cache.profile?.inflight) return cache.profile.inflight;

  const inflight = (async () => {
    const { data: json } = await ftPost<any>("get-profile");
    if (!json?.ok) throw new Error(json?.data?.message || "profile load failed");
    const data = unwrap(json);
    cache.profile = { data, fetchedAt: Date.now() };

    // Derive avatar URL from profile.
    const raw =
      data?.line_avatar_url ||
      data?.avatar_url ||
      data?.avatar ||
      data?.photo ||
      data?.image ||
      null;
    let absolute: string | null = null;
    if (raw) {
      absolute = /^https?:\/\//i.test(raw)
        ? raw
        : `https://platform.factorytele.com${raw.startsWith("/") ? "" : "/"}${raw}`;
      // Bust browser image cache once per fetch.
      absolute = `${absolute}${absolute.includes("?") ? "&" : "?"}t=${cache.profile.fetchedAt}`;
    }
    cache.avatarUrl = { data: absolute, fetchedAt: cache.profile.fetchedAt };
    notify("profile");
    notify("avatarUrl");
    return data;
  })();

  cache.profile = { data: cache.profile?.data, fetchedAt: 0, inflight } as any;
  try {
    return await inflight;
  } finally {
    if (cache.profile) cache.profile.inflight = undefined;
  }
};

export const fetchLines = async (force = false): Promise<any[]> => {
  if (!force && cache.lines) return cache.lines.data;
  if (cache.lines?.inflight) return cache.lines.inflight;

  const inflight = (async () => {
    const { data: json } = await ftPost<any>("get-account-lines");
    if (!json?.ok) throw new Error(json?.data?.message || "lines load failed");
    const payload = json.data;
    const arr = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.lines)
      ? payload.lines
      : [];
    cache.lines = { data: arr, fetchedAt: Date.now() };
    notify("lines");
    return arr;
  })();

  cache.lines = { data: cache.lines?.data ?? [], fetchedAt: 0, inflight } as any;
  try {
    return await inflight;
  } finally {
    if (cache.lines) cache.lines.inflight = undefined;
  }
};

export const fetchLineDetails = async (
  lineId: string | number,
  force = false
): Promise<any> => {
  const key = String(lineId);
  const existing = cache.lineDetails.get(key);
  if (!force && existing && !existing.inflight) return existing.data;
  if (existing?.inflight) return existing.inflight;

  const inflight = (async () => {
    const { data: json } = await ftPost<any>("get-line-details", { line_id: lineId });
    if (!json?.ok) throw new Error(json?.data?.message || "line details failed");
    const data = unwrap(json);
    cache.lineDetails.set(key, { data, fetchedAt: Date.now() });
    notify("lineDetails", key);
    return data;
  })();

  cache.lineDetails.set(key, { data: existing?.data, fetchedAt: 0, inflight } as any);
  try {
    return await inflight;
  } finally {
    const e = cache.lineDetails.get(key);
    if (e) e.inflight = undefined;
  }
};

// ---------------- Mutations (auto-invalidate) ----------------

export const uploadAvatar = async (file: File) => {
  const form = new FormData();
  form.append("avatar", file, file.name);
  const { data: json } = await ftUpload<any>("upload-avatar", form);
  if (!json?.ok) {
    throw new Error(json?.data?.message || json?.error || "upload failed");
  }
  invalidateProfile();
  await fetchProfile(true);
  return json;
};

// ---------------- Invalidation ----------------

export const invalidateProfile = () => {
  cache.profile = undefined;
  cache.avatarUrl = undefined;
  notify("profile");
  notify("avatarUrl");
};

export const invalidateLines = () => {
  cache.lines = undefined;
  notify("lines");
};

export const invalidateLineDetails = (lineId?: string | number) => {
  if (lineId != null) {
    cache.lineDetails.delete(String(lineId));
    notify("lineDetails", String(lineId));
  } else {
    cache.lineDetails.clear();
    notify("lineDetails");
  }
};

export const invalidateAll = () => {
  cache.profile = undefined;
  cache.avatarUrl = undefined;
  cache.lines = undefined;
  cache.lineDetails.clear();
  notify("profile");
  notify("avatarUrl");
  notify("lines");
  notify("lineDetails");
};

// Wipe everything on logout.
export const logoutAndClear = () => {
  invalidateAll();
  clearFTSession();
};

// Auto-wipe cache when the FactoryTele token changes (login/logout/refresh
// to a different user). Prevents leaking data from a previous account into
// the new session.
if (typeof window !== "undefined") {
  window.addEventListener(TOKEN_CHANGED_EVENT, () => {
    invalidateAll();
  });
}
