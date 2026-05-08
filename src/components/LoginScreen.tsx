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
      const credentials =
        method === "email"
          ? { email: email.trim(), password }
          : { phone: `+34${phone}`, password };

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword(credentials as any);
        if (error) {
          if (error.message === "Invalid login credentials") {
            toast.error(
              method === "email"
                ? "Correo o contraseña incorrectos"
                : "Móvil o contraseña incorrectos"
            );
          } else {
            toast.error(error.message);
          }
        } else {
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
      if (forgotTab === "email") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          forgotEmail.trim(),
          { redirectTo: `${window.location.origin}/` }
        );
        if (error) toast.error(error.message);
        else {
          toast.success("Te enviamos un correo para restablecer tu contraseña");
          setForgotOpen(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: `+34${forgotPhone}`,
        });
        if (error) toast.error(error.message);
        else {
          toast.success("Te enviamos un código por SMS");
          setForgotOpen(false);
        }
      }
    } catch {
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) toast.error("Error al iniciar sesión con Google");
    } catch {
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) toast.error("Error al iniciar sesión con Apple");
    } catch {
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
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

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/30" />
          <span className="text-white/60 text-sm">o</span>
          <div className="flex-1 h-px bg-white/30" />
        </div>

        {/* Social login buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full h-12 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-xl"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleAppleLogin}
            className="w-full h-12 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-xl"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Continuar con Apple
          </Button>
        </div>

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar contraseña</DialogTitle>
            <DialogDescription>
              Elige cómo quieres recibir las instrucciones para restablecer tu
              contraseña.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Tabs */}
            <div className="flex rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setForgotTab("email")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  forgotTab === "email"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="h-4 w-4" />
                Mi móvil
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              {forgotTab === "email"
                ? "Te enviaremos un enlace al correo para restablecer la contraseña."
                : "Te enviaremos un código por SMS para acceder y cambiar tu contraseña."}
            </p>

            {forgotTab === "email" ? (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="mail@ejemplo.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotLoading}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex items-center gap-1 rounded-xl border bg-muted px-3 text-sm font-medium">
                  <span>🇪🇸</span>
                  <span>+34</span>
                </div>
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
                  className="flex-1 h-12 rounded-xl tracking-wide"
                />
              </div>
            )}

            <Button
              type="button"
              onClick={handleForgotSubmit}
              disabled={forgotLoading}
              className="w-full h-12 rounded-xl"
            >
              {forgotLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Enviar instrucciones"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default LoginScreen;
