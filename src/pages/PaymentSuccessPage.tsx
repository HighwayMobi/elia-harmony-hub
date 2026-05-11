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
  const [countdown, setCountdown] = useState(4);

  const isSuccess = !status || status === "succeeded" || status === "processing";

  useEffect(() => {
    if (!isSuccess) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    const to = setTimeout(() => navigate(returnTo), 4000);
    return () => {
      clearInterval(id);
      clearTimeout(to);
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
              Volviendo en {Math.max(0, countdown)}s…
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
