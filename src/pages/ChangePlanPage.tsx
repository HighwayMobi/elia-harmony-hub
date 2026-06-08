import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Signal, Loader2, Wifi, Plane } from "lucide-react";
import { ftPost } from "@/lib/api";
import { fetchLineDetails, fetchLines, getCachedLineDetails, invalidateLineDetails } from "@/lib/api-cache";
import { filterVisibleLines, getFTSession, getSubscriptionIdFromToken, setFTSession } from "@/lib/ft-auth";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import logo from "@/assets/logo-elia-balance.svg";

type CatalogPlan = {
  id: string;
  name: string;
  price: number;
  gb?: number;
  minutes?: number;
  sms?: number;
  speed_mbps?: number;
  duration_days?: number;
  is_unlimited_data?: boolean;
  is_unlimited_voice?: boolean;
  is_unlimited_sms?: boolean;
};

const fmt = (n: number) => Number(n || 0).toFixed(2);

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmtDateDM = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTHS_ES[d.getUTCMonth()];
  return `${day} - ${month}`;
};

const fmtDateDot = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getUTCFullYear()}`;
};

const parseDateMaybe = (s?: string): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const ChangePlanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => {
    navigate("/", { replace: true });
  };
  const routeState = (location.state || {}) as { line?: any; lineDetails?: any };
  const ft = getFTSession();
  const [activeLine, setActiveLine] = useState<any>(() => routeState.line || ft?.line || ft?.lines?.[0] || null);
  const line: any = activeLine || ft?.line;
  const lineId = line?.id || ft?.line_id || ft?.lines?.[0]?.id || getSubscriptionIdFromToken(ft?.token);
  const lineType = ((line?.type || ft?.line?.type) as string) || "mobile";

  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CatalogPlan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [whenChange, setWhenChange] = useState<"now" | "later">("now");
  const [submitting, setSubmitting] = useState(false);
  const [lineDetails, setLineDetails] = useState<any>(() => routeState.lineDetails || getCachedLineDetails(lineId) || null);

  useEffect(() => {
    if (lineId || !ft?.token || ft?.auth_type === "subscriber") return;
    let cancelled = false;
    (async () => {
      try {
        const fetched = filterVisibleLines(await fetchLines());
        const first = fetched[0];
        if (!cancelled && first) {
          setActiveLine(first);
          setFTSession({ ...ft, line_id: first.id, line: first, lines: fetched });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lineId, ft]);

  useEffect(() => {
    if (!lineId) return;
    let cancelled = false;
    (async () => {
      try {
        if (!line?.id && ft?.auth_type !== "subscriber") {
          const fetched = filterVisibleLines(await fetchLines());
          const matched = fetched.find((l) => String(l.id) === String(lineId)) || fetched[0];
          if (matched) {
            setActiveLine(matched);
            setFTSession({ ...ft, line_id: matched.id, line: matched, lines: fetched });
          }
        }
        const data = await fetchLineDetails(lineId);
        if (!cancelled) {
          setLineDetails(data || null);
          if (data && typeof data === "object") {
            const hydratedLine = { id: lineId, ...(data as any) };
            setActiveLine(hydratedLine);
            if (ft) setFTSession({ ...ft, line_id: lineId, line: hydratedLine });
          }
        }
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
          kind: "plan",
        });
        if (cancelled) return;
        if (!json?.ok) {
          setError(json?.data?.error || "No se pudieron cargar los tarifas");
          setPlans([]);
        } else {
          const payload = json.data?.data ?? json.data;
          const arr: CatalogPlan[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
            ? payload.data
            : [];
          setPlans(arr);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Error de red");
          setPlans([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lineType]);

  const currentPlanName =
    lineDetails?.plan?.name ||
    lineDetails?.tariff_plan ||
    line?.plan?.name ||
    line?.tariff_plan ||
    "";
  const lineLabel = useMemo(() => {
    const msisdn = lineDetails?.msisdn || line?.msisdn;
    if (msisdn) {
      const n = String(msisdn).replace(/^\+?34/, "");
      return `+34 ${n}`;
    }
    return ft?.phone || "";
  }, [line, lineDetails?.msisdn, ft]);

  const currentPlanPrice =
    lineDetails?.plan?.price ?? line?.plan?.price ?? null;

  const currentPlan = useMemo(() => {
    const norm = (s: string) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\s*gb\b/g, "gb")
        .replace(/\s*\+\s*/g, "+");
    const byName = currentPlanName
      ? plans.find((p) => p.name && norm(p.name) === norm(currentPlanName))
      : null;
    if (byName) return byName;
    const byPlanShape = plans.find(
      (p) =>
        Number(p.price) === Number(currentPlanPrice) &&
        Number(p.gb || 0) === Number(lineDetails?.plan?.gb || 0) &&
        Boolean(p.is_unlimited_voice) === Boolean(lineDetails?.remains?.is_unlimited_voice)
    );
    if (byPlanShape) return byPlanShape;
    if (currentPlanPrice != null) {
      return (
        plans.find((p) => Number(p.price) === Number(currentPlanPrice)) || null
      );
    }
    return null;
  }, [plans, currentPlanName, currentPlanPrice, lineDetails?.plan?.gb, lineDetails?.remains?.is_unlimited_voice]);

  const soonDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }, []);

  const feeDate = useMemo(() => {
    return (
      lineDetails?.next_billing_date ||
      line?.next_billing_date ||
      line?.plan?.expire_at ||
      line?.expire_at ||
      ""
    );
  }, [line, lineDetails]);

  const TypeIcon = lineType === "fiber" ? Wifi : lineType === "travel" ? Plane : Signal;

  const handleSelectPlan = (plan: CatalogPlan) => {
    setSelectedPlan(plan);
    const isUpgrade =
      currentPlan !== null && plan.price > (currentPlan.price ?? 0);
    setWhenChange(isUpgrade ? "now" : "later");
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedPlan || !lineId) return;
    setSubmitting(true);
    setError(null);
    try {
      // 1. Refrescar info de la línea para comprobar saldo actual
      let balance: number | null = null;
      try {
        invalidateLineDetails(lineId);
        const fresh = await fetchLineDetails(lineId, true);
        if (fresh) {
          setLineDetails(fresh);
          balance = Number((fresh as any)?.balance ?? NaN);
        }
      } catch {
        // si falla, dejamos que el upstream decida
      }

      const price = Number(selectedPlan.price) || 0;
      if (Number.isFinite(balance as number) && (balance as number) < price) {
        const deficit = Math.max(3, Math.ceil(price - (balance as number)));
        setConfirmOpen(false);
        setSubmitting(false);
        navigate(`/topup?amount=${deficit}&returnTo=/change-plan`);
        return;
      }

      // 2. Solicitar cambio de tarifa
      const { data: json } = await ftPost<any>("change-line-plan", {
        line_id: lineId,
        plan_id: selectedPlan.id,
        apply_now: whenChange === "now",
      });
      const inner = json?.data?.data ?? json?.data;
      const success = json?.ok && (inner?.success !== false);

      // 3. Manejar saldo insuficiente desde el servidor (HTTP 402)
      const upstreamStatus = Number(json?.status);
      const upstreamMsg = String(inner?.message || inner?.error || "").toLowerCase();
      if (!success && (upstreamStatus === 402 || upstreamMsg.includes("insufficient"))) {
        const deficit = Math.max(
          3,
          Math.ceil(price - (Number.isFinite(balance as number) ? (balance as number) : 0))
        );
        setConfirmOpen(false);
        setSubmitting(false);
        navigate(`/topup?amount=${deficit}&returnTo=/change-plan`);
        return;
      }

      if (!success) {
        setError("No se pudo cambiar la tarifa. Inténtalo más tarde o contacta con soporte.");
        setSubmitting(false);
        return;
      }
      // After write op: invalidate cached line details and re-fetch once.
      invalidateLineDetails(lineId);
      try {
        const data = await fetchLineDetails(lineId, true);
        setLineDetails(data || null);
      } catch {
        // ignore
      }
      setConfirmOpen(false);
      goBack();
    } catch {
      setError("No se pudo cambiar la tarifa. Inténtalo más tarde o contacta con soporte.");
    } finally {
      setSubmitting(false);
    }
  };

  const isUpgrade =
    !!selectedPlan &&
    currentPlan !== null &&
    selectedPlan.price > (currentPlan?.price ?? 0);

  const effectiveDate =
    isUpgrade && whenChange === "now" ? soonDate : feeDate || "—";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#A799B7" }}>
      {error && (
        <div className="pointer-events-none fixed left-4 right-4 top-4 z-[70] flex justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-red-600 shadow-xl">
            {error}
          </div>
        </div>
      )}

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
            onClick={goBack}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Cambiar tarifa
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Elige una nueva tarifa para tu línea
            </p>
            {lineLabel && (
              <p className="mt-1 text-sm font-semibold text-[#FF7A1A]">
                {lineLabel}
              </p>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}

          {!loading && !error && plans.length === 0 && (
            <div className="rounded-2xl bg-white/95 px-5 py-4 text-sm text-gray-600 shadow">
              No hay tarifas disponibles para este tipo de línea.
            </div>
          )}

          <div className="space-y-3">
            {plans.map((plan) => {
              const isCurrent = !!currentPlan && currentPlan.id === plan.id;
              const dataLabel = plan.is_unlimited_data
                ? "Datos ilimitados"
                : plan.gb
                ? `${plan.gb} Gb`
                : null;
              const voiceLabel = plan.is_unlimited_voice
                ? "Llamadas ilimitadas"
                : plan.minutes
                ? `${plan.minutes} min`
                : null;
              const speedLabel = plan.speed_mbps
                ? `${plan.speed_mbps} Mbps`
                : null;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "rounded-2xl bg-white p-4 shadow-md transition-all",
                    isCurrent && "ring-2 ring-[#F5E6D3]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5E6D3]/10 shrink-0">
                        <TypeIcon className="h-5 w-5 text-[#F5E6D3]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[#2F2A33] truncate">
                          {plan.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {[speedLabel, dataLabel, voiceLabel]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-lg font-bold text-[#F5E6D3] whitespace-nowrap">
                        €{fmt(plan.price)}
                        <span className="text-xs font-normal text-gray-500">/mes</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      disabled={!!isCurrent}
                      onClick={() => handleSelectPlan(plan)}
                      className="rounded-xl border border-[#F5E6D3] px-5 py-2 text-sm font-semibold text-[#F5E6D3] transition-all hover:bg-[#F5E6D3] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#F5E6D3]"
                    >
                      {isCurrent ? "Actual" : "Seleccionar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.main>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar cambio de tarifa</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2">
                {lineLabel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">para la línea</span>
                    <span className="font-semibold text-[#FF7A1A]">{lineLabel}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nueva tarifa</span>
                  <span className="font-semibold text-foreground">
                    {selectedPlan.name}
                  </span>
                </div>
                {selectedPlan.gb !== undefined && !selectedPlan.is_unlimited_data && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Datos</span>
                    <span className="font-semibold text-foreground">
                      {selectedPlan.gb} GB
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cuota mensual</span>
                  <span className="font-bold text-[#FF7A1A]">
                    €{fmt(selectedPlan.price)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  ¿Cuándo aplicar la nueva tarifa?
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="whenChange"
                    value="now"
                    checked={whenChange === "now"}
                    onChange={() => setWhenChange("now")}
                    className="mt-1 accent-[#F5E6D3]"
                  />
                  <span className="text-sm text-foreground">
                    Pronto ({fmtDateDot(soonDate)})
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="whenChange"
                    value="later"
                    checked={whenChange === "later"}
                    onChange={() => setWhenChange("later")}
                    className="mt-1 accent-[#F5E6D3]"
                  />
                  <span className="text-sm text-foreground">
                    Al final del periodo pagado{feeDate ? ` (${fmtDateDot(feeDate)})` : ""}
                  </span>
                </label>
              </div>

              <div
                className={cn(
                  "rounded-xl border p-4 text-sm text-foreground",
                  isUpgrade && whenChange === "now"
                    ? "bg-green-50/50 border-green-300/50"
                    : "bg-primary/5 border-primary/20"
                )}
              >
                <p>
                  {whenChange === "later"
                    ? `La nueva tarifa entrará en vigor al finalizar el periodo pagado: ${fmtDateDot(effectiveDate)}.`
                    : `La nueva tarifa entrará en vigor el ${fmtDateDot(effectiveDate)}.`}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
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

export default ChangePlanPage;
