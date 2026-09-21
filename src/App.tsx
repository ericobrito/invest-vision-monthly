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
import VariableIncomeMoversDashboard from "./pages/VariableIncomeMoversDashboard";
import CryptoAccountingDashboard from "./pages/CryptoAccountingDashboard";
import RadarETF from "./pages/RadarETF";
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

  const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    if (!session) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

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
                <Route path="/radar" element={<ProtectedRoute><RadarAssimetria /></ProtectedRoute>} />
                <Route path="/radar-etf" element={<ProtectedRoute><RadarETF /></ProtectedRoute>} />
                <Route path="/radar-tesouro" element={<ProtectedRoute><RadarTesouro /></ProtectedRoute>} />
                <Route path="/plano-acao" element={<ProtectedRoute><PlanoAcao /></ProtectedRoute>} />
                <Route path="/posicoes-variaveis" element={<ProtectedRoute><PosicoesVariaveis /></ProtectedRoute>} />
                <Route path="/admin/audit" element={<ProtectedRoute><AdminAuditCenter /></ProtectedRoute>} />
                <Route path="/admin/incidents" element={<ProtectedRoute><IncidentCenter /></ProtectedRoute>} />
                <Route path="/simulador-renda" element={<ProtectedRoute><PassiveIncomeSimulator /></ProtectedRoute>} />
                <Route path="/metas" element={<ProtectedRoute><WealthGoalsManager /></ProtectedRoute>} />
                <Route path="/desempenho-variavel" element={<ProtectedRoute><VariableIncomeMoversDashboard /></ProtectedRoute>} />
                <Route path="/maiores-altas" element={<ProtectedRoute><VariableIncomeMoversDashboard /></ProtectedRoute>} />
                <Route path="/contabilidade-cripto" element={<ProtectedRoute><CryptoAccountingDashboard /></ProtectedRoute>} />
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
