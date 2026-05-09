import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import {
  Wifi,
  Phone as PhoneIcon,
  Plus,
  Clock,
  Signal,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  RefreshCw,
  UserRound,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getFTSession } from "@/lib/ft-auth";
import logo from "@/assets/logo-elia-balance.svg";

interface HomePageProps {
  user: User;
}

interface ProfileData {
  name: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: any;
}

// Mock data — se reemplazará con datos reales de la API
const MOCK = {
  name: "NOMBRE APELLIDO",
  phone: "+34 681999090",
  plan: "EURO 12 Gb",
  balance: 115.0,
  monthlyFee: 8.0,
  feeDate: "15.05.2026",
  dataRemaining: 35.1,
  dataTotal: 37.5,
  minutesLimit: null as number | null,
};

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const HomePage = ({ user }: HomePageProps) => {
  const { toast } = useToast();
  const [financesOpen, setFinancesOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [financeMonth, setFinanceMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Cargar perfil desde API FactoryTele
  const loadProfile = async () => {
    const ft = getFTSession();
    const token = ft?.token;
    if (!token) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authToken ? `Bearer ${authToken}` : "",
          },
          body: JSON.stringify({ token }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (json.ok && json.data?.data) {
        const apiProfile = json.data.data;
        const fullName = [apiProfile.first_name, apiProfile.last_name]
          .filter(Boolean)
          .join(" ") || apiProfile.email || "Usuario";
        setProfile({
          name: fullName,
          phone: apiProfile.phone,
          ...apiProfile,
        });
        const raw =
          apiProfile.avatar_url ||
          apiProfile.line_avatar_url ||
          apiProfile.avatar ||
          apiProfile.photo ||
          apiProfile.image ||
          null;
        if (raw) {
          const absolute = /^https?:\/\//i.test(raw)
            ? raw
            : `https://platform.factorytele.com${raw.startsWith("/") ? "" : "/"}${raw}`;
          setAvatarUrl(`${absolute}${absolute.includes("?") ? "&" : "?"}t=${Date.now()}`);
        }
      }
    } catch (e) {
      console.warn("profile load error", e);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo no válido", description: "Sube una imagen.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Archivo demasiado grande", description: "Máximo 5 MB.", variant: "destructive" });
      return;
    }
    const ft = getFTSession();
    const token = ft?.token;
    if (!token) {
      toast({ title: "Sesión expirada", description: "Inicia sesión de nuevo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    // Vista previa local inmediata
    const localPreview = URL.createObjectURL(file);
    setAvatarUrl(localPreview);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token;
      const form = new FormData();
      form.append("token", token);
      form.append("avatar", file, file.name);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: authToken ? `Bearer ${authToken}` : "",
          },
          body: form,
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json?.data?.message || json?.error || "Error al subir");
      }
      toast({ title: "Avatar actualizado" });
      await loadProfile();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error al subir", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header con logo */}
      <header className="px-6 py-4 flex items-center justify-center">
        <img src={logo} alt="Elia Balance" className="w-28 h-auto opacity-90" />
      </header>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 px-4 pb-28"
      >
        <div className="w-full max-w-md mx-auto space-y-4">
          {/* User row */}
          <div className="flex items-center gap-3 px-1 mb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative h-14 w-14 rounded-full overflow-hidden bg-[#A36BFF]/20 ring-2 ring-[#A36BFF]/40 flex items-center justify-center group shrink-0"
              aria-label="Cambiar avatar"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-7 w-7 text-[#A36BFF]" />
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-5 w-5 text-[#A36BFF]" />
              </span>
              {uploading && (
                <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-[#A36BFF] animate-spin" />
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#A36BFF] tracking-wide truncate">
                {profile?.name || MOCK.name}
              </h1>
              <p className="text-sm text-[#A36BFF]/80">{profile?.phone || MOCK.phone}</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="ml-auto p-2 rounded-xl text-[#A36BFF]/80 hover:text-[#A36BFF] hover:bg-[#A36BFF]/10 transition-colors disabled:opacity-50"
              aria-label="Actualizar"
            >
              <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
            </button>
          </div>

          {/* Plan card */}
          <div className="rounded-2xl bg-[#A36BFF] shadow-lg overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5E6D3]/15">
                  <Signal className="h-4 w-4 text-[#F5E6D3]" />
                </div>
                <span className="text-base font-semibold text-gray-900">
                  {MOCK.plan}
                </span>
              </div>
              <button className="rounded-xl border border-[#F5E6D3] px-5 py-2 text-sm font-semibold text-[#F5E6D3] transition-all hover:bg-[#F5E6D3] hover:text-[#A36BFF]">
                Cambiar
              </button>
            </div>

            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">Saldo</span>
                <span className="ml-2 text-sm font-bold text-[#F5E6D3]">
                  €{fmt(MOCK.balance)}
                </span>
                <br />
                <span className="text-xs text-gray-500">Cuota mensual</span>
                <span className="ml-1 text-xs font-semibold text-[#F5E6D3]">
                  €{fmt(MOCK.monthlyFee)}
                </span>
              </div>
              <button className="rounded-xl bg-[#F5E6D3] px-6 py-2.5 text-sm font-semibold text-[#A36BFF] shadow-md transition-all hover:brightness-110 active:scale-[0.98]">
                Recargar
              </button>
            </div>

            <div className="bg-[#F5E6D3] px-5 py-2.5 text-center text-xs font-medium text-[#A36BFF]">
              Cuota mensual €{fmt(MOCK.monthlyFee)} del plan actual se cobrará el {MOCK.feeDate}
            </div>
          </div>

          {/* Data + minutes */}
          <div className="rounded-2xl bg-[#A36BFF] shadow-lg overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">
                  Gb disponibles
                </span>
              </div>
              <span className="text-sm font-bold text-[#F5E6D3]">
                {MOCK.dataRemaining} Gb de {MOCK.dataTotal} Gb
              </span>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">
                  Minutos disponibles
                </span>
              </div>
              <span className="text-sm font-bold text-[#F5E6D3]">
                {MOCK.minutesLimit ?? "Ilimitados"}
              </span>
            </div>
          </div>

          {/* Buy GB */}
          <button className="w-full rounded-2xl bg-[#A36BFF] shadow-lg px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5E6D3]/15">
                <Plus className="h-4 w-4 text-[#F5E6D3]" />
              </div>
              <span className="text-base font-semibold text-gray-900">
                Comprar Gb
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Finanzas */}
          <div className="rounded-2xl bg-[#A36BFF] shadow-lg overflow-hidden">
            <button
              onClick={() => setFinancesOpen(!financesOpen)}
              className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5E6D3]/15">
                  <Clock className="h-4 w-4 text-[#F5E6D3]" />
                </div>
                <span className="text-base font-semibold text-gray-900">
                  Finanzas
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-gray-400 transition-transform duration-200",
                  financesOpen && "rotate-180"
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                financesOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-gray-100">
                  <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
                    <button
                      onClick={() => {
                        const prev =
                          financeMonth.month === 0
                            ? { year: financeMonth.year - 1, month: 11 }
                            : { year: financeMonth.year, month: financeMonth.month - 1 };
                        setFinanceMonth(prev);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-semibold text-gray-900">
                      {MONTHS_ES[financeMonth.month]} {financeMonth.year}
                    </span>
                    <button
                      onClick={() => {
                        const now = new Date();
                        const isCurrent =
                          financeMonth.year === now.getFullYear() &&
                          financeMonth.month === now.getMonth();
                        if (isCurrent) return;
                        const next =
                          financeMonth.month === 11
                            ? { year: financeMonth.year + 1, month: 0 }
                            : { year: financeMonth.year, month: financeMonth.month + 1 };
                        setFinanceMonth(next);
                      }}
                      disabled={
                        financeMonth.year === new Date().getFullYear() &&
                        financeMonth.month === new Date().getMonth()
                      }
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100">
                    <span className="text-sm text-gray-900">Cuota del plan</span>
                    <span className="text-sm font-semibold text-[#F5E6D3]">
                      - {fmt(MOCK.monthlyFee)}€
                    </span>
                  </div>
                  <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100">
                    <span className="text-sm text-gray-900">Recarga de saldo</span>
                    <span className="text-sm font-semibold text-[#F5E6D3]">+ 0.00€</span>
                  </div>

                  <div className="flex items-stretch bg-[#F5E6D3] text-[#A36BFF]">
                    <div className="flex-1 px-5 py-3 flex flex-col items-start justify-center">
                      <span className="text-xs font-medium opacity-90">Gastado</span>
                      <span className="text-lg font-bold">{fmt(MOCK.monthlyFee)}€</span>
                    </div>
                    <div className="w-px bg-[#A36BFF]/30 my-2" />
                    <div className="flex-1 px-5 py-3 flex flex-col items-end justify-center">
                      <span className="text-xs font-medium opacity-90">Recargado</span>
                      <span className="text-lg font-bold">0.00€</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.main>
    </div>
  );
};

export default HomePage;
