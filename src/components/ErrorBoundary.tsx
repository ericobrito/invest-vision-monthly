import React, { Component, ErrorInfo, ReactNode } from "react";
import { reportIncident } from "@/lib/incidentLogger";
import { AlertTriangle, RefreshCw, Bot, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reportedId: string | null;
  isReporting: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    reportedId: null,
    isReporting: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.autoReport(error, errorInfo);
  }

  private autoReport = async (error: Error, errorInfo: ErrorInfo) => {
    this.setState({ isReporting: true });
    const res = await reportIncident({
      title: `Crash React: ${error.name || "Runtime Error"}`,
      errorMessage: error.message,
      stackTrace: error.stack,
      componentStack: errorInfo.componentStack,
      severity: "HIGH",
      userContext: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    });
    this.setState({ isReporting: false, reportedId: res?.id || "LOGGED" });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-background">
          <div className="max-w-xl w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Ocorreu um Erro Inesperado</h3>
                <p className="text-xs text-muted-foreground">
                  O Agente de Incidentes capturou este erro e enviou um relatório para análise e aprovação.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-card/80 border border-border text-xs font-mono text-destructive space-y-1 overflow-x-auto">
              <p className="font-bold">{this.state.error?.name}: {this.state.error?.message}</p>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap max-h-36 overflow-y-auto leading-normal pt-2 border-t border-border/50">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                {this.state.reportedId ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reportado ao Agente de Incidentes</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 animate-pulse text-primary" />
                    <span className="text-muted-foreground">Enviando relatório...</span>
                  </>
                )}
              </div>

              <Button onClick={this.handleReload} size="sm" variant="outline" className="gap-1.5 text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                Recarregar Página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
