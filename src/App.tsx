import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import RadarAssimetria from "./pages/RadarAssimetria";
import RadarTesouro from "./pages/RadarTesouro";
import PlanoAcao from "./pages/PlanoAcao";
import PosicoesVariaveis from "./pages/PosicoesVariaveis";
import AdminAuditCenter from "./pages/AdminAuditCenter";
import IncidentCenter from "./pages/IncidentCenter";
import PassiveIncomeSimulator from "./pages/PassiveIncomeSimulator";
import WealthGoalsManager from "./pages/WealthGoalsManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Landing from "./pages/Landing";

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

  const normalizedPath = window.location.pathname.toLowerCase().replace(/\/$/, "");
  const isPublicPath = 
    normalizedPath === "" || 
    normalizedPath === "/landing" || 
    normalizedPath === "/vendas" || 
    normalizedPath === "/login";

  if (!session && !isPublicPath) {
    // Force redirect to the public login page to keep browser URL correct
    window.location.href = "/login";
    return null;
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={session ? <Index /> : <Landing />} />
                <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login onSessionActive={() => {}} />} />
                <Route path="/vendas" element={<Landing />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/radar" element={<RadarAssimetria />} />
                <Route path="/radar-tesouro" element={<RadarTesouro />} />
                <Route path="/plano-acao" element={<PlanoAcao />} />
                <Route path="/posicoes-variaveis" element={<PosicoesVariaveis />} />
                <Route path="/admin/audit" element={<AdminAuditCenter />} />
                <Route path="/admin/incidents" element={<IncidentCenter />} />
                <Route path="/simulador-renda" element={<PassiveIncomeSimulator />} />
                <Route path="/metas" element={<WealthGoalsManager />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
