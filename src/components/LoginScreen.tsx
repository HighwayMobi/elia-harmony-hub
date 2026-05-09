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
import { setFTSession } from "@/lib/ft-auth";
import { toast } from "sonner";
import logo from "@/assets/logo-elia-balance.svg";

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

  const formatPhoneDisplay = (digits: string) => {
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6, 9);
    return [a, b, c].filter(Boolean).join(" ");
  };

  const sanitizePhone = (raw: string) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.length > 0 && !/[67]/.test(digits[0])) digits = "";
    return digits.slice(0, 9);
  };

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const validatePhone = (value: string) => /^[67]\d{8}$/.test(value);

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
          const message =
            upstream?.message ||
            upstream?.error ||
            error?.message ||
            "Credenciales incorrectas";
          toast.error(message);
        } else {
          const upstream = (data as any).data || {};
          setFTSession({
            token: upstream.token || upstream.accessToken || upstream.access_token,
            email: method === "email" ? email.trim() : undefined,
            phone: method === "phone" ? `+34${phone}` : undefined,
            user: upstream.user,
            raw: upstream,
          });
          toast.success("¡Bienvenido!");
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
        const message =
          upstream?.message ||
          upstream?.error ||
          error?.message ||
          "No se pudo enviar el código. Intenta de nuevo.";
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
      className="w-full h-full flex flex-col items-center justify-center px-8"
    >
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
        <div className="flex bg-white/15 rounded-xl p-1 mb-5">
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              method === "email"
                ? "bg-white/90 text-[#A799B7]"
                : "text-white/80 hover:text-white"
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
                ? "bg-white/90 text-[#A799B7]"
                : "text-white/80 hover:text-white"
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
                className="h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl focus:border-white/50 focus:ring-white/20"
              />
            ) : (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 font-medium pointer-events-none select-none">
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
                  className="h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl focus:border-white/50 focus:ring-white/20 pl-14 tracking-wide"
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
                className="h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl focus:border-white/50 focus:ring-white/20 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors"
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
              className="text-sm text-white/70 hover:text-white transition-colors"
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
          className="text-center mt-6 text-white/70"
        >
          {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="text-white font-medium hover:underline"
          >
            {isLogin ? "Regístrate" : "Inicia sesión"}
          </button>
        </motion.p>
      </motion.div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md border-0 rounded-3xl bg-[#A799B7] text-white shadow-2xl [&>button]:text-white/70 [&>button]:hover:text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Recuperar contraseña
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Elige cómo quieres recibir las instrucciones para restablecer tu
              contraseña.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Tabs */}
            <div className="flex rounded-xl bg-white/15 p-1">
              <button
                type="button"
                onClick={() => setForgotTab("email")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  forgotTab === "email"
                    ? "bg-white/90 text-[#A799B7] shadow-sm"
                    : "text-white/80 hover:text-white"
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
                    ? "bg-white/90 text-[#A799B7] shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Phone className="h-4 w-4" />
                Mi móvil
              </button>
            </div>

            <p className="text-sm text-white/70">
              {forgotTab === "email"
                ? "Te enviaremos un enlace al correo para restablecer la contraseña."
                : "Te enviaremos un código por SMS para acceder y cambiar tu contraseña."}
            </p>

            {forgotTab === "email" ? (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60 z-10" />
                <Input
                  type="email"
                  placeholder="mail@ejemplo.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotLoading}
                  className="pl-10 h-12 rounded-xl bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 focus:ring-white/20"
                />
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 font-medium pointer-events-none select-none">
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
                  className="h-12 rounded-xl bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 focus:ring-white/20 pl-14 tracking-wide"
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
    </motion.div>
  );
};

export default LoginScreen;
