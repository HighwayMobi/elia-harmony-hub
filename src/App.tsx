import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ChangePlanPage from "./pages/ChangePlanPage";
import TopUpPage from "./pages/TopUpPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import BuyAddonPage from "./pages/BuyAddonPage";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/change-plan" element={<ChangePlanPage />} />
          <Route path="/topup" element={<TopUpPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/buy-addon" element={<BuyAddonPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
