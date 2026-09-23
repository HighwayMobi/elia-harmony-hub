import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Shield, Loader2 } from "lucide-react";
import { ftPost } from "@/lib/api";
import { getFTSession } from "@/lib/ft-auth";
import { cn } from "@/lib/utils";

interface StripePaymentFormProps {
  amount: number;
  lineId: string | number;
  email?: string;
  saveCard?: boolean;
  onCancel: () => void;
  returnTo?: string;
  locale?: string;
}

// Locales soportados por Stripe Elements
const STRIPE_LOCALES = new Set([
  "auto","ar","bg","cs","da","de","el","en","en-GB","es","es-419","et","fi","fil","fr","fr-CA",
  "he","hr","hu","id","it","ja","ko","lt","lv","ms","mt","nb","nl","pl","pt","pt-BR","ro","ru",
  "sk","sl","sv","th","tr","vi","zh","zh-HK","zh-TW",
]);

const resolveStripeLocale = (lang?: string): string => {
  const raw = (lang || "es").toLowerCase();
  if (STRIPE_LOCALES.has(raw)) return raw;
  const base = raw.split("-")[0];
  if (STRIPE_LOCALES.has(base)) return base;
  return "es";
};

// Cache Stripe instances by publishable key
const stripeCache = new Map<string, Promise<Stripe | null>>();
const getStripe = (pk: string) => {
  if (!stripeCache.has(pk)) stripeCache.set(pk, loadStripe(pk));
  return stripeCache.get(pk)!;
};

const STRIPE_PUBLISHABLE_KEY = "pk_live_51UI2QU3qJq4dq0jX7Ky6LXklp7cI7WHnHgqSKhSaqxYWy7c9t3FqsI8vqBxI10VwLsb8ZvGpWJH4RxU1xol3xjSl00Dza0u8i0";

const maskSensitive = (value?: string) => {
  if (!value) return "";
  if (value.length <= 16) return `${value.slice(0, 4)}…${value.slice(-4)}`;
  return `${value.slice(0, 12)}…${value.slice(-6)} (len:${value.length})`;
};

const InnerForm = ({
  amount,
  email,
  onCancel,
  returnTo,
}: {
  amount: number;
  email?: string;
  onCancel: () => void;
  returnTo?: string;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const successParams = new URLSearchParams();
    if (returnTo) successParams.set("returnTo", returnTo);
    const returnUrl = `${window.location.origin}/payment-success?${successParams.toString()}`;
    // `redirect: "if_required"` evita el fallo cuando estamos dentro de un iframe
    // (preview de Lovable) donde Stripe no puede cambiar window.location.
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl, receipt_email: email || undefined },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message || "Error al procesar el pago");
      setSubmitting(false);
      return;
    }
    // Si no hubo redirect (3DS no requerido o iframe), navegamos manualmente.
    const status = paymentIntent?.status;
    if (status === "succeeded" || status === "processing" || status === "requires_capture") {
      successParams.set("redirect_status", status === "succeeded" ? "succeeded" : "processing");
      navigate(`/payment-success?${successParams.toString()}`);
    } else {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all",
          submitting
            ? "bg-[#F5E6D3]/70 text-[#A799B7] cursor-wait"
            : "bg-[#F5E6D3] text-[#A799B7] shadow-lg shadow-[#F5E6D3]/30 hover:brightness-110 active:scale-[0.98]"
        )}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitting ? "Procesando…" : `Pagar €${amount.toFixed(2)}`}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-center text-sm font-medium text-gray-500 hover:text-[#F5E6D3] transition-colors"
      >
        ← Volver
      </button>
      <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" />
          Pago seguro
        </div>
        <span>•</span>
        <span>Stripe</span>
        <span>•</span>
        <span>SSL</span>
      </div>
    </form>
  );
};

const StripePaymentForm = ({
  amount,
  lineId,
  email,
  saveCard,
  onCancel,
  returnTo,
  locale,
}: StripePaymentFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = getFTSession();
        console.log("Token:", maskSensitive(session?.token));
        console.log("Stripe key:", maskSensitive(STRIPE_PUBLISHABLE_KEY));
        console.log("Body:", { amount, line_id: lineId, save_card: saveCard });
        console.log("Body:", { amount, line_id: lineId, save_card: saveCard });
        const { data: json } = await ftPost<any>("billing-topup", {
          amount,
          line_id: lineId,
          ...(saveCard ? { save_card: true } : {}),
        });
        const inner = json?.data?.data ?? json?.data;
        if (!json?.ok || inner?.success === false) {
          throw new Error(
            inner?.error || inner?.message || "No se pudo iniciar el pago"
          );
        }
        if (cancelled) return;
        setClientSecret(inner?.client_secret || null);
        setPublishableKey(inner?.publishable_key || STRIPE_PUBLISHABLE_KEY);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Error de red");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amount, lineId, saveCard]);

  const stripePromise = useMemo(
    () => (publishableKey ? getStripe(publishableKey) : null),
    [publishableKey]
  );

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
        <button
          onClick={onCancel}
          className="text-sm font-medium text-[#F5E6D3] hover:underline"
        >
          ← Volver
        </button>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin text-[#F5E6D3]" />
        Preparando pago seguro…
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: resolveStripeLocale(locale) as any,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#F5E6D3",
            colorText: "#2F2A33",
            borderRadius: "12px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          },
        },
      }}
    >
      <InnerForm
        amount={amount}
        email={email}
        onCancel={onCancel}
        returnTo={returnTo}
      />
    </Elements>
  );
};

export default StripePaymentForm;
