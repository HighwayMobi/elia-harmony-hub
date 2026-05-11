import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Signal, Loader2, Wifi, Plane } from "lucide-react";
import { ftPost } from "@/lib/api";
import { getFTSession } from "@/lib/ft-auth";
import { cn } from "@/lib/utils";
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

const ChangePlanPage = () => {
  const navigate = useNavigate();
  const ft = getFTSession();
  const line = ft?.line;
  const lineType = (line?.type as string) || "mobile";

  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const currentPlanName = line?.tariff_plan || "";
  const lineLabel = useMemo(() => {
    if (line?.msisdn) {
      const n = String(line.msisdn).replace(/^\+?34/, "");
      return `+34 ${n}`;
    }
    return ft?.phone || "";
  }, [line, ft]);

  const TypeIcon = lineType === "fiber" ? Wifi : lineType === "travel" ? Plane : Signal;

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

          {!loading && error && (
            <div className="rounded-2xl bg-white/95 px-5 py-4 text-sm text-red-600 shadow">
              {error}
            </div>
          )}

          {!loading && !error && plans.length === 0 && (
            <div className="rounded-2xl bg-white/95 px-5 py-4 text-sm text-gray-600 shadow">
              No hay tarifas disponibles para este tipo de línea.
            </div>
          )}

          <div className="space-y-3">
            {plans.map((plan) => {
              const isCurrent =
                currentPlanName &&
                plan.name &&
                plan.name.trim().toLowerCase() ===
                  currentPlanName.trim().toLowerCase();
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
                    isCurrent && "ring-2 ring-[#A36BFF]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A36BFF]/10 shrink-0">
                        <TypeIcon className="h-5 w-5 text-[#A36BFF]" />
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
                      <span className="text-lg font-bold text-[#A36BFF] whitespace-nowrap">
                        €{fmt(plan.price)}
                        <span className="text-xs font-normal text-gray-500">/mes</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      disabled={!!isCurrent}
                      className="rounded-xl border border-[#A36BFF] px-5 py-2 text-sm font-semibold text-[#A36BFF] transition-all hover:bg-[#A36BFF] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#A36BFF]"
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
    </div>
  );
};

export default ChangePlanPage;
