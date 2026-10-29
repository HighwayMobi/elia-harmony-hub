import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { getFTSession, onFTSessionChange, FactoryTeleSession } from "@/lib/ft-auth";
import logo from "@/assets/logo-elia-balance.svg";
import LoginScreen from "@/components/LoginScreen";
import AppShell from "@/components/app/AppShell";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ftSession, setFtSession] = useState<FactoryTeleSession | null>(getFTSession());
  const [loading, setLoading] = useState(true);

  // Check auth state
  useEffect(() => {
    const resetSplash = () => {
      setFtSession(getFTSession());
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === "SIGNED_OUT") {
          resetSplash();
        }
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // FactoryTele session listener
    const offFT = onFTSessionChange(() => {
      const next = getFTSession();
      if (!next) {
        resetSplash();
      }
      setFtSession(next);
    });

    return () => {
      subscription.unsubscribe();
      offFT();
    };
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "hsl(var(--background))" }}
      >
        <motion.img
          src={logo}
          alt="Elia Balance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-48 h-auto"
        />
      </div>
    );
  }

  // Show app if user is logged in (Supabase or FactoryTele)
  if (user) {
    return <AppShell user={user} />;
  }
  if (ftSession) {
    const syntheticUser = {
      id: ftSession.user?.id ?? "ft-user",
      email: ftSession.email ?? ftSession.user?.email ?? "",
      phone: ftSession.phone ?? ftSession.user?.phone ?? "",
    } as unknown as User;
    return <AppShell user={syntheticUser} />;
  }

  return <LoginScreen />;
};

export default Index;
