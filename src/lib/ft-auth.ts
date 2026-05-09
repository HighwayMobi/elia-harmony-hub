// Lightweight session helper for FactoryTele API auth.
// Stored in localStorage so it survives reloads.

const KEY = "factorytele_session";
const EVENT = "factorytele-auth-change";

export type FactoryTeleLine = {
  id: string | number;
  name?: string;
  msisdn?: string;
  status?: string;
  tariff_plan?: string;
  [key: string]: any;
};

export type FactoryTeleSession = {
  token?: string;
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
