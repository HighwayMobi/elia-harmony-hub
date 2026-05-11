import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { getFTSession, getSubscriptionIdFromToken } from "@/lib/ft-auth";
import { fetchLineDetails, invalidateLineDetails } from "@/lib/api-cache";

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") || "/";
  const status = params.get("redirect_status"); // succeeded | processing | requires_payment_method | failed
  const [countdown, setCountdown] = useState(5);
  const [refreshing, setRefreshing] = useState(false);

  const isSuccess = !status || status === "succeeded" || status === "processing";

  useEffect(() => {
    if (!isSuccess) return;
    const ft = getFTSession();
    const lineId =
      ft?.line?.id ||
      ft?.line_id ||
      ft?.lines?.[0]?.id ||
      getSubscriptionIdFromToken(ft?.token);

    // Esperar 3 s para dar tiempo al webhook del backend a actualizar el saldo,
    // y entonces consultar GET /account/lines/:id.
    const refreshTimer = setTimeout(async () => {
      if (!lineId) return;
      setRefreshing(true);
      try {
        invalidateLineDetails(lineId);
        await fetchLineDetails(lineId, true);
      } catch {
        // ignore
      } finally {
        setRefreshing(false);
      }
    }, 3000);

    const tick = setInterval(() => setCountdown((c) => c - 1), 1000);
    const redirect = setTimeout(() => navigate(returnTo), 5000);
    return () => {
      clearTimeout(refreshTimer);
      clearInterval(tick);
      clearTimeout(redirect);
    };
  }, [isSuccess, navigate, returnTo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F3F7] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        {isSuccess ? (
          <>
            {status === "processing" ? (
              <Loader2 className="mx-auto h-16 w-16 text-[#A36BFF] animate-spin" />
            ) : (
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
            )}
            <h1 className="mt-4 text-2xl font-bold text-[#2F2A33]">
              {status === "processing" ? "Procesando pago…" : "¡Pago realizado!"}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {status === "processing"
                ? "El pago se está procesando. Recibirás una confirmación en breve."
                : "Tu saldo se actualizará en unos instantes."}
            </p>
            <p className="mt-4 text-xs text-gray-400">
              {refreshing ? "Actualizando saldo…" : `Volviendo en ${Math.max(0, countdown)}s…`}
            </p>
            <button
              onClick={() => navigate(returnTo)}
              className="mt-6 w-full rounded-xl bg-[#A36BFF] py-3 text-sm font-semibold text-[#FFF6E8] shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Volver ahora
            </button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="mt-4 text-2xl font-bold text-[#2F2A33]">
              Pago no completado
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              No se pudo procesar el pago. Inténtalo de nuevo.
            </p>
            <button
              onClick={() => navigate(returnTo)}
              className="mt-6 w-full rounded-xl bg-[#A36BFF] py-3 text-sm font-semibold text-[#FFF6E8] shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Volver
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
