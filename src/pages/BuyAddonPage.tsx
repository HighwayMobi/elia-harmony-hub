import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Wifi, Phone as PhoneIcon, MessageSquare, Plus } from "lucide-react";
import { ftPost } from "@/lib/api";
import { fetchLineDetails, getCachedLineDetails, invalidateLineDetails } from "@/lib/api-cache";
import { getFTSession, getSubscriptionIdFromToken } from "@/lib/ft-auth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import logo from "@/assets/logo-elia-balance.svg";

type CatalogAddon = {
  id: string;
  name: string;
  price: number;
  gb?: number;
  minutes?: number;
  sms?: number;
  duration_days?: number;
  is_unlimited_data?: boolean;
  is_unlimited_voice?: boolean;
  is_unlimited_sms?: boolean;
};

const fmt = (n: number) => Number(n || 0).toFixed(2);

const BuyAddonPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const routeState = (location.state || {}) as { line?: any; lineDetails?: any };
  const ft = getFTSession();
  const line: any = routeState.line || ft?.line || ft?.lines?.[0] || null;
  const lineId = line?.id || ft?.line_id || ft?.lines?.[0]?.id || getSubscriptionIdFromToken(ft?.token);
  const lineType = ((line?.type) as string) || "mobile";

  const [addons, setAddons] = useState<CatalogAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddon, setSelectedAddon] = useState<CatalogAddon | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lineDetails, setLineDetails] = useState<any>(
    () => routeState.lineDetails || getCachedLineDetails(lineId) || null
  );

  const balance: number = Number(lineDetails?.balance ?? 0);

  useEffect(() => {
    if (!lineId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLineDetails(lineId);
        if (!cancelled) setLineDetails(data || null);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lineId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: json } = await ftPost<any>("get-catalog-plans", {
          type: lineType,
          kind: "addon",
        });
        if (cancelled) return;
        if (!json?.ok) {
          setError(json?.data?.error || "No se pudieron cargar los complementos");
          setAddons([]);
        } else {
          const payload = json.data?.data ?? json.data;
          const arr: CatalogAddon[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
            ? payload.data
            : [];
          setAddons(arr);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Error de red");
          setAddons([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lineType]);

  const lineLabel = useMemo(() => {
    const msisdn = lineDetails?.msisdn || line?.msisdn;
    if (msisdn) {
      const n = String(msisdn).replace(/^\+?34/, "");
      return `+34 ${n}`;
    }
    return ft?.phone || "";
  }, [line, lineDetails?.msisdn, ft]);

  const handleSelect = (addon: CatalogAddon) => {
    setSelectedAddon(addon);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedAddon || !lineId) return;
    setSubmitting(true);
    setError(null);
    try {
      // Refrescar saldo
      let curBalance = balance;
      try {
        invalidateLineDetails(lineId);
        const fresh = await fetchLineDetails(lineId, true);
        if (fresh) {
          setLineDetails(fresh);
          const b = Number((fresh as any)?.balance);
          if (Number.isFinite(b)) curBalance = b;
        }
      } catch {
        // ignore
      }

      const price = Number(selectedAddon.price) || 0;
      if (curBalance < price) {
        const deficit = Math.max(3, Math.ceil(price - curBalance));
        setConfirmOpen(false);
        setSubmitting(false);
        navigate(`/topup?amount=${deficit}&returnTo=/buy-addon`);
        return;
      }

      const { data: json } = await ftPost<any>("activate-line-addon", {
        line_id: lineId,
        addon_id: selectedAddon.id,
      });
      const inner = json?.data?.data ?? json?.data;
      const success = json?.ok && inner?.success !== false;

      const upstreamStatus = Number(json?.status);
      const upstreamMsg = String(inner?.message || inner?.error || "").toLowerCase();
      if (!success && (upstreamStatus === 402 || upstreamMsg.includes("insufficient"))) {
        const deficit = Math.max(3, Math.ceil(price - curBalance));
        setConfirmOpen(false);
        setSubmitting(false);
        navigate(`/topup?amount=${deficit}&returnTo=/buy-addon`);
        return;
      }

      if (!success) {
        const msg =
          inner?.error || inner?.message || json?.data?.error || "No se pudo activar el complemento";
        setError(String(msg));
        setSubmitting(false);
        return;
      }

      invalidateLineDetails(lineId);
      try {
        await fetchLineDetails(lineId, true);
      } catch {
        // ignore
      }
      toast({ title: "Complemento activado", description: selectedAddon.name });
      setConfirmOpen(false);
      navigate(-1);
    } catch (e: any) {
      setError(e?.message || "Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#A799B7" }}>
      <header className="px-6 py-4 flex items-center justify-center">
        <img src={logo} alt="Elia Balance" className="w-28 h-auto opacity-90" />
      </header>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 px-4 pb-16"
      >
        <div className="mx-auto w-full max-w-md">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Comprar Gb
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Elige un complemento para tu línea
            </p>
            {lineLabel && (
              <p className="mt-1 text-sm font-semibold text-[#FF7A1A]">
                {lineLabel}
              </p>
            )}
            <p className="mt-2 inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#A36BFF]">
              Saldo: €{fmt(balance)}
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl bg-white/95 px-5 py-4 text-sm text-red-600 shadow">
              {error}
            </div>
          )}

          {!loading && !error && addons.length === 0 && (
            <div className="rounded-2xl bg-white/95 px-5 py-4 text-sm text-gray-600 shadow">
              No hay complementos disponibles.
            </div>
          )}

          <div className="space-y-3">
            {addons.map((addon) => {
              const dataLabel = addon.is_unlimited_data
                ? "Datos ilimitados"
                : addon.gb
                ? `${addon.gb} Gb`
                : null;
              const voiceLabel = addon.is_unlimited_voice
                ? "Llamadas ilimitadas"
                : addon.minutes
                ? `${addon.minutes} min`
                : null;
              const smsLabel = addon.is_unlimited_sms
                ? "SMS ilimitados"
                : addon.sms
                ? `${addon.sms} SMS`
                : null;
              const durationLabel = addon.duration_days
                ? `${addon.duration_days} días`
                : null;
              const Icon = addon.gb || addon.is_unlimited_data
                ? Wifi
                : addon.minutes || addon.is_unlimited_voice
                ? PhoneIcon
                : addon.sms || addon.is_unlimited_sms
                ? MessageSquare
                : Plus;

              return (
                <div
                  key={addon.id}
                  className="rounded-2xl bg-white p-4 shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A36BFF]/10 shrink-0">
                        <Icon className="h-5 w-5 text-[#A36BFF]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[#2F2A33] truncate">
                          {addon.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {[dataLabel, voiceLabel, smsLabel, durationLabel]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-[#A36BFF] whitespace-nowrap">
                      €{fmt(addon.price)}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleSelect(addon)}
                      className="rounded-xl border border-[#A36BFF] px-5 py-2 text-sm font-semibold text-[#A36BFF] transition-all hover:bg-[#A36BFF] hover:text-white"
                    >
                      Seleccionar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.main>

      <Dialog open={confirmOpen} onOpenChange={(open) => !submitting && setConfirmOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar compra</DialogTitle>
          </DialogHeader>
          {selectedAddon && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2">
                {lineLabel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">para la línea</span>
                    <span className="font-semibold text-[#FF7A1A]">{lineLabel}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Complemento</span>
                  <span className="font-semibold text-foreground">{selectedAddon.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Precio</span>
                  <span className="font-bold text-[#FF7A1A]">€{fmt(selectedAddon.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo actual</span>
                  <span className="font-semibold text-foreground">€{fmt(balance)}</span>
                </div>
              </div>

              {balance < Number(selectedAddon.price || 0) ? (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-800">
                  Saldo insuficiente. Te redirigiremos a recargar.
                </div>
              ) : (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                  El importe se descontará de tu saldo y el complemento se activará al instante.
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#FF7A1A] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#FF7A1A]/30 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : balance < Number(selectedAddon?.price || 0) ? (
                "Recargar"
              ) : (
                "Confirmar"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyAddonPage;
