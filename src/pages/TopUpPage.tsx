import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CreditCard, Shield, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFTSession, getSubscriptionIdFromToken } from "@/lib/ft-auth";
import { fetchProfile, fetchLines, getCachedProfile, getCachedLines } from "@/lib/api-cache";
import { ftPost } from "@/lib/api";
import StripePaymentForm from "@/components/StripePaymentForm";

interface SavedCard {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default?: boolean;
}

const formatExpiry = (m?: number, y?: number) => {
  if (!m || !y) return "";
  const mm = String(m).padStart(2, "0");
  const yy = String(y).slice(-2);
  return `${mm}/${yy}`;
};

const brandLabel = (b?: string) => {
  if (!b) return "Tarjeta";
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    diners: "Diners",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return map[b.toLowerCase()] || b.charAt(0).toUpperCase() + b.slice(1);
};

const amountPresets = [5, 10, 20, 50];

const fmtPrice = (n: number) =>
  Number.isFinite(n) ? n.toFixed(2) : "0.00";

const TopUpPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialAmount = searchParams.get("amount") || "";
  const returnTo = searchParams.get("returnTo") || undefined;

  const [phone, setPhone] = useState<string>("");
  const [lineId, setLineId] = useState<string | number | null>(null);
  const [email, setEmail] = useState<string>("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [amount, setAmount] = useState<string>(initialAmount);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(() => {
    const n = parseFloat(initialAmount);
    return amountPresets.includes(n) ? n : null;
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const [deletingCard, setDeletingCard] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const loadPaymentMethods = async () => {
    setLoadingCards(true);
    try {
      const { data: json } = await ftPost<any>("billing-payment-methods", { action: "list" });
      const inner = json?.data?.data ?? json?.data;
      const list: any[] =
        (Array.isArray(inner) && inner) ||
        inner?.payment_methods ||
        inner?.data ||
        inner?.items ||
        [];
      if (Array.isArray(list) && list.length > 0) {
        const def = list.find((c) => c?.is_default) || list[0];
        setSavedCard({
          id: def.id || def.pm_id || def.payment_method_id,
          brand: def.brand || def.card?.brand,
          last4: def.last4 || def.card?.last4,
          exp_month: def.exp_month || def.card?.exp_month,
          exp_year: def.exp_year || def.card?.exp_year,
          is_default: def.is_default,
        });
      } else {
        setSavedCard(null);
      }
    } catch {
      setSavedCard(null);
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    const ft = getFTSession();
    const cachedProfile = getCachedProfile();
    const cachedLines = getCachedLines();
    const line: any = ft?.line || cachedLines?.[0] || null;
    const id = line?.id || ft?.line_id || getSubscriptionIdFromToken(ft?.token) || null;
    if (id) setLineId(id);
    const msisdn = line?.msisdn || ft?.phone || "";
    if (msisdn) {
      const clean = String(msisdn).replace(/\D/g, "");
      setPhone(clean.startsWith("34") ? `+${clean.slice(0, 2)} ${clean.slice(2)}` : `+${clean}`);
    }
    setEmail(cachedProfile?.email || ft?.email || "");

    fetchProfile().then((p) => p?.email && setEmail((cur) => cur || p.email!)).catch(() => {});
    fetchLines().then((arr) => {
      const first: any = (arr as any[])?.[0];
      if (first?.id && !id) setLineId(first.id);
      const m = first?.msisdn;
      if (m && !msisdn) {
        const clean = String(m).replace(/\D/g, "");
        setPhone(clean.startsWith("34") ? `+${clean.slice(0, 2)} ${clean.slice(2)}` : `+${clean}`);
      }
    }).catch(() => {});

    loadPaymentMethods();

    const onFocus = () => loadPaymentMethods();
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadPaymentMethods();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Re-fetch saved cards whenever we return from the Stripe form
  useEffect(() => {
    if (!showPaymentForm) loadPaymentMethods();
  }, [showPaymentForm]);

  const handleDeleteCard = async () => {
    if (!savedCard?.id) return;
    setDeletingCard(true);
    try {
      await ftPost("billing-payment-methods", { action: "delete", pm_id: savedCard.id });
      await loadPaymentMethods();
    } catch {
      // ignore
    } finally {
      setDeletingCard(false);
    }
  };

  const handlePayWithSavedCard = async () => {
    if (!lineId || !savedCard) return;
    setPaying(true);
    setPayError(null);
    try {
      const { data: json } = await ftPost<any>("billing-topup", {
        amount: displayAmount,
        line_id: lineId,
      });
      const inner = json?.data?.data ?? json?.data;
      if (!json?.ok || inner?.success === false) {
        throw new Error(inner?.error || inner?.message || "No se pudo procesar el pago");
      }
      const params = new URLSearchParams();
      if (returnTo) params.set("returnTo", returnTo);
      params.set("redirect_status", "succeeded");
      navigate(`/payment-success?${params.toString()}`);
    } catch (e: any) {
      setPayError(e?.message || "Error de red");
      setPaying(false);
    }
  };

  const handlePreset = (v: number) => {
    setSelectedPreset(v);
    setAmount(String(v));
  };

  const handleAmountChange = (v: string) => {
    setAmount(v);
    const n = parseFloat(v);
    setSelectedPreset(amountPresets.includes(n) ? n : null);
  };

  const displayAmount = amount ? parseFloat(amount) : 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValid = displayAmount >= 3 && isEmailValid && phone.length > 0 && !!lineId;
  const showEmailError = email.length > 0 && !isEmailValid;

  return (
    <div className="min-h-screen bg-[#F5F3F7]">
      <div className="mx-auto max-w-md px-4 pt-4 pb-10">
        <button
          onClick={() => {
            if (showPaymentForm) {
              setShowPaymentForm(false);
              return;
            }
            if (returnTo) {
              navigate(returnTo);
            } else if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}
          className="flex items-center gap-1 text-sm font-medium text-[#2F2A33] hover:text-[#F5E6D3] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </button>

        <h1 className="mt-3 text-center text-2xl font-bold text-[#2F2A33]">
          Recargar saldo
        </h1>

        <div className="mt-5 rounded-2xl bg-white p-5 shadow-lg">
          {showPaymentForm && lineId ? (
            <>
              <div className="mb-4 rounded-xl bg-[#F5F3F7] px-4 py-3">
                <span className="text-xs text-gray-500">Total a pagar</span>
                <span className="mt-1 block text-lg font-bold text-[#2F2A33]">
                  €{fmtPrice(displayAmount)}
                </span>
              </div>
              <StripePaymentForm
                amount={displayAmount}
                lineId={lineId}
                email={email}
                saveCard={saveCard}
                onCancel={() => setShowPaymentForm(false)}
                returnTo={returnTo}
              />
            </>
          ) : (
            <>
              {/* Phone (readonly) */}
              <div className="mb-5 rounded-xl bg-[#F5F3F7] px-4 py-3">
                <span className="text-xs text-gray-500">Número de teléfono</span>
                <span className="mt-1 block text-sm font-semibold text-[#2F2A33]">
                  {phone || "—"}
                </span>
              </div>

              {/* Amount */}
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-[#2F2A33]">
                  Importe
                </label>
                <div className="mb-3 grid grid-cols-4 gap-2">
                  {amountPresets.map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePreset(p)}
                      className={cn(
                        "rounded-xl border py-2.5 text-sm font-semibold transition-all",
                        selectedPreset === p
                          ? "border-[#F5E6D3] bg-[#F5E6D3] text-[#A799B7] shadow-md shadow-[#F5E6D3]/25"
                          : "border-gray-200 bg-white text-[#2F2A33] hover:border-[#F5E6D3]/40 hover:bg-[#F5E6D3]/5"
                      )}
                    >
                      €{p}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                    €
                  </span>
                  <input
                    type="number"
                    min="3"
                    placeholder="Otro importe (min. €3)"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-8 pr-4 text-sm text-[#2F2A33] placeholder:text-gray-400 focus:border-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#F5E6D3]/20 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mb-6 rounded-xl bg-[#F5F3F7] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Email para el recibo</span>
                  {editingEmail ? (
                    <button
                      onClick={() => setEditingEmail(false)}
                      className="text-xs font-medium text-[#F5E6D3] hover:underline"
                    >
                      OK
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingEmail(true)}
                      className="flex items-center gap-1 text-xs font-medium text-[#F5E6D3] hover:underline"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {editingEmail ? (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@ejemplo.com"
                      className={cn(
                        "mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#2F2A33] focus:outline-none focus:ring-2 transition-all",
                        showEmailError
                          ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                          : "border-gray-200 focus:border-[#F5E6D3] focus:ring-[#F5E6D3]/20"
                      )}
                    />
                    {showEmailError && (
                      <p className="mt-1 text-xs text-red-500">Email no válido</p>
                    )}
                  </>
                ) : (
                <span className="mt-1 block text-sm font-semibold text-[#2F2A33]">
                    {email || "—"}
                  </span>
                )}
              </div>

              {/* Saved card or save-card checkbox */}
              {loadingCards ? (
                <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-[#F5F3F7] px-4 py-3 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cargando métodos de pago…
                </div>
              ) : savedCard ? (
                <div className="mb-5 rounded-xl bg-[#F5F3F7] px-4 py-3">
                  <div className="mb-2 text-xs text-gray-500">Tarjeta guardada</div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-12 items-center justify-center rounded bg-white text-[10px] font-bold text-[#2F2A33] shadow-sm">
                        {brandLabel(savedCard.brand)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#2F2A33]">
                          •••• {savedCard.last4 || "----"}
                        </div>
                        {formatExpiry(savedCard.exp_month, savedCard.exp_year) && (
                          <div className="text-xs text-gray-500">
                            Caduca {formatExpiry(savedCard.exp_month, savedCard.exp_year)}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDeleteCard}
                      disabled={deletingCard}
                      className="flex items-center gap-1 text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                    >
                      {deletingCard ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-5 flex items-start gap-3 rounded-xl bg-[#F5F3F7] px-4 py-3">
                  <input
                    id="save-card"
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#F5E6D3] focus:ring-[#F5E6D3]"
                  />
                  <div>
                    <label htmlFor="save-card" className="block text-sm font-medium text-[#2F2A33]">
                      Guardar tarjeta para pagos automáticos
                    </label>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Tu tarjeta se guardará de forma segura para renovaciones automáticas
                    </p>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="mb-5 rounded-xl bg-[#F5F3F7] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Importe a recargar</span>
                  <span className="font-mono text-lg font-bold text-[#2F2A33]">
                    €{fmtPrice(displayAmount)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Comisión</span>
                  <span className="text-sm font-semibold text-emerald-600">Gratis</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="text-sm font-semibold text-[#2F2A33]">Total</span>
                  <span className="font-mono text-xl font-bold text-[#2F2A33]">
                    €{fmtPrice(displayAmount)}
                  </span>
                </div>
              </div>

              {payError && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {payError}
                </div>
              )}
              <button
                disabled={!isValid || paying}
                onClick={() => {
                  if (savedCard) {
                    handlePayWithSavedCard();
                  } else {
                    setShowPaymentForm(true);
                  }
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all",
                  isValid && !paying
                    ? "bg-[#F5E6D3] text-[#A799B7] shadow-lg shadow-[#F5E6D3]/30 hover:brightness-110 active:scale-[0.98]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                {paying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {paying
                  ? "Procesando…"
                  : savedCard
                  ? `Pagar con •••• ${savedCard.last4 || ""}`
                  : "Pagar con tarjeta"}
              </button>

              <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Pago seguro
                </div>
                <span>•</span>
                <span>Stripe</span>
                <span>•</span>
                <span>SSL</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopUpPage;
