import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import {
  Phone as PhoneIcon,
  Plus,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  RefreshCw,
  UserRound,
  Camera,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getFTSession, setFTSession, FactoryTeleLine, filterVisibleLines, getSubscriptionIdFromToken } from "@/lib/ft-auth";
import { ftPost, ftUpload } from "@/lib/api";
import {
  fetchProfile,
  fetchLines,
  fetchLineDetails,
  uploadAvatar,
  getCachedProfile,
  getCachedLines,
  getCachedLineDetails,
  getCachedAvatarUrl,
} from "@/lib/api-cache";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LineTypeIcon, getLineTypeLabel } from "./LineTypeIcon";
import logo from "@/assets/logo-elia-balance.svg";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { invalidateLineDetails } from "@/lib/api-cache";

interface HomePageProps {
  user: User;
}

interface ProfileData {
  name: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: unknown;
}

// Placeholder cuando la API no devuelve un valor
const NA = "n/a";

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface LineDetails {
  autopayment_enabled?: boolean;
  balance?: number;
  id?: string;
  msisdn?: string;
  next_billing_date?: string;
  pending_plan?: { change_date?: string; name?: string; price?: number };
  plan?: { gb?: number; minutes?: number; name?: string; price?: number; sms?: number };
  remains?: {
    data_gb_total?: number;
    data_gb_used?: number;
    is_unlimited_data?: boolean;
    is_unlimited_sms?: boolean;
    is_unlimited_voice?: boolean;
    minutes_total?: number;
    minutes_used?: number;
    sms_total?: number;
    sms_used?: number;
  };
  status?: string;
  type?: string;
  [key: string]: unknown;
}

const HomePage = ({ user }: HomePageProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [financesOpen, setFinancesOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => getCachedAvatarUrl());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [financeMonth, setFinanceMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [profile, setProfile] = useState<ProfileData | null>(() => {
    const p = getCachedProfile();
    if (!p) return null;
    const fullName =
      [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Usuario";
    return { name: fullName, phone: p.phone, ...p };
  });
  const [lines, setLines] = useState<FactoryTeleLine[]>(
    () => getCachedLines() || getFTSession()?.lines || []
  );
  const [currentLine, setCurrentLine] = useState<FactoryTeleLine | null>(
    () => getFTSession()?.line || null
  );
  const [lineDetails, setLineDetails] = useState<LineDetails | null>(
    () => getCachedLineDetails(getFTSession()?.line?.id) || null
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingPlanChange, setCancellingPlanChange] = useState(false);

  const loadLineDetails = async (lineId: string | number, force = false) => {
    if (!lineId) return;
    setLoadingDetails(true);
    try {
      const data = await fetchLineDetails(lineId, force);
      setLineDetails(data || null);
      if (data && typeof data === "object") {
        const hydratedLine = { id: lineId, ...(data as FactoryTeleLine) };
        setCurrentLine((prev) =>
          prev && String(prev.id) === String(lineId) ? { ...prev, ...hydratedLine } : hydratedLine
        );
        setLines((prev) => {
          const exists = prev.some((l) => String(l.id) === String(lineId));
          return exists
            ? prev.map((l) => (String(l.id) === String(lineId) ? { ...l, ...hydratedLine } : l))
            : [hydratedLine];
        });
        const ft = getFTSession();
        if (ft && (String(ft.line_id || "") === String(lineId) || String(ft.line?.id || "") === String(lineId))) {
          const nextLines = (ft.lines || []).some((l) => String(l.id) === String(lineId))
            ? (ft.lines || []).map((l) => (String(l.id) === String(lineId) ? { ...l, ...hydratedLine } : l))
            : [hydratedLine];
          setFTSession({ ...ft, line_id: lineId, line: { ...(ft.line || {}), ...hydratedLine }, lines: nextLines });
        }
      }
    } catch (e) {
      console.warn("line details error", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadLines = async (force = false) => {
    const ft = getFTSession();
    const subscriptionId = getSubscriptionIdFromToken(ft?.token);
    if (ft?.auth_type === "subscriber" || subscriptionId) {
      const lineId = ft?.line_id || subscriptionId;
      const line = ft.line || (lineId ? ({ id: lineId } as FactoryTeleLine) : null);
      if (line) {
        setLines([line]);
        if (!currentLine) setCurrentLine(line);
        await loadLineDetails(line.id, force);
      }
      return;
    }

    try {
      const arr = await fetchLines(force);
      const fetched = filterVisibleLines(arr as FactoryTeleLine[]);
      setLines(fetched);
      if (ft) {
        const stillExists = fetched.find((l) => l.id === currentLine?.id);
        const next = stillExists || fetched[0] || null;
        setFTSession({ ...ft, lines: fetched, line: next || ft.line, line_id: next?.id ?? ft.line_id });
        if (next && next.id !== currentLine?.id) setCurrentLine(next);
        if (next) loadLineDetails(next.id, force);
      }
    } catch (e) {
      console.warn("lines load error", e);
    }
  };

  const switchLine = (line: FactoryTeleLine) => {
    if (!line || line.id === currentLine?.id) return;
    const ft = getFTSession();
    if (!ft) return;
    setFTSession({ ...ft, line_id: line.id, line });
    setCurrentLine(line);
    const cached = getCachedLineDetails(line.id);
    setLineDetails(cached || null);
    loadLineDetails(line.id, !cached);
  };

  // Cargar perfil desde API FactoryTele
  const loadProfile = async (force = false) => {
    const ft = getFTSession();
    if (!ft?.token) return;
    try {
      const apiProfile = await fetchProfile(force);
      if (apiProfile) {
        const fullName = [apiProfile.first_name, apiProfile.last_name]
          .filter(Boolean)
          .join(" ") || apiProfile.email || "Usuario";
        setProfile({
          name: fullName,
          phone: apiProfile.phone,
          ...apiProfile,
        });
        setAvatarUrl(getCachedAvatarUrl());
      }
    } catch (e) {
      console.warn("profile load error", e);
    }
  };

  useEffect(() => {
    loadProfile();
    loadLines();
    if (currentLine?.id) loadLineDetails(currentLine.id);
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
      await uploadAvatar(file);
      toast({ title: "Avatar actualizado" });
      await loadProfile(true);
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: "Error al subir",
        description: err instanceof Error ? err.message : "No se pudo subir el avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        loadProfile(true),
        loadLines(true),
        currentLine?.id ? loadLineDetails(currentLine.id, true) : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const fmt = (n: number) => n.toFixed(2);
  const fmtDate = (iso?: string) => {
    if (!iso) return NA;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = d.getUTCDate().toString().padStart(2, "0");
    const month = MONTHS_ES[d.getUTCMonth()];
    return `${day} - ${month}`;
  };
  const fmtDateDot = (iso?: string) => {
    if (!iso) return NA;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = d.getUTCDate().toString().padStart(2, "0");
    const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    return `${day}.${month}.${d.getUTCFullYear()}`;
  };
  const isTomorrowUTC = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return (
      d.getUTCFullYear() === tomorrow.getUTCFullYear() &&
      d.getUTCMonth() === tomorrow.getUTCMonth() &&
      d.getUTCDate() === tomorrow.getUTCDate()
    );
  };

  const handleCancelPlanChange = async () => {
    const ft = getFTSession();
    const token = ft?.token;
    const lineId = currentLine?.id;
    if (!token || !lineId) return;
    setCancellingPlanChange(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-line-plan-change", {
        body: { token, line_id: lineId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.data?.error || data?.data?.message || "No se pudo cancelar");
      toast({ title: "Cambio de plan cancelado" });
      invalidateLineDetails(lineId);
      await loadLineDetails(lineId, true);
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo cancelar el cambio",
        variant: "destructive",
      });
    } finally {
      setCancellingPlanChange(false);
      setCancelDialogOpen(false);
    }
  };

  const selectedLine = currentLine || lines[0] || null;

  const formatLineTitle = (line?: FactoryTeleLine | null) => {
    const msisdn = line?.msisdn || lineDetails?.msisdn;
    if (!line && !msisdn) return getFTSession()?.phone || NA;
    if (msisdn) {
      const n = String(msisdn).replace(/^\+?34/, "");
      return `+34 ${n}`;
    }
    return line?.tariff_plan || getLineTypeLabel(line?.type);
  };

  const formatLineSubtitle = (line?: FactoryTeleLine | null) => {
    if (!line) return NA;
    if (line.type === "fiber") {
      const parts = (line.installation_address || "").split(",").map((s) => s.trim()).filter(Boolean);
      const streetAndNumber = parts.slice(0, 2).join(", ");
      return streetAndNumber || line.installation_address || NA;
    }
    if (line.type === "travel") return "Travel SIM";
    return line.tariff_plan || NA;
  };

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
              className="relative h-14 w-14 rounded-full overflow-hidden bg-white/40 ring-2 ring-white/60 flex items-center justify-center group shrink-0"
              aria-label="Cambiar avatar"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-7 w-7 text-[#A36BFF]" />
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </span>
              {uploading && (
                <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-white animate-spin" />
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
                {profile?.name || NA}
              </h1>
              {lines.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="mt-0.5 flex max-w-[220px] items-center gap-1 text-left text-sm font-semibold text-[#FF7A1A] transition-opacity hover:opacity-80"
                      aria-label="Seleccionar suscripción"
                    >
                      <span className="truncate">{formatLineTitle(selectedLine)}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 rounded-xl bg-white p-2 shadow-lg">
                    {lines.map((l) => {
                      const isActive = l.id === selectedLine?.id;
                      return (
                        <DropdownMenuItem
                          key={String(l.id)}
                          onClick={() => switchLine(l)}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 focus:bg-[#FFF6E8]",
                            isActive && "text-[#FF7A1A]"
                          )}
                        >
                          <LineTypeIcon type={l.type} boxed size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{formatLineTitle(l)}</div>
                            <div className="truncate text-xs text-gray-500">{formatLineSubtitle(l)}</div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <p className="text-sm text-[#A36BFF]/80">
                  {formatLineTitle(selectedLine)}
                </p>
              )}
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
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LineTypeIcon type={currentLine?.type} boxed size="md" />
                <span className="text-base font-semibold text-[#2F2A33]">
                  {lineDetails?.plan?.name || currentLine?.tariff_plan || NA}
                </span>
              </div>
              <button
                onClick={() => navigate("/change-plan", { state: { line: currentLine, lineDetails } })}
                className="rounded-xl border border-[#A36BFF] px-5 py-2 text-sm font-semibold text-[#A36BFF] transition-all hover:bg-[#A36BFF] hover:text-[#FFF6E8]"
              >
                Cambiar
              </button>
            </div>

            <div className="border-t border-gray-100 px-5 py-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">Saldo</span>
                  <span className="ml-2 text-sm font-bold text-[#A36BFF]">
                    {lineDetails?.balance != null ? `€${fmt(lineDetails.balance)}` : NA}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Cuota mensual</span>
                  <span className="ml-1 text-xs font-semibold text-[#A36BFF]">
                    {lineDetails?.plan?.price != null ? `€${fmt(lineDetails.plan.price)}` : NA}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate("/topup")}
                className="w-full rounded-xl bg-[#A36BFF] px-6 py-2.5 text-sm font-semibold text-[#FFF6E8] shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Recargar
              </button>
            </div>

            {lineDetails?.pending_plan?.name ? (
              <div className="bg-[#FFF6E8] px-5 py-2.5 text-center text-xs font-medium text-[#A36BFF] flex flex-col items-center gap-1.5">
                <span>
                  A partir del {fmtDateDot(lineDetails.pending_plan.change_date)} el plan cambia a "{lineDetails.pending_plan.name}"
                  {lineDetails.pending_plan.price != null ? ` — €${fmt(lineDetails.pending_plan.price)}/mes` : ""}
                </span>
                {!isTomorrowUTC(lineDetails.pending_plan.change_date) && (
                  <button
                    onClick={() => setCancelDialogOpen(true)}
                    className="rounded-lg border border-[#A36BFF] px-4 py-1 text-xs font-semibold text-[#A36BFF] transition-all hover:bg-[#A36BFF] hover:text-[#FFF6E8]"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-[#FFF6E8] px-5 py-2.5 text-center text-xs font-medium text-[#A36BFF]">
                Cuota mensual {lineDetails?.plan?.price != null ? `€${fmt(lineDetails.plan.price)}` : NA} del plan actual se cobrará el {fmtDateDot(lineDetails?.next_billing_date)}
              </div>
            )}
          </div>

          {/* Data + minutes */}
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-[#2F2A33]">
                  Gb disponibles
                </span>
              </div>
              <span className="text-sm font-bold text-[#A36BFF]">
                {lineDetails?.remains?.is_unlimited_data
                  ? "Ilimitados"
                  : lineDetails?.remains
                  ? `${((lineDetails.remains.data_gb_total ?? 0) - (lineDetails.remains.data_gb_used ?? 0)).toFixed(1)} Gb de ${(lineDetails.remains.data_gb_total ?? 0).toFixed(1)} Gb`
                  : NA}
              </span>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-[#2F2A33]">
                  Minutos disponibles
                </span>
              </div>
              <span className="text-sm font-bold text-[#A36BFF]">
                {lineDetails?.remains?.is_unlimited_voice
                  ? "Ilimitados"
                  : lineDetails?.remains
                  ? `${(lineDetails.remains.minutes_total ?? 0) - (lineDetails.remains.minutes_used ?? 0)} de ${lineDetails.remains.minutes_total ?? 0}`
                  : NA}
              </span>
            </div>
          </div>

          {/* Buy GB */}
          <button className="w-full rounded-2xl bg-white shadow-lg px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A36BFF]/10">
                <Plus className="h-4 w-4 text-[#A36BFF]" />
              </div>
              <span className="text-base font-semibold text-[#2F2A33]">
                Comprar Gb
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Finanzas */}
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <button
              onClick={() => setFinancesOpen(!financesOpen)}
              className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A36BFF]/10">
                  <Clock className="h-4 w-4 text-[#A36BFF]" />
                </div>
                <span className="text-base font-semibold text-[#2F2A33]">
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
                    <span className="text-sm font-semibold text-[#2F2A33]">
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
                    <span className="text-sm text-[#2F2A33]">Cuota del plan</span>
                    <span className="text-sm font-semibold text-[#A36BFF]">
                      {NA}
                    </span>
                  </div>
                  <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100">
                    <span className="text-sm text-[#2F2A33]">Recarga de saldo</span>
                    <span className="text-sm font-semibold text-[#A36BFF]">+ 0.00€</span>
                  </div>

                  <div className="flex items-stretch bg-[#FFF6E8] text-[#A36BFF]">
                    <div className="flex-1 px-5 py-3 flex flex-col items-start justify-center">
                      <span className="text-xs font-medium opacity-90">Gastado</span>
                      <span className="text-lg font-bold">{NA}</span>
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

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar cambio de plan</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cancelar el cambio de plan programado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingPlanChange}>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelPlanChange();
              }}
              disabled={cancellingPlanChange}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HomePage;
