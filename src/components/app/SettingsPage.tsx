import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearFTSession, getFTSession } from "@/lib/ft-auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LogOut, User as UserIcon, Mail, Activity, Phone, MapPin, IdCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePlatform } from "@/hooks/use-platform";

interface SettingsPageProps {
  user: User;
}

type Profile = {
  first_name?: string;
  last_name?: string;
  second_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  street?: string;
  house_number?: string;
  apartment?: string;
  postal_code?: string;
  id_number?: string;
  document_verified?: boolean;
  language?: string;
  payment_model?: string;
  status?: string;
  type?: string;
  company_name?: string;
  contact_person?: string;
  legal_address?: string;
  tax_id?: string;
  avatar_url?: string;
  line_avatar_url?: string;
};

const SettingsPage = ({ user }: SettingsPageProps) => {
  const { isIOS, isAndroid, isWeb } = usePlatform();
  const [googleFitEnabled, setGoogleFitEnabled] = useState(false);
  const [appleHealthEnabled, setAppleHealthEnabled] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const showGoogleFit = isAndroid || isWeb;
  const showAppleHealth = isIOS || isWeb;

  useEffect(() => {
    const loadProfile = async () => {
      const ft = getFTSession();
      const token = ft?.token;
      if (!token) {
        setProfileLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("get-profile", {
          body: { token },
        });
        if (error) throw error;
        if (!data?.ok) {
          setProfileError(data?.data?.message ?? "No se pudo cargar el perfil");
        } else {
          const payload = (data.data?.data ?? data.data) as Profile;
          setProfile(payload);
        }
      } catch (e: any) {
        setProfileError(e?.message ?? "Error al cargar el perfil");
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleGoogleFitToggle = (enabled: boolean) => {
    setGoogleFitEnabled(enabled);
    toast[enabled ? "success" : "info"](enabled ? "Google Fit conectado" : "Google Fit desconectado");
  };

  const handleAppleHealthToggle = (enabled: boolean) => {
    setAppleHealthEnabled(enabled);
    toast[enabled ? "success" : "info"](enabled ? "Apple Health conectado" : "Apple Health desconectado");
  };

  const handleLogout = async () => {
    const ft = getFTSession();
    const token = ft?.token;
    try {
      if (token) {
        await supabase.functions.invoke("logout", { body: { token } });
      }
    } catch (e) {
      console.warn("logout api error", e);
    }
    clearFTSession();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error al cerrar sesión");
      return;
    }
    // Limpiar todo el caché del navegador para volver al splash inicial con gotas
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      console.warn("cache clear error", e);
    }
    // Recarga completa para garantizar splash limpio
    window.location.replace("/");
  };

  const fullName = profile
    ? [profile.first_name, profile.second_name, profile.last_name].filter(Boolean).join(" ").trim()
    : "";
  const address = profile
    ? [
        [profile.street, profile.house_number].filter(Boolean).join(" "),
        profile.apartment,
        [profile.postal_code, profile.city].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 px-6 py-6 pb-24"
    >
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-light text-white mb-6">Configuración</h1>

        {/* Profile section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-4">
          <h2 className="text-white/90 font-medium mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Perfil
          </h2>

          {profileLoading ? (
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando perfil...
            </div>
          ) : profileError ? (
            <div className="text-white/70 text-sm">{profileError}</div>
          ) : profile ? (
            <div className="space-y-3 text-white/80 text-sm">
              {fullName && (
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 shrink-0" />
                  <span>{fullName}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="break-all">{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{address}</span>
                </div>
              )}
              {profile.id_number && (
                <div className="flex items-center gap-3">
                  <IdCard className="w-4 h-4 shrink-0" />
                  <span>
                    {profile.id_number}
                    {profile.document_verified ? " ✓" : ""}
                  </span>
                </div>
              )}
              {(profile.payment_model || profile.status) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {profile.status && (
                    <span className="text-xs px-2 py-1 rounded-full bg-white/15 text-white/90 capitalize">
                      {profile.status}
                    </span>
                  )}
                  {profile.payment_model && (
                    <span className="text-xs px-2 py-1 rounded-full bg-white/15 text-white/90">
                      {profile.payment_model}
                    </span>
                  )}
                  {profile.type && (
                    <span className="text-xs px-2 py-1 rounded-full bg-white/15 text-white/90 uppercase">
                      {profile.type}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-white/70">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{user.email}</span>
            </div>
          )}
        </div>

        {/* Health integrations section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-4">
          <h2 className="text-white/90 font-medium mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Conteo de pasos
          </h2>

          <div className="space-y-4">
            {showGoogleFit && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-white/90 text-sm font-medium">Google Fit</span>
                  <span className="text-white/50 text-xs">Sincronización de pasos con Android</span>
                </div>
                <Switch checked={googleFitEnabled} onCheckedChange={handleGoogleFitToggle} />
              </div>
            )}

            {showAppleHealth && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-white/90 text-sm font-medium">Apple Health</span>
                  <span className="text-white/50 text-xs">Sincronización de pasos con iPhone</span>
                </div>
                <Switch checked={appleHealthEnabled} onCheckedChange={handleAppleHealthToggle} />
              </div>
            )}
          </div>
        </div>

        {/* Logout button */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full bg-white/10 hover:bg-white/20 text-white border-0 h-14 rounded-2xl"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
