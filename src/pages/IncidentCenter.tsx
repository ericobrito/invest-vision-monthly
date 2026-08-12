import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle2, 
  XCircle, Bot, Code, Terminal, Clock, Sparkles, ChevronRight, Check, X 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface SystemIncident {
  id: string;
  created_at: string;
  updated_at: string;
  status: "OPEN" | "ANALYZING" | "PROPOSED_FIX" | "APPROVED" | "RESOLVED" | "REJECTED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  error_message: string | null;
  stack_trace: string | null;
  component_stack: string | null;
  route: string | null;
  user_context: any;
  proposed_fix_summary: string | null;
  proposed_fix_diff: string | null;
  resolved_at: string | null;
}

const IncidentCenter = () => {
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<SystemIncident | null>(null);
  const { toast } = useToast();

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIncidents((data as SystemIncident[]) || []);
      if (data && data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0] as SystemIncident);
      }
    } catch (err: any) {
      console.error("Failed to load incidents:", err);
      toast({
        title: "Erro ao carregar incidentes",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    // Subscribe to realtime updates on system_incidents
    const channel = supabase
      .channel("incidents_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_incidents" },
        () => fetchIncidents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: SystemIncident["status"], proposedSummary?: string) => {
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "RESOLVED" || newStatus === "APPROVED") {
        updates.resolved_at = new Date().toISOString();
      }
      if (proposedSummary) {
        updates.proposed_fix_summary = proposedSummary;
      }

      const { error } = await supabase
        .from("system_incidents")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status Atualizado",
        description: `Incidente alterado para status ${newStatus}.`,
      });

      fetchIncidents();
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar incidente",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return <Badge className="bg-destructive text-destructive-foreground font-bold">CRÍTICO</Badge>;
      case "HIGH":
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 font-semibold">ALTO</Badge>;
      case "MEDIUM":
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 font-medium">MÉDIO</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">BAIXO</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="outline" className="text-destructive border-destructive/40 bg-destructive/5 font-semibold">Aberto</Badge>;
      case "ANALYZING":
        return <Badge variant="outline" className="text-primary border-primary/40 bg-primary/5 font-semibold animate-pulse">Em Análise</Badge>;
      case "PROPOSED_FIX":
        return <Badge className="bg-amber-500 text-amber-950 font-bold">Ajuste Proposto</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-500 text-emerald-950 font-bold">Aprovado pelo Usuário</Badge>;
      case "RESOLVED":
        return <Badge className="bg-emerald-600 text-white font-bold">Resolvido</Badge>;
      case "REJECTED":
        return <Badge variant="secondary" className="text-muted-foreground">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredIncidents = (statusFilter?: string) => {
    if (!statusFilter || statusFilter === "ALL") return incidents;
    if (statusFilter === "OPEN") return incidents.filter(i => i.status === "OPEN" || i.status === "ANALYZING");
    if (statusFilter === "PROPOSED") return incidents.filter(i => i.status === "PROPOSED_FIX");
    if (statusFilter === "RESOLVED") return incidents.filter(i => i.status === "RESOLVED" || i.status === "APPROVED");
    return incidents;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Agente de Incidentes — Central de Erros e Aprovações
              </h1>
              <p className="text-xs text-muted-foreground">
                Monitoramento automatizado, análise de pilha de erros e aprovação de ajustes de código pelo usuário.
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={fetchIncidents} disabled={loading} className="gap-2 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-1 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incidents List Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Tabs defaultValue="OPEN" className="w-full">
              <TabsList className="grid grid-cols-3 w-full text-xs">
                <TabsTrigger value="OPEN">Abertos ({incidents.filter(i => i.status === "OPEN" || i.status === "ANALYZING").length})</TabsTrigger>
                <TabsTrigger value="PROPOSED">Para Aprovar ({incidents.filter(i => i.status === "PROPOSED_FIX").length})</TabsTrigger>
                <TabsTrigger value="ALL">Todos ({incidents.length})</TabsTrigger>
              </TabsList>

              {["OPEN", "PROPOSED", "ALL"].map((tabKey) => (
                <TabsContent key={tabKey} value={tabKey} className="space-y-3 mt-3">
                  {filteredIncidents(tabKey).length === 0 ? (
                    <Card className="border-border">
                      <CardContent className="p-6 text-center text-xs text-muted-foreground">
                        Nenhum incidente nesta categoria.
                      </CardContent>
                    </Card>
                  ) : (
                    filteredIncidents(tabKey).map((inc) => (
                      <Card 
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className={`cursor-pointer transition-all border ${
                          selectedIncident?.id === inc.id 
                            ? "border-primary bg-primary/5 shadow-md" 
                            : "border-border hover:border-border/80 bg-card/60"
                        }`}
                      >
                        <CardHeader className="p-3 pb-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            {getSeverityBadge(inc.severity)}
                            {getStatusBadge(inc.status)}
                          </div>
                          <CardTitle className="text-xs font-bold line-clamp-1 text-foreground">
                            {inc.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-[10px] text-muted-foreground space-y-1">
                          <p className="line-clamp-2 font-mono text-destructive">{inc.error_message}</p>
                          <div className="flex items-center justify-between text-[9px] pt-1">
                            <span className="truncate">Rota: {inc.route || "/"}</span>
                            <span className="shrink-0">{new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Incident Detail & Approval Panel */}
          <div className="lg:col-span-2 space-y-6">
            {selectedIncident ? (
              <Card className="border-border shadow-xl">
                <CardHeader className="border-b border-border bg-card/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(selectedIncident.severity)}
                      {getStatusBadge(selectedIncident.status)}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      ID: {selectedIncident.id.slice(0, 8)} • {new Date(selectedIncident.created_at).toLocaleString()}
                    </span>
                  </div>

                  <CardTitle className="text-base font-bold text-foreground">
                    {selectedIncident.title}
                  </CardTitle>

                  {selectedIncident.route && (
                    <CardDescription className="text-xs font-mono bg-muted/40 p-1.5 rounded border border-border/50">
                      Rota afetada: <strong className="text-foreground">{selectedIncident.route}</strong>
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Error details */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Mensagem de Erro e Pilha de Execução (Stack Trace)
                    </h4>
                    <div className="p-3 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto space-y-2 border border-slate-800">
                      <p className="font-bold text-destructive">{selectedIncident.error_message}</p>
                      {selectedIncident.stack_trace && (
                        <pre className="text-[10px] text-slate-400 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border-t border-slate-800 pt-2">
                          {selectedIncident.stack_trace}
                        </pre>
                      )}
                    </div>
                  </div>

                  {/* Proposed Fix & Approval Section */}
                  <div className="space-y-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Proposta de Correção do Agente
                      </h4>
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                        Aprovação Necessária
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedIncident.proposed_fix_summary || 
                        "O Agente de Incidentes pode analisar o código e gerar um plano de correção detalhado para aprovação do usuário."}
                    </p>

                    {selectedIncident.proposed_fix_diff && (
                      <div className="p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[10px] overflow-x-auto border border-slate-800">
                        <p className="text-slate-400 font-sans mb-1 text-xs font-bold">Diff de Alteração Proposta:</p>
                        <pre className="whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {selectedIncident.proposed_fix_diff}
                        </pre>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {selectedIncident.status === "OPEN" && (
                        <Button 
                          onClick={() => handleUpdateStatus(selectedIncident.id, "ANALYZING", "Em análise pelo agente para elaboração do plano de correção.")}
                          className="gap-2 text-xs bg-primary text-primary-foreground font-bold"
                        >
                          <Bot className="w-4 h-4" />
                          Solicitar Análise do Agente
                        </Button>
                      )}

                      {(selectedIncident.status === "PROPOSED_FIX" || selectedIncident.status === "ANALYZING") && (
                        <>
                          <Button 
                            onClick={() => handleUpdateStatus(selectedIncident.id, "APPROVED", "Ajuste de código aprovado pelo usuário.")}
                            className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                          >
                            <Check className="w-4 h-4" />
                            Aprovar Ajuste de Código
                          </Button>
                          <Button 
                            onClick={() => handleUpdateStatus(selectedIncident.id, "REJECTED")}
                            variant="outline"
                            className="gap-2 text-xs text-destructive border-destructive/40"
                          >
                            <X className="w-4 h-4" />
                            Rejeitar Proposta
                          </Button>
                        </>
                      )}

                      {selectedIncident.status === "APPROVED" && (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Ajuste Aprovado pelo Usuário — Código Pronto para Aplicação
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border">
                <CardContent className="p-12 text-center text-muted-foreground text-xs space-y-2">
                  <Bot className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p>Selecione um incidente na lista ao lado para examinar a pilha de erros e aprovar ajustes.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default IncidentCenter;
