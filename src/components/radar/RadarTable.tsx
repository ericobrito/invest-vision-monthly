import { useState } from "react";
import type { RadarStock } from "@/hooks/useRadarData";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import MiniSparkline from "./MiniSparkline";
import { LayoutList, Grid } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RadarTableProps {
  stocks: RadarStock[];
  showAll: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function getQualityEmoji(badge: string) {
  if (badge === "Excelente") return "🟢";
  if (badge === "Forte") return "🟡";
  if (badge === "Moderado") return "⚪";
  return "🔴";
}

function getOpportunityEmoji(signal: string) {
  if (signal === "Oportunidade Forte") return "🟢";
  if (signal === "Boa Assimetria") return "🟡";
  if (signal === "Moderado") return "⚪";
  return "⚪";
}

function getRowHighlight(annualizedReturn: number): string {
  if (annualizedReturn >= 0.30) return "bg-primary/10 border-l-2 border-l-primary";
  if (annualizedReturn >= 0.20) return "bg-yellow-500/10 border-l-2 border-l-yellow-500";
  return "";
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const RadarTable = ({ stocks, showAll }: RadarTableProps) => {
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  if (stocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {showAll
          ? "Nenhum dado disponível. Verifique se a fonte de dados está acessível."
          : "Nenhuma oportunidade encontrada com os filtros atuais. Tente visualizar todos os ativos."}
      </div>
    );
  }

  const hasUserPositions = stocks.some((s) => s.userValueBRL !== undefined);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card/40">
      <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
          {stocks.length} ativo{stocks.length > 1 ? "s" : ""} listado{stocks.length > 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs font-medium gap-1.5"
            onClick={() => setViewMode("table")}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tabela</span>
          </Button>
          <Button
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs font-medium gap-1.5"
            onClick={() => setViewMode("cards")}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </Button>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocks.map((stock, index) => (
            <div key={stock.ticker} className={`rounded-xl border border-border/60 p-4 flex flex-col justify-between transition-all ${getRowHighlight(stock.annualizedReturn)} bg-card/80`}>
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-foreground text-base leading-tight">{stock.ticker}</h3>
                      <span className="text-[11px] text-muted-foreground">
                        {stock.momentum ? "▲ Acima MA200" : "▼ Abaixo MA200"}
                      </span>
                    </div>
                  </div>
                  <Badge variant={stock.score >= 90 ? "default" : stock.score >= 80 ? "secondary" : "outline"}>
                    Score {stock.score}
                  </Badge>
                </div>

                {/* User holding indicator if exists */}
                {stock.userValueBRL !== undefined && (
                  <div className="my-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Sua Posição</span>
                      <span className="font-bold text-primary font-mono">{formatBRL(stock.userValueBRL)}</span>
                    </div>
                    {stock.userProfitPct !== undefined && (
                      <span className={`font-mono font-semibold ${stock.userProfitPct >= 0 ? "text-primary" : "text-destructive"}`}>
                        {stock.userProfitPct >= 0 ? "+" : ""}{(stock.userProfitPct * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs my-3">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Preço Atual</span>
                    <span className="font-mono font-semibold text-foreground">{formatCurrency(stock.currentPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Topo Histórico (ATH)</span>
                    <span className="font-mono text-muted-foreground">{formatCurrency(stock.ath)}</span>
                    <span className="block text-[10px] text-destructive font-mono">-{formatPct(stock.distanceFromAth)} do topo</span>
                  </div>
                </div>

                <div className="space-y-1.5 my-3 pt-2 border-t border-border/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Potencial de Retorno</span>
                    <span className="font-mono font-bold text-primary">{formatPct(stock.potentialReturn)}</span>
                  </div>
                  <Progress value={Math.min(100, stock.potentialReturn * 100)} className="h-1.5 bg-muted" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Ret. Anualizado</span>
                    <span className={`font-mono font-bold ${
                      stock.annualizedReturn >= 0.30 ? "text-primary" : stock.annualizedReturn >= 0.20 ? "text-yellow-500" : "text-foreground"
                    }`}>
                      {formatPct(stock.annualizedReturn)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Sinal</span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      {getOpportunityEmoji(stock.opportunitySignal)} {stock.opportunitySignal}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {getQualityEmoji(stock.qualityBadge)} {stock.qualityBadge}
                </span>
                <MiniSparkline data={stock.sparklineData} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="whitespace-nowrap font-semibold text-center w-12">Rank</TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Ticker</TableHead>
              {hasUserPositions && (
                <TableHead className="whitespace-nowrap font-semibold text-right text-primary">
                  Valor Atual (R$)
                </TableHead>
              )}
              <TableHead className="whitespace-nowrap font-semibold text-right">Preço Atual</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-right">Topo Histórico (ATH)</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-right">Distância do Topo</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-center min-w-[140px]">Potencial de Retorno</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-right">Ret. Anualizado</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-right">Força Relativa vs S&P</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-right">Prob. 30% a.a.</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-center">Score</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-center">12 Meses</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-center">Sinal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map((stock, index) => (
              <TableRow key={stock.ticker} className={getRowHighlight(stock.annualizedReturn)}>
                <TableCell className="text-center font-bold text-lg text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="font-bold text-foreground whitespace-nowrap">
                  {stock.ticker}
                  {stock.userQuantity !== undefined && stock.userQuantity > 0 && (
                    <div className="text-xs text-muted-foreground font-normal">
                      {stock.userQuantity.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} un.
                      {stock.userAveragePrice ? ` · P. Médio: US$ ${stock.userAveragePrice.toFixed(2)}` : ""}
                      {stock.userSource ? ` · ${stock.userSource}` : ""}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {stock.momentum ? "▲ Acima da MA200" : "▼ Abaixo da MA200"}
                  </div>
                </TableCell>

                {hasUserPositions && (
                  <TableCell className="text-right font-mono whitespace-nowrap font-bold text-primary">
                    {stock.userValueBRL !== undefined ? formatBRL(stock.userValueBRL) : "—"}
                    {stock.userProfitPct !== undefined && (
                      <div className={`text-xs font-normal ${stock.userProfitPct >= 0 ? "text-primary" : "text-destructive"}`}>
                        {stock.userProfitPct >= 0 ? "+" : ""}{(stock.userProfitPct * 100).toFixed(2)}%
                      </div>
                    )}
                  </TableCell>
                )}

                <TableCell className="text-right font-mono whitespace-nowrap">
                  {formatCurrency(stock.currentPrice)}
                </TableCell>

                <TableCell className="text-right font-mono whitespace-nowrap">
                  {formatCurrency(stock.ath)}
                  <div className="text-xs text-muted-foreground">
                    {new Date(stock.athDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                  </div>
                </TableCell>

                <TableCell className="text-right font-mono whitespace-nowrap text-destructive">
                  -{formatPct(stock.distanceFromAth)}
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Progress
                      value={Math.min(100, stock.potentialReturn * 100)}
                      className="h-2 w-20 bg-muted"
                    />
                    <span className="text-sm font-mono font-semibold text-primary">
                      {formatPct(stock.potentialReturn)}
                    </span>
                  </div>
                </TableCell>

                <TableCell className={`text-right font-mono whitespace-nowrap font-semibold ${
                  stock.annualizedReturn >= 0.30 ? "text-primary" :
                  stock.annualizedReturn >= 0.20 ? "text-yellow-500" : "text-muted-foreground"
                }`}>
                  {formatPct(stock.annualizedReturn)}
                </TableCell>

                <TableCell className={`text-right font-mono whitespace-nowrap ${
                  stock.relativeStrength > 1 ? "text-primary" : "text-destructive"
                }`}>
                  {stock.relativeStrength.toFixed(2)}x
                </TableCell>

                <TableCell className="text-right font-mono whitespace-nowrap">
                  {stock.probability30.toFixed(1)}%
                </TableCell>

                <TableCell className="text-center whitespace-nowrap">
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant={
                      stock.score >= 90 ? "default" :
                      stock.score >= 80 ? "secondary" : "outline"
                    }>
                      {stock.score}
                    </Badge>
                    <span className="text-xs">
                      {getQualityEmoji(stock.qualityBadge)} {stock.qualityBadge}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <MiniSparkline data={stock.sparklineData} />
                </TableCell>

                <TableCell className="text-center whitespace-nowrap">
                  <span className="text-sm">
                    {getOpportunityEmoji(stock.opportunitySignal)}
                  </span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stock.opportunitySignal}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
};

export default RadarTable;
