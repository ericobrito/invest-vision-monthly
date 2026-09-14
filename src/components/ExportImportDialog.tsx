import { useState } from "react";
import type { MonthlySnapshot } from "@/data/investments";
import { exportMonthlyData, ExportFormat, ExportMode } from "@/utils/exportMonthlyData";
import { parseMonthlyImportFile, ParsedImportResult } from "@/utils/importMonthlyData";
import { useImportSnapshots } from "@/hooks/useSnapshots";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Layers,
  FileCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExportImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthlyData: MonthlySnapshot[];
}

function formatBRL(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const ExportImportDialog = ({
  open,
  onOpenChange,
  monthlyData,
}: ExportImportDialogProps) => {
  const importSnapshots = useImportSnapshots();

  // Export State
  const [exportMode, setExportMode] = useState<ExportMode>("summary");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xls");
  const [csvDelimiter, setCsvDelimiter] = useState<";" | ",">(";");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [allMonthsSelected, setAllMonthsSelected] = useState<boolean>(true);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedImport, setParsedImport] = useState<ParsedImportResult | null>(null);
  const [parsingLoading, setParsingLoading] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);

  const handleToggleMonth = (month: string) => {
    if (allMonthsSelected) {
      setAllMonthsSelected(false);
      setSelectedMonths([month]);
    } else {
      if (selectedMonths.includes(month)) {
        const next = selectedMonths.filter((m) => m !== month);
        setSelectedMonths(next);
        if (next.length === 0) setAllMonthsSelected(true);
      } else {
        setSelectedMonths([...selectedMonths, month]);
      }
    }
  };

  const handleSelectAllMonths = (checked: boolean) => {
    setAllMonthsSelected(checked);
    if (checked) {
      setSelectedMonths([]);
    }
  };

  const handleExport = () => {
    try {
      exportMonthlyData(monthlyData, {
        format: exportFormat,
        mode: exportMode,
        delimiter: csvDelimiter,
        selectedMonths: allMonthsSelected ? undefined : selectedMonths,
      });

      toast({
        title: "Exportação concluída!",
        description: `Arquivo ${exportFormat.toUpperCase()} gerado com sucesso.`,
      });
    } catch (err) {
      toast({
        title: "Erro na exportação",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setParsingLoading(true);
    setParseError(null);
    setParsedImport(null);

    try {
      const res = await parseMonthlyImportFile(file);
      setParsedImport(res);
      toast({
        title: "Arquivo analisado",
        description: `${res.monthsCount} mês(es) e ${res.investmentsCount} investimento(s) encontrados.`,
      });
    } catch (err: any) {
      setParseError(err.message || String(err));
      toast({
        title: "Erro ao ler arquivo",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setParsingLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedImport || parsedImport.snapshots.length === 0) return;

    importSnapshots.mutate(
      {
        snapshots: parsedImport.snapshots,
        overwrite: overwriteExisting,
      },
      {
        onSuccess: () => {
          toast({
            title: "Importação realizada com sucesso!",
            description: `${parsedImport.monthsCount} meses atualizados/inseridos no histórico.`,
          });
          onOpenChange(false);
          setImportFile(null);
          setParsedImport(null);
        },
        onError: (err) => {
          toast({
            title: "Erro ao importar dados",
            description: String(err),
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Exportar / Importar Histórico dos Meses
          </DialogTitle>
          <DialogDescription className="text-xs">
            Gerencie o histórico mensal da sua carteira em formatos Excel (.xls), CSV e JSON.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="export" className="text-xs gap-1.5">
              <Download className="w-4 h-4" /> Exportar Dados
            </TabsTrigger>
            <TabsTrigger value="import" className="text-xs gap-1.5">
              <Upload className="w-4 h-4" /> Importar Arquivo
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: EXPORT */}
          <TabsContent value="export" className="space-y-5 pt-4">
            {/* Mode selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                1. Nível de Detalhamento
              </Label>
              <RadioGroup
                value={exportMode}
                onValueChange={(val) => setExportMode(val as ExportMode)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div
                  onClick={() => setExportMode("summary")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    exportMode === "summary"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="summary" id="mode-summary" />
                    <Label htmlFor="mode-summary" className="font-bold text-xs cursor-pointer">
                      Consolidado (Resumo dos Meses)
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 pl-6">
                    Exporta plataformas/investimentos com totais em BRL, aplicados, lucro e tipo.
                  </p>
                </div>

                <div
                  onClick={() => setExportMode("detailed")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    exportMode === "detailed"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="detailed" id="mode-detailed" />
                    <Label htmlFor="mode-detailed" className="font-bold text-xs cursor-pointer">
                      Detalhamento Completo (Ativos)
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 pl-6">
                    Exporta tickers, quantidades, preços médios, cotações e taxas de câmbio FX.
                  </p>
                </div>
              </RadioGroup>
            </div>

            {/* Format selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                2. Formato do Arquivo
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={exportFormat === "xls" ? "default" : "outline"}
                  onClick={() => setExportFormat("xls")}
                  className="h-12 flex flex-col items-center justify-center gap-1 text-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel (.xls)</span>
                </Button>

                <Button
                  type="button"
                  variant={exportFormat === "csv" ? "default" : "outline"}
                  onClick={() => setExportFormat("csv")}
                  className="h-12 flex flex-col items-center justify-center gap-1 text-xs"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>CSV (.csv)</span>
                </Button>

                <Button
                  type="button"
                  variant={exportFormat === "json" ? "default" : "outline"}
                  onClick={() => setExportFormat("json")}
                  className="h-12 flex flex-col items-center justify-center gap-1 text-xs"
                >
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <span>Backup (.json)</span>
                </Button>
              </div>
            </div>

            {/* Delimiter if CSV */}
            {exportFormat === "csv" && (
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border text-xs">
                <span className="font-medium text-muted-foreground">Delimitador CSV:</span>
                <RadioGroup
                  value={csvDelimiter}
                  onValueChange={(val) => setCsvDelimiter(val as ";" | ",")}
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value=";" id="delim-semicolon" />
                    <Label htmlFor="delim-semicolon" className="cursor-pointer font-mono">
                      Ponto e vírgula (;) [Excel Brasil]
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="," id="delim-comma" />
                    <Label htmlFor="delim-comma" className="cursor-pointer font-mono">
                      Vírgula (,)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Months selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Meses a Exportar ({monthlyData.length})
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={allMonthsSelected}
                    onCheckedChange={(c) => handleSelectAllMonths(Boolean(c))}
                  />
                  <Label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer font-medium">
                    Todos os meses ({monthlyData.length})
                  </Label>
                </div>
              </div>

              {!allMonthsSelected && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 bg-muted/20 border border-border rounded-xl">
                  {monthlyData.map((m) => {
                    const isChecked = selectedMonths.includes(m.month);
                    return (
                      <div
                        key={m.month}
                        onClick={() => handleToggleMonth(m.month)}
                        className={`p-1.5 rounded-lg border text-xs font-mono text-center cursor-pointer transition-all ${
                          isChecked
                            ? "border-primary bg-primary/10 font-bold text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {m.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button onClick={handleExport} className="w-full h-10 font-bold text-xs gap-2">
              <Download className="w-4 h-4" /> Baixar Arquivo {exportFormat.toUpperCase()}
            </Button>
          </TabsContent>

          {/* TAB 2: IMPORT */}
          <TabsContent value="import" className="space-y-5 pt-4">
            <div className="border-2 border-dashed border-border hover:border-primary/50 transition-all rounded-2xl p-6 text-center bg-muted/20">
              <input
                type="file"
                accept=".csv,.xls,.xlsx,.json,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="import-file-input"
              />
              <label htmlFor="import-file-input" className="cursor-pointer block space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
                  {parsingLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-foreground block">
                    {importFile ? importFile.name : "Clique para selecionar um arquivo"}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Suporta planilhas Excel (.xls), arquivos CSV (.csv) ou backup (.json)
                  </span>
                </div>
              </label>
            </div>

            {parseError && (
              <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-xl flex items-center gap-2 text-xs text-destructive font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {parsedImport && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Arquivo lido com sucesso!</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {parsedImport.monthsCount} Mês(es)
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {parsedImport.investmentsCount} Itens
                    </Badge>
                  </div>
                </div>

                {/* Import Strategy Option */}
                <div className="bg-muted/30 p-3 rounded-xl border border-border text-xs space-y-2">
                  <span className="font-semibold text-foreground block">Opções de Importação:</span>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="overwrite"
                        checked={overwriteExisting}
                        onChange={() => setOverwriteExisting(true)}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Substituir meses existentes (Recomendado)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="overwrite"
                        checked={!overwriteExisting}
                        onChange={() => setOverwriteExisting(false)}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Mesclar com meses existentes</span>
                    </label>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Pré-visualização dos dados lidos:
                  </span>
                  <div className="rounded-xl border border-border overflow-hidden max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs font-semibold">Mês</TableHead>
                          <TableHead className="text-xs font-semibold">Rótulo</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Itens</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Patrimônio Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedImport.snapshots.map((s) => (
                          <TableRow key={s.month}>
                            <TableCell className="font-mono font-bold text-xs">{s.month}</TableCell>
                            <TableCell className="text-xs">{s.label}</TableCell>
                            <TableCell className="text-xs text-center font-mono">{s.investments?.length || 0}</TableCell>
                            <TableCell className="text-xs text-right font-mono font-bold text-primary">
                              {formatBRL(s.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Button
                  onClick={handleConfirmImport}
                  disabled={importSnapshots.isPending}
                  className="w-full h-10 font-bold text-xs gap-2"
                >
                  {importSnapshots.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileCheck className="w-4 h-4" />
                  )}
                  Confirmar Importação de {parsedImport.monthsCount} Meses
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ExportImportDialog;
