import type { TesouroBond } from "@/hooks/useTesouroData";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TesouroTableProps {
  bonds: TesouroBond[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getRowHighlight(score: number): string {
  if (score >= 1.20) return "bg-primary/10 border-l-2 border-l-primary";
  if (score >= 1.05) return "bg-yellow-500/10 border-l-2 border-l-yellow-500";
  return "";
}

const TesouroTable = ({ bonds }: TesouroTableProps) => {
  if (bonds.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum dado disponível. Verifique se a fonte de dados está acessível.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="whitespace-nowrap font-semibold">Título</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-center">Tipo</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-center">Vencimento</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-right">Taxa (%)</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-right">Preço</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-center">Score</TableHead>
              <TableHead className="whitespace-nowrap font-semibold text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bonds.map((bond) => (
              <TableRow key={bond.name} className={getRowHighlight(bond.score)}>
                <TableCell className="font-bold text-foreground whitespace-nowrap">
                  {bond.name}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {bond.maturityYears.toFixed(1)} anos até o vencimento
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <Badge variant={bond.type === "IPCA" ? "default" : "secondary"}>
                    {bond.type === "IPCA" ? "IPCA+" : "Prefixado"}
                  </Badge>
                </TableCell>

                <TableCell className="text-center font-mono whitespace-nowrap">
                  {new Date(bond.maturityDate).toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>

                <TableCell className="text-right font-mono whitespace-nowrap font-semibold">
                  {bond.buyRate.toFixed(2)}%
                </TableCell>

                <TableCell className="text-right font-mono whitespace-nowrap">
                  {formatCurrency(bond.price)}
                </TableCell>

                <TableCell className="text-center">
                  <Badge variant={
                    bond.score >= 1.20 ? "default" :
                    bond.score >= 1.05 ? "secondary" : "outline"
                  }>
                    {bond.score.toFixed(2)}
                  </Badge>
                </TableCell>

                <TableCell className="text-center whitespace-nowrap">
                  <span className="text-lg">{bond.statusEmoji}</span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {bond.statusLabel}
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

export default TesouroTable;
