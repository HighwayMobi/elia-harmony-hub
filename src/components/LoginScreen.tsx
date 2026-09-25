import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setFTSession, FactoryTeleLine, filterVisibleLines, getSubscriptionIdFromToken } from "@/lib/ft-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LineTypeIcon, getLineTypeLabel } from "@/components/app/LineTypeIcon";
import logo from "@/assets/logo-elia-balance.svg";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type LoginMethod = "email" | "phone";

const LoginScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [method, setMethod] = useState<LoginMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotTab, setForgotTab] = useState<LoginMethod>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Set-password dialog (shown when has_password === false)
  const [setPwdOpen, setSetPwdOpen] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [setPwdLoading, setSetPwdLoading] = useState(false);

  // Line selection dialog (shown when auth_type === 'client' with multiple lines)
  const [lineOpen, setLineOpen] = useState(false);
  const [availableLines, setAvailableLines] = useState<FactoryTeleLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [pendingLineSession, setPendingLineSession] = useState<any>(null);

  const formatPhoneDisplay = (digits: string) => {
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6, 9);
    return [a, b, c].filter(Boolean).join(" ");
  };

  const formatLinePhone = (raw: string) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0034")) digits = digits.slice(4);
    if (digits.startsWith("34") && digits.length > 9) digits = digits.slice(2);
    return `+34 ${formatPhoneDisplay(digits)}`;
  };

  const sanitizePhone = (raw: string) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.length > 0 && !/[67]/.test(digits[0])) digits = "";
    return digits.slice(0, 9);
  };

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const validatePhone = (value: string) => /^[67]\d{8}$/.test(value);

  const getSubscriberLineSession = async (token: string) => {
    const subscriptionId = getSubscriptionIdFromToken(token);
    if (!subscriptionId) return {};

    let line: FactoryTeleLine = { id: subscriptionId } as FactoryTeleLine;
    try {
      const { data: detailsResp } = await supabase.functions.invoke(
        "get-line-details",
        { body: { token, line_id: subscriptionId } }
      );
      const payload = (detailsResp as any)?.data;
      const lineData = payload?.data ?? payload;
      if (lineData && typeof lineData === "object") {
        line = { id: subscriptionId, ...(lineData as any) } as FactoryTeleLine;
      }
    } catch (err) {
      console.warn("get-line-details (subscriber) error", err);
    }

    return { line_id: line.id, line, lines: [line] };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (method === "email") {
      if (!validateEmail(email)) {
        toast.error("Por favor ingresa un correo válido");
        return;
      }
    } else {
      if (!validatePhone(phone)) {
        toast.error("Móvil no válido (9 dígitos, empieza por 6 o 7)");
        return;
      }
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const loginBody =
          method === "email"
            ? { email: email.trim(), password }
            : { phone: `+34${phone}`, password };

        const { data, error } = await supabase.functions.invoke("login", {
          body: loginBody,
        });

        if (error || !data?.ok) {
          const upstream = (data as any)?.data;
          const status = (data as any)?.status;
          const rawMsg = (upstream?.message || upstream?.error || "").toString().toLowerCase();
          const isInvalidCreds =
            status === 401 ||
            rawMsg.includes("invalid credentials") ||
            rawMsg.includes("invalid") ||
            rawMsg.includes("incorrect");
          const message = isInvalidCreds
            ? "Usuario o contraseña incorrectos"
            : upstream?.message || upstream?.error || error?.message || "Credenciales incorrectas";
          toast.error(message);
        } else {
          // Edge fn returns { ok, status, data: <upstream body> }
          // upstream body shape (new): { token, refresh_token, has_password, auth_type, ... }
          // NOTE: lines are NO LONGER returned by login — fetched separately via get-account-lines.
          const upstreamBody = (data as any).data || {};
          const inner = upstreamBody.token ? upstreamBody : (upstreamBody.data || upstreamBody);
          const token =
            inner.token || inner.accessToken || inner.access_token;
          const hasPassword = inner.has_password;
          const authType = inner.auth_type;

          const sessionPayload: any = {
            token,
            refresh_token: inner.refresh_token,
            auth_type: authType,
            email: method === "email" ? email.trim() : undefined,
            phone: method === "phone" ? `+34${phone}` : undefined,
            user: inner.user,
            raw: inner,
          };

          if (hasPassword === false && !inner.is_service_otp) {
            // Force user to set a password before entering the app
            setPendingToken(token);
            setPendingSession(sessionPayload);
            setNewPassword("");
            setNewPasswordConfirm("");
            setSetPwdOpen(true);
          } else if (authType === "client") {
            // Fetch lines via separate endpoint
            let lines: FactoryTeleLine[] = [];
            try {
              const { data: linesResp } = await supabase.functions.invoke("get-account-lines", {
                body: { token },
              });
              const payload = (linesResp as any)?.data;
              const arr = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.lines)
                ? payload.lines
                : [];
              lines = filterVisibleLines(arr as FactoryTeleLine[]);
            } catch (err) {
              console.warn("get-account-lines error", err);
            }

            if (lines.length === 1) {
              // Pre-fetch line details so HomePage shows data instantly
              try {
                await supabase.functions.invoke("get-line-details", {
                  body: { token, line_id: lines[0].id },
                });
              } catch (err) {
                console.warn("get-line-details (login) error", err);
              }
              setFTSession({
                ...sessionPayload,
                line_id: lines[0].id,
                line: lines[0],
                lines,
              });
              toast.success("¡Bienvenido!");
            } else if (lines.length > 1) {
              setAvailableLines(lines);
              setSelectedLineId(String(lines[0].id));
              setPendingLineSession({ ...sessionPayload, lines });
              setLineOpen(true);
            } else {
              setFTSession(sessionPayload);
              toast.success("¡Bienvenido!");
            }
          } else if (authType === "subscriber") {
            // Subscriber token: there's no account-level lines list.
            // The JWT carries `subscription_id` — use it as the active line id
            // and fetch its details directly.
            setFTSession({
              ...sessionPayload,
              ...(await getSubscriberLineSession(token)),
            });
            toast.success("¡Bienvenido!");
          } else {
            setFTSession(sessionPayload);
            toast.success("¡Bienvenido!");
          }
        }
      } else {
        const signUpPayload =
          method === "email"
            ? {
                email: email.trim(),
                password,
                options: { emailRedirectTo: `${window.location.origin}/` },
              }
            : { phone: `+34${phone}`, password };

        const { error } = await supabase.auth.signUp(signUpPayload as any);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Esta cuenta ya está registrada");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("¡Cuenta creada exitosamente!");
        }
      }
    } catch {
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPasswordSubmit = async () => {
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (!pendingToken) {
      toast.error("Sesión no válida. Inicia sesión de nuevo.");
      setSetPwdOpen(false);
      return;
    }
    setSetPwdLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("set-password", {
        body: { password: newPassword, token: pendingToken },
      });
      if (error || !data?.ok) {
        const upstream = (data as any)?.data;
        const message =
          upstream?.message ||
          upstream?.error ||
          error?.message ||
          "No se pudo establecer la contraseña";
        toast.error(message);
        return;
      }
      if (pendingSession) {
        const subscriberLine = pendingSession.auth_type === "subscriber"
          ? await getSubscriberLineSession(pendingToken)
          : {};
        setFTSession({ ...pendingSession, ...subscriberLine });
      }
      setSetPwdOpen(false);
      toast.success("Contraseña establecida. ¡Bienvenido!");
    } catch {
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setSetPwdLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    if (forgotTab === "email") {
      if (!validateEmail(forgotEmail)) {
        toast.error("Correo no válido");
        return;
      }
    } else {
      if (!validatePhone(forgotPhone)) {
        toast.error("Móvil no válido");
        return;
      }
    }

    setForgotLoading(true);
    try {
      const body =
        forgotTab === "email"
          ? { email: forgotEmail.trim() }
          : { phone: `+34${forgotPhone}` };

      const { data, error } = await supabase.functions.invoke("request-otp", {
        body,
      });

      if (error || !data?.ok) {
        const upstream = (data as any)?.data;
        const rawMsg =
          upstream?.message ||
          upstream?.error ||
          error?.message ||
          "";
        const notFound =
          rawMsg === "subscription not found" ||
          rawMsg === "customer not found" ||
          /not.?found/i.test(rawMsg);
        const message = notFound
          ? "Teléfono o email incorrecto"
          : rawMsg || "No se pudo enviar el código. Intenta de nuevo.";
        toast.error(message);
        return;
      }

      toast.success(
        forgotTab === "email"
          ? "Te enviamos un código a tu correo"
          : "Te enviamos un código por SMS"
      );
      setForgotOpen(false);
    } catch {
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setForgotLoading(false);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative w-full h-full flex flex-col items-center justify-center px-8"
    >
      <LanguageSwitcher className="absolute right-5 top-5" />
      <motion.img
        src={logo}
        alt="Elia Balance"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-40 md:w-48 h-auto mb-10"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Method tabs */}
        <div className="flex bg-[#F5E6D3]/10 rounded-xl p-1 mb-5">
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              method === "email"
                ? "bg-[#F5E6D3] text-[#A799B7]"
                : "text-[#2F2A33]/80 hover:text-[#F5E6D3]"
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            type="button"
            onClick={() => setMethod("phone")}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              method === "phone"
                ? "bg-[#F5E6D3] text-[#A799B7]"
                : "text-[#2F2A33]/80 hover:text-[#F5E6D3]"
            }`}
          >
            <Phone className="w-4 h-4" />
            Mi móvil
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {method === "email" ? (
              <Input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-12 bg-white border-[#F5E6D3]/30 text-[#2F2A33] placeholder:text-[#2F2A33]/40 rounded-xl focus:border-[#F5E6D3] focus:ring-[#F5E6D3]/30"
              />
            ) : (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2F2A33]/80 font-medium pointer-events-none select-none">
                  +34
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="600 000 000"
                  value={formatPhoneDisplay(phone)}
                  onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                  disabled={loading}
                  maxLength={11}
                  className="h-12 bg-white border-[#F5E6D3]/30 text-[#2F2A33] placeholder:text-[#2F2A33]/40 rounded-xl focus:border-[#F5E6D3] focus:ring-[#F5E6D3]/30 pl-14 tracking-wide"
                />
              </div>
            )}

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-12 bg-white border-[#F5E6D3]/30 text-[#2F2A33] placeholder:text-[#2F2A33]/40 rounded-xl focus:border-[#F5E6D3] focus:ring-[#F5E6D3]/30 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2F2A33]/60 hover:text-[#2F2A33] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {isLogin && (
            <button
              type="button"
              onClick={() => {
                setForgotTab(method);
                setForgotEmail(email);
                setForgotPhone(phone);
                setForgotOpen(true);
              }}
              disabled={loading}
              className="text-sm text-[#2F2A33]/70 hover:text-[#F5E6D3] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#F5E6D3] hover:bg-[#efe0cc] text-[#A799B7] font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? (
              "Iniciar sesión"
            ) : (
              "Registrarse"
            )}
          </Button>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center mt-6 text-[#2F2A33]/70"
        >
          {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="text-[#2F2A33] font-medium hover:underline"
          >
            {isLogin ? "Regístrate" : "Inicia sesión"}
          </button>
        </motion.p>
      </motion.div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md border-0 rounded-3xl bg-[#A799B7] text-[#2F2A33] shadow-2xl [&>button]:text-[#2F2A33]/70 [&>button]:hover:text-[#F5E6D3]">
          <DialogHeader>
            <DialogTitle className="text-[#2F2A33] text-xl">
              Recuperar contraseña
            </DialogTitle>
            <DialogDescription className="text-[#2F2A33]/70">
              Elige cómo quieres recibir las instrucciones para restablecer tu
              contraseña.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Tabs */}
            <div className="flex rounded-xl bg-[#F5E6D3]/10 p-1">
              <button
                type="button"
                onClick={() => setForgotTab("email")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  forgotTab === "email"
                    ? "bg-[#F5E6D3] text-[#A799B7] shadow-sm"
                    : "text-[#2F2A33]/80 hover:text-[#F5E6D3]"
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setForgotTab("phone")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  forgotTab === "phone"
                    ? "bg-[#F5E6D3] text-[#A799B7] shadow-sm"
                    : "text-[#2F2A33]/80 hover:text-[#F5E6D3]"
                }`}
              >
                <Phone className="h-4 w-4" />
                Mi móvil
              </button>
            </div>

            <p className="text-sm text-[#2F2A33]/70">
              {forgotTab === "email"
                ? "Te enviaremos un enlace al correo para restablecer la contraseña."
                : "Te enviaremos un código por SMS para acceder y cambiar tu contraseña."}
            </p>

            {forgotTab === "email" ? (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2F2A33]/60 z-10" />
                <Input
                  type="email"
                  placeholder="mail@ejemplo.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotLoading}
                  className="pl-10 h-12 rounded-xl bg-white border-[#F5E6D3]/30 text-[#2F2A33] placeholder:text-[#2F2A33]/40 focus:border-[#F5E6D3] focus:ring-[#F5E6D3]/30"
                />
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2F2A33]/80 font-medium pointer-events-none select-none">
                  +34
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="600 000 000"
                  value={formatPhoneDisplay(forgotPhone)}
                  onChange={(e) =>
                    setForgotPhone(sanitizePhone(e.target.value))
                  }
                  disabled={forgotLoading}
                  maxLength={11}
                  className="h-12 rounded-xl bg-white border-[#F5E6D3]/30 text-[#2F2A33] placeholder:text-[#2F2A33]/40 focus:border-[#F5E6D3] focus:ring-[#F5E6D3]/30 pl-14 tracking-wide"
                />
              </div>
            )}

            <Button
              type="button"
              onClick={handleForgotSubmit}
              disabled={forgotLoading}
              className="w-full h-12 bg-[#F5E6D3] hover:bg-[#efe0cc] text-[#A799B7] font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {forgotLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Enviar código"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mandatory Set Password Dialog */}
      <Dialog
        open={setPwdOpen}
        onOpenChange={(open) => {
          // Block closing — user must set a password
          if (!open) return;
          setSetPwdOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-md border-0 rounded-3xl bg-[#A799B7] text-[#2F2A33] shadow-2xl [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-[#2F2A33] text-xl">
              Establece una contraseña
            </DialogTitle>
            <DialogDescription className="text-[#2F2A33]/70">
              Para continuar, crea una contraseña segura para tu cuenta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={setPwdLoading}
                className="h-12 bg-white border-[#F5E6D3]/30 text-[#2F2A33] placeholder:text-[#2F2A33]/40 rounded-xl focus:border-[#F5E6D3] focus:ring-[#F5E6D3]/30 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2F2A33]/60 hover:text-[#2F2A33] transition-colors"
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <Input
              type={showNewPassword ? "text" : "password"}
              placeholder="Confirmar contraseña"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              disabled={setPwdLoading}
              className="h-12 bg-white border-[#F5E6D3]/30 text-[#2F2A33] placeholder:text-[#2F2A33]/40 rounded-xl focus:border-[#F5E6D3] focus:ring-[#F5E6D3]/30"
            />

            <Button
              type="button"
              onClick={handleSetPasswordSubmit}
              disabled={setPwdLoading}
              className="w-full h-12 bg-[#F5E6D3] hover:bg-[#efe0cc] text-[#A799B7] font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {setPwdLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "ESTABLECER NUEVA CONTRASEÑA"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Line selection Dialog */}
      <Dialog
        open={lineOpen}
        onOpenChange={(open) => {
          if (!open) return;
          setLineOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-md border-0 rounded-3xl bg-[#A799B7] text-[#2F2A33] shadow-2xl [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-[#2F2A33] text-xl">
              Selecciona una línea
            </DialogTitle>
            <DialogDescription className="text-[#2F2A33]/70">
              Tu cuenta tiene varias líneas asociadas. Elige con cuál continuar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Select value={selectedLineId} onValueChange={setSelectedLineId}>
              <SelectTrigger className="h-12 bg-white border-[#F5E6D3]/30 text-[#2F2A33] rounded-xl">
                <SelectValue placeholder="Selecciona una línea" />
              </SelectTrigger>
              <SelectContent>
                {availableLines.map((l) => (
                  <SelectItem key={String(l.id)} value={String(l.id)}>
                    <div className="flex items-center gap-2">
                      <LineTypeIcon type={l.type} size="sm" />
                      <span>
                        {l.msisdn
                          ? formatLinePhone(l.msisdn)
                          : l.tariff_plan || getLineTypeLabel(l.type)}
                        {l.msisdn && l.tariff_plan ? ` — ${l.tariff_plan}` : ""}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              onClick={async () => {
                const line = availableLines.find(
                  (l) => String(l.id) === selectedLineId
                );
                if (!line || !pendingLineSession) {
                  toast.error("Selecciona una línea válida");
                  return;
                }
                try {
                  await supabase.functions.invoke("get-line-details", {
                    body: { token: pendingLineSession.token, line_id: line.id },
                  });
                } catch (err) {
                  console.warn("get-line-details (login) error", err);
                }
                setFTSession({
                  ...pendingLineSession,
                  line_id: line.id,
                  line,
                });
                setLineOpen(false);
                toast.success("¡Bienvenido!");
              }}
              className="w-full h-12 bg-[#F5E6D3] hover:bg-[#efe0cc] text-[#A799B7] font-medium rounded-xl transition-all"
            >
              CONTINUAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default LoginScreen;
