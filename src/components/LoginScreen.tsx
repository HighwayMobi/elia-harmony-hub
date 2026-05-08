import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo-elia-balance.svg";

type LoginMethod = "email" | "phone";

const LoginScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [method, setMethod] = useState<LoginMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmailForm = () => {
    if (!email.trim()) {
      toast.error("Por favor ingresa tu correo electrónico");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Por favor ingresa un correo electrónico válido");
      return false;
    }
    if (!password) {
      toast.error("Por favor ingresa tu contraseña");
      return false;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    return true;
  };

  const validatePhone = () => {
    if (!/^[67]\d{8}$/.test(phone)) {
      toast.error("Introduce un móvil válido (9 dígitos, empieza por 6 o 7)");
      return false;
    }
    return true;
  };

  const formatPhoneDisplay = (digits: string) => {
    // 612 345 678
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6, 9);
    return [a, b, c].filter(Boolean).join(" ");
  };

  const handlePhoneChange = (raw: string) => {
    let digits = raw.replace(/\D/g, "");
    // First digit must be 6 or 7
    if (digits.length > 0 && !/[67]/.test(digits[0])) {
      digits = "";
    }
    setPhone(digits.slice(0, 9));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmailForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message === "Invalid login credentials") {
            toast.error("Correo o contraseña incorrectos");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("¡Bienvenido!");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Este correo ya está registrado");
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+34${phone}`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setOtpSent(true);
        toast.success("Código enviado por SMS");
      }
    } catch {
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 4) {
      toast.error("Ingresa el código recibido");
      return;
    }
    setLoading(true);
    try {
      const normalized = phone.trim().replace(/[\s\-()]/g, "");
      const { error } = await supabase.auth.verifyOtp({
        phone: normalized.startsWith("+") ? normalized : `+${normalized}`,
        token: otp.trim(),
        type: "sms",
      });
      if (error) {
        toast.error("Código incorrecto");
      } else {
        toast.success("¡Bienvenido!");
      }
    } catch {
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Por favor ingresa tu correo electrónico");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) toast.error(error.message);
      else toast.success("Te enviamos un correo para restablecer tu contraseña");
    } catch {
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
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
            onClick={() => {
              setMethod("email");
              setOtpSent(false);
            }}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
              method === "email"
                ? "bg-white/90 text-[#A799B7]"
                : "text-white/80 hover:text-white"
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setMethod("phone")}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
              method === "phone"
                ? "bg-white/90 text-[#A799B7]"
                : "text-white/80 hover:text-white"
            }`}
          >
            Mi móvil
          </button>
        </div>

        {method === "email" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl focus:border-white/50 focus:ring-white/20"
              />
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
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <button
                type="button"
                onClick={handleForgotPassword}
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
        ) : (
          <form
            onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
            className="space-y-4"
          >
            <Input
              type="tel"
              placeholder="+34 600 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading || otpSent}
              className="h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl focus:border-white/50 focus:ring-white/20"
            />

            {otpSent && (
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Código de verificación"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
                className="h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl focus:border-white/50 focus:ring-white/20 tracking-widest text-center"
              />
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#F5E6D3] hover:bg-[#efe0cc] text-[#A799B7] font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : otpSent ? (
                "Verificar código"
              ) : (
                "Enviar código SMS"
              )}
            </Button>

            {otpSent && (
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
                disabled={loading}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Cambiar número
              </button>
            )}
          </form>
        )}

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

        {method === "email" && (
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
        )}
      </motion.div>
    </motion.div>
  );
};

export default LoginScreen;
