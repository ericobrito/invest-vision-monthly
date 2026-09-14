import type { MonthlySnapshot, Investment } from "@/data/investments";

export type ExportFormat = "csv" | "xls" | "json";
export type ExportMode = "summary" | "detailed";

export interface ExportOptions {
  format: ExportFormat;
  mode: ExportMode;
  delimiter?: ";" | ",";
  selectedMonths?: string[];
}

function triggerDownload(content: Blob | string, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatNum(num: number | undefined | null): string {
  if (num == null || isNaN(num)) return "0,00";
  return num.toFixed(2).replace(".", ",");
}

/**
 * Exports snapshots to CSV format (UTF-8 BOM with ; or , delimiter for Excel)
 */
export function generateSnapshotsCSV(
  snapshots: MonthlySnapshot[],
  mode: ExportMode = "summary",
  delimiter: ";" | "," = ";"
): string {
  const filtered = snapshots;
  const lines: string[] = [];

  if (mode === "summary") {
    // Header for Summary export
    lines.push(
      [
        "Mês ID",
        "Rótulo Mês",
        "Plataforma / Investimento",
        "Valor Atual (R$)",
        "Valor Aplicado (R$)",
        "Lucro (R$)",
        "Rentabilidade (%)",
        "Tipo de Renda",
        "Região",
        "Modo",
        "CDI (%)",
        "IPCA (%)",
      ].join(delimiter)
    );

    filtered.forEach((snap) => {
      if (!snap.investments || snap.investments.length === 0) {
        lines.push(
          [
            snap.month,
            snap.label,
            "Total Consolidado",
            formatNum(snap.total),
            "0,00",
            "0,00",
            "0,00%",
            "Consolidado",
            "Brasil",
            "CONSOLIDATED",
            formatNum(snap.cdiRate),
            formatNum(snap.ipcaRate),
          ].join(delimiter)
        );
      } else {
        snap.investments.forEach((inv) => {
          const applied = inv.appliedAmount != null ? inv.appliedAmount : inv.value;
          const profit = inv.value - applied;
          const profitPct = applied > 0 ? (profit / applied) * 100 : 0;

          lines.push(
            [
              snap.month,
              snap.label,
              `"${(inv.name || "").replace(/"/g, '""')}"`,
              formatNum(inv.value),
              formatNum(applied),
              formatNum(profit),
              formatNum(profitPct),
              inv.incomeType === "variable" ? "Renda Variável" : "Renda Fixa",
              inv.region === "exterior" ? "Exterior" : "Brasil",
              inv.mode || "CONSOLIDATED",
              formatNum(snap.cdiRate),
              formatNum(snap.ipcaRate),
            ].join(delimiter)
          );
        });
      }
    });
  } else {
    // Header for Detailed Positions export
    lines.push(
      [
        "Mês ID",
        "Rótulo Mês",
        "Plataforma",
        "Ticker / Símbolo",
        "Nome do Ativo",
        "Quantidade",
        "Preço Médio (USD/BRL)",
        "Preço Atual (USD/BRL)",
        "Valor Aplicado (BRL)",
        "Valor Atual (BRL)",
        "Moeda",
        "Taxa Câmbio FX",
      ].join(delimiter)
    );

    filtered.forEach((snap) => {
      (snap.investments || []).forEach((inv) => {
        if (inv.positions && inv.positions.length > 0) {
          inv.positions.forEach((pos) => {
            lines.push(
              [
                snap.month,
                snap.label,
                `"${(inv.name || "").replace(/"/g, '""')}"`,
                pos.symbol || pos.ticker || "",
                `"${(pos.name || "").replace(/"/g, '""')}"`,
                pos.quantity != null ? String(pos.quantity) : "0",
                formatNum(pos.averagePrice),
                formatNum(pos.currentPrice),
                formatNum(pos.appliedAmountBRL != null ? pos.appliedAmountBRL : pos.appliedAmount),
                formatNum(pos.currentValueBRL != null ? pos.currentValueBRL : pos.currentValue),
                pos.currency || "BRL",
                formatNum(pos.fxRate || 1.0),
              ].join(delimiter)
            );
          });
        } else {
          lines.push(
            [
              snap.month,
              snap.label,
              `"${(inv.name || "").replace(/"/g, '""')}"`,
              "CONSOLIDATED",
              `"${(inv.name || "").replace(/"/g, '""')}"`,
              "1",
              formatNum(inv.appliedAmount),
              formatNum(inv.value),
              formatNum(inv.appliedAmount),
              formatNum(inv.value),
              "BRL",
              "1,00",
            ].join(delimiter)
          );
        }
      });
    });
  }

  // UTF-8 BOM (\uFEFF) for Excel auto-detection
  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Exports snapshots to XML Spreadsheet 2003 format (.xls extension) for native MS Excel styling
 */
export function generateSnapshotsXLS(
  snapshots: MonthlySnapshot[],
  mode: ExportMode = "summary"
): string {
  const rows: string[] = [];

  if (mode === "summary") {
    rows.push(`
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">Mês ID</Data></Cell>
        <Cell><Data ss:Type="String">Rótulo Mês</Data></Cell>
        <Cell><Data ss:Type="String">Plataforma / Investimento</Data></Cell>
        <Cell><Data ss:Type="String">Valor Atual (R$)</Data></Cell>
        <Cell><Data ss:Type="String">Valor Aplicado (R$)</Data></Cell>
        <Cell><Data ss:Type="String">Lucro (R$)</Data></Cell>
        <Cell><Data ss:Type="String">Rentabilidade (%)</Data></Cell>
        <Cell><Data ss:Type="String">Tipo de Renda</Data></Cell>
        <Cell><Data ss:Type="String">Região</Data></Cell>
        <Cell><Data ss:Type="String">Modo</Data></Cell>
        <Cell><Data ss:Type="String">CDI (%)</Data></Cell>
        <Cell><Data ss:Type="String">IPCA (%)</Data></Cell>
      </Row>
    `);

    snapshots.forEach((snap) => {
      (snap.investments || []).forEach((inv) => {
        const applied = inv.appliedAmount != null ? inv.appliedAmount : inv.value;
        const profit = inv.value - applied;
        const profitPct = applied > 0 ? (profit / applied) * 100 : 0;

        rows.push(`
          <Row>
            <Cell><Data ss:Type="String">${snap.month}</Data></Cell>
            <Cell><Data ss:Type="String">${snap.label}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(inv.name)}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${inv.value || 0}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${applied || 0}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${profit || 0}</Data></Cell>
            <Cell ss:StyleID="Percent"><Data ss:Type="Number">${(profitPct / 100).toFixed(4)}</Data></Cell>
            <Cell><Data ss:Type="String">${inv.incomeType === "variable" ? "Renda Variável" : "Renda Fixa"}</Data></Cell>
            <Cell><Data ss:Type="String">${inv.region === "exterior" ? "Exterior" : "Brasil"}</Data></Cell>
            <Cell><Data ss:Type="String">${inv.mode || "CONSOLIDATED"}</Data></Cell>
            <Cell><Data ss:Type="Number">${snap.cdiRate || 0}</Data></Cell>
            <Cell><Data ss:Type="Number">${snap.ipcaRate || 0}</Data></Cell>
          </Row>
        `);
      });
    });
  } else {
    rows.push(`
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">Mês ID</Data></Cell>
        <Cell><Data ss:Type="String">Rótulo Mês</Data></Cell>
        <Cell><Data ss:Type="String">Plataforma</Data></Cell>
        <Cell><Data ss:Type="String">Ticker / Símbolo</Data></Cell>
        <Cell><Data ss:Type="String">Nome do Ativo</Data></Cell>
        <Cell><Data ss:Type="String">Quantidade</Data></Cell>
        <Cell><Data ss:Type="String">Preço Médio</Data></Cell>
        <Cell><Data ss:Type="String">Preço Atual</Data></Cell>
        <Cell><Data ss:Type="String">Valor Aplicado (BRL)</Data></Cell>
        <Cell><Data ss:Type="String">Valor Atual (BRL)</Data></Cell>
        <Cell><Data ss:Type="String">Moeda</Data></Cell>
        <Cell><Data ss:Type="String">FX Rate</Data></Cell>
      </Row>
    `);

    snapshots.forEach((snap) => {
      (snap.investments || []).forEach((inv) => {
        if (inv.positions && inv.positions.length > 0) {
          inv.positions.forEach((pos) => {
            const appBrl = pos.appliedAmountBRL != null ? pos.appliedAmountBRL : pos.appliedAmount;
            const valBrl = pos.currentValueBRL != null ? pos.currentValueBRL : pos.currentValue;

            rows.push(`
              <Row>
                <Cell><Data ss:Type="String">${snap.month}</Data></Cell>
                <Cell><Data ss:Type="String">${snap.label}</Data></Cell>
                <Cell><Data ss:Type="String">${escapeXml(inv.name)}</Data></Cell>
                <Cell><Data ss:Type="String">${pos.symbol || pos.ticker || ""}</Data></Cell>
                <Cell><Data ss:Type="String">${escapeXml(pos.name)}</Data></Cell>
                <Cell><Data ss:Type="Number">${pos.quantity || 0}</Data></Cell>
                <Cell><Data ss:Type="Number">${pos.averagePrice || 0}</Data></Cell>
                <Cell><Data ss:Type="Number">${pos.currentPrice || 0}</Data></Cell>
                <Cell ss:StyleID="Currency"><Data ss:Type="Number">${appBrl || 0}</Data></Cell>
                <Cell ss:StyleID="Currency"><Data ss:Type="Number">${valBrl || 0}</Data></Cell>
                <Cell><Data ss:Type="String">${pos.currency || "BRL"}</Data></Cell>
                <Cell><Data ss:Type="Number">${pos.fxRate || 1.0}</Data></Cell>
              </Row>
            `);
          });
        }
      });
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#10B981" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="&quot;R$&quot;\ #,##0.00;[Red]\-&quot;R$&quot;\ #,##0.00"/>
  </Style>
  <Style ss:ID="Percent">
   <NumberFormat ss:Format="0.00%"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Carteira Mensal">
  <Table>
   ${rows.join("")}
  </Table>
 </Worksheet>
</Workbook>`;
}

function escapeXml(str: string | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Downloads exported snapshot file based on format and mode options
 */
export function exportMonthlyData(snapshots: MonthlySnapshot[], options: ExportOptions) {
  const { format, mode, delimiter = ";" } = options;
  const targetSnapshots = options.selectedMonths && options.selectedMonths.length > 0
    ? snapshots.filter((s) => options.selectedMonths?.includes(s.month))
    : snapshots;

  const dateStr = new Date().toISOString().split("T")[0];
  const modeLabel = mode === "summary" ? "consolidado" : "detalhado";

  if (format === "csv") {
    const csvContent = generateSnapshotsCSV(targetSnapshots, mode, delimiter);
    triggerDownload(csvContent, `carteira_mensal_${modeLabel}_${dateStr}.csv`, "text/csv;charset=utf-8;");
  } else if (format === "xls") {
    const xlsContent = generateSnapshotsXLS(targetSnapshots, mode);
    triggerDownload(xlsContent, `carteira_mensal_${modeLabel}_${dateStr}.xls`, "application/vnd.ms-excel");
  } else if (format === "json") {
    const jsonContent = JSON.stringify(targetSnapshots, null, 2);
    triggerDownload(jsonContent, `carteira_mensal_backup_${dateStr}.json`, "application/json");
  }
}
