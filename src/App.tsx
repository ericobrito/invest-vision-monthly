import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import RadarAssimetria from "./pages/RadarAssimetria";
import RadarTesouro from "./pages/RadarTesouro";
import PlanoAcao from "./pages/PlanoAcao";
import PosicoesVariaveis from "./pages/PosicoesVariaveis";
import AdminAuditCenter from "./pages/AdminAuditCenter";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      console.warn("Auth loading safety timeout triggered");
      setLoading(false);
    }, 2500);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
        clearTimeout(safetyTimeout);
      })
      .catch((err) => {
        console.error("Failed to fetch session:", err);
        setLoading(false);
        clearTimeout(safetyTimeout);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <QueryClientProvider client={queryClient}>
        <Login onSessionActive={() => {}} />
      </QueryClientProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/radar" element={<RadarAssimetria />} />
              <Route path="/radar-tesouro" element={<RadarTesouro />} />
              <Route path="/plano-acao" element={<PlanoAcao />} />
              <Route path="/posicoes-variaveis" element={<PosicoesVariaveis />} />
              <Route path="/admin/audit" element={<AdminAuditCenter />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
