export type Country = {
  code: string; // ISO-2
  name: string;
  dial: string; // without leading +
  flag: string;
};

// Curated list — extend as needed.
export const COUNTRIES: Country[] = [
  { code: "ES", name: "España", dial: "34", flag: "🇪🇸" },
  { code: "RU", name: "Россия", dial: "7", flag: "🇷🇺" },
  { code: "KZ", name: "Қазақстан", dial: "7", flag: "🇰🇿" },
  { code: "US", name: "United States", dial: "1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dial: "44", flag: "🇬🇧" },
  { code: "FR", name: "France", dial: "33", flag: "🇫🇷" },
  { code: "DE", name: "Deutschland", dial: "49", flag: "🇩🇪" },
  { code: "IT", name: "Italia", dial: "39", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "NL", name: "Nederland", dial: "31", flag: "🇳🇱" },
  { code: "BE", name: "België", dial: "32", flag: "🇧🇪" },
  { code: "CH", name: "Schweiz", dial: "41", flag: "🇨🇭" },
  { code: "AT", name: "Österreich", dial: "43", flag: "🇦🇹" },
  { code: "PL", name: "Polska", dial: "48", flag: "🇵🇱" },
  { code: "UA", name: "Україна", dial: "380", flag: "🇺🇦" },
  { code: "TR", name: "Türkiye", dial: "90", flag: "🇹🇷" },
  { code: "MA", name: "Maroc", dial: "212", flag: "🇲🇦" },
  { code: "MX", name: "México", dial: "52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { code: "BR", name: "Brasil", dial: "55", flag: "🇧🇷" },
  { code: "CO", name: "Colombia", dial: "57", flag: "🇨🇴" },
  { code: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
  { code: "PE", name: "Perú", dial: "51", flag: "🇵🇪" },
  { code: "CN", name: "中国", dial: "86", flag: "🇨🇳" },
  { code: "IN", name: "India", dial: "91", flag: "🇮🇳" },
  { code: "JP", name: "日本", dial: "81", flag: "🇯🇵" },
  { code: "AE", name: "الإمارات", dial: "971", flag: "🇦🇪" },
];

export const DEFAULT_COUNTRY = "ES";

// Parse "+34612345678" -> { country: "ES", national: "612345678" }
export function parsePhone(raw: string): { country: string; national: string } {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return { country: DEFAULT_COUNTRY, national: "" };
  // Try longest dial first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (digits.startsWith(c.dial)) {
      return { country: c.code, national: digits.slice(c.dial.length) };
    }
  }
  return { country: DEFAULT_COUNTRY, national: digits };
}

export function buildPhone(countryCode: string, national: string): string {
  const c = COUNTRIES.find((x) => x.code === countryCode);
  const dial = c?.dial ?? "";
  const n = (national || "").replace(/\D/g, "");
  if (!n) return "";
  return `+${dial}${n}`;
}
