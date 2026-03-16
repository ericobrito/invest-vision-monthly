import type { RadarStock } from "@/hooks/useRadarData";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import MiniSparkline from "./MiniSparkline";

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
  return "⚪";
}

function getRowHighlight(annualizedReturn: number): string {
  if (annualizedReturn >= 0.30) return "bg-primary/10 border-l-2 border-l-primary";
  if (annualizedReturn >= 0.20) return "bg-yellow-500/10 border-l-2 border-l-yellow-500";
  return "";
}

const RadarTable = ({ stocks, showAll }: RadarTableProps) => {
  if (stocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {showAll
          ? "Nenhum dado disponível. Verifique se a fonte de dados está acessível."
          : "Nenhuma oportunidade encontrada com os filtros atuais. Tente visualizar todos os ativos."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="whitespace-nowrap font-semibold text-center w-16">Rank</TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Ticker</TableHead>
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
            {stocks.map((stock) => (
              <TableRow key={stock.ticker} className={getRowHighlight(stock.annualizedReturn)}>
                <TableCell className="font-bold text-foreground whitespace-nowrap">
                  {stock.ticker}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stock.momentum ? "▲ Acima da MA200" : "▼ Abaixo da MA200"}
                  </div>
                </TableCell>

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
    </div>
  );
};

export default RadarTable;
