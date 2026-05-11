// Lightweight session helper for FactoryTele API auth.
// Stored in localStorage so it survives reloads.

const KEY = "factorytele_session";
const EVENT = "factorytele-auth-change";

export type FactoryTeleLineType = "mobile" | "travel" | "fiber" | string;

export type FactoryTeleLine = {
  id: string | number;
  name?: string;
  msisdn?: string;
  status?: string;
  tariff_plan?: string;
  type?: FactoryTeleLineType;
  installation_address?: string;
  [key: string]: any;
};

// Statuses considered visible/usable in the app.
export const VISIBLE_LINE_STATUSES = ["ACTIVE", "BLOCKED", "SUSPENDED", "FREEZE"] as const;

export const filterVisibleLines = <T extends { status?: string }>(arr: T[]): T[] =>
  (arr || []).filter((l) =>
    VISIBLE_LINE_STATUSES.includes(String(l?.status || "").toUpperCase() as any)
  );

export type FactoryTeleSession = {
  token?: string;
  refresh_token?: string;
  auth_type?: string;
  email?: string;
  phone?: string;
  user?: any;
  line_id?: string | number;
  line?: FactoryTeleLine;
  lines?: FactoryTeleLine[];
  raw?: any;
};

export const getFTSession = (): FactoryTeleSession | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as FactoryTeleSession) : null;
  } catch {
    return null;
  }
};

export const setFTSession = (session: FactoryTeleSession) => {
  localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(EVENT));
};

export const clearFTSession = () => {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
};

export const onFTSessionChange = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
