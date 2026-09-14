import type { MonthlySnapshot, Investment, IncomeType, Region, Position } from "@/data/investments";

export interface ParsedImportResult {
  snapshots: MonthlySnapshot[];
  totalRowsParsed: number;
  monthsCount: number;
  investmentsCount: number;
  warnings: string[];
}

function parseNumber(rawVal: any): number {
  if (rawVal == null) return 0;
  if (typeof rawVal === "number") return isNaN(rawVal) ? 0 : rawVal;

  let str = String(rawVal).trim();
  if (!str) return 0;

  // Remove currency signs like R$, US$, $
  str = str.replace(/[R\$US\s%]/gi, "");

  // Detect Brazilian format: 1.234,56 (dot as thousand separator, comma as decimal)
  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // 1.234,56 -> 1234.56
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 -> 1234.56
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // 1234,56 -> 1234.56
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseIncomeType(str: string | undefined): IncomeType {
  if (!str) return "fixed";
  const s = str.toLowerCase();
  if (s.includes("variavel") || s.includes("variável") || s.includes("variable") || s.includes("cripto") || s.includes("ações")) {
    return "variable";
  }
  return "fixed";
}

function parseRegion(str: string | undefined): Region {
  if (!str) return "brazil";
  const s = str.toLowerCase();
  if (s.includes("exterior") || s.includes("eua") || s.includes("dolar") || s.includes("dólar") || s.includes("foreign")) {
    return "exterior";
  }
  return "brazil";
}

function normalizeMonthId(rawMonth: string): string {
  let m = rawMonth.trim();
  // e.g. "03/2026" -> "2026-03"
  if (/^\d{2}\/\d{4}$/.test(m)) {
    const [mm, yyyy] = m.split("/");
    return `${yyyy}-${mm}`;
  }
  // e.g. "2026/03" -> "2026-03"
  if (/^\d{4}\/\d{2}$/.test(m)) {
    return m.replace("/", "-");
  }
  return m;
}

/**
 * Parses uploaded CSV / TSV / XLS / JSON file into MonthlySnapshots
 */
export async function parseMonthlyImportFile(file: File): Promise<ParsedImportResult> {
  const text = await file.text();
  const filename = file.name.toLowerCase();
  const warnings: string[] = [];

  if (filename.endsWith(".json")) {
    try {
      const data = JSON.parse(text);
      const snapshots: MonthlySnapshot[] = Array.isArray(data) ? data : [data];
      return {
        snapshots,
        totalRowsParsed: snapshots.length,
        monthsCount: snapshots.length,
        investmentsCount: snapshots.reduce((sum, s) => sum + (s.investments?.length || 0), 0),
        warnings,
      };
    } catch (err) {
      throw new Error(`Erro ao ler arquivo JSON: ${String(err)}`);
    }
  }

  // Handle CSV / TSV / XLS XML string
  let lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // XML Spreadsheet 2003 check
  if (text.includes("<?xml") || text.includes("<Workbook")) {
    return parseXmlSpreadsheet(text);
  }

  if (lines.length < 2) {
    throw new Error("O arquivo não possui linhas de dados suficientes.");
  }

  // Auto-detect delimiter (; or , or \t)
  const headerLine = lines[0];
  let delimiter = ";";
  if (headerLine.includes(";")) {
    delimiter = ";";
  } else if (headerLine.includes("\t")) {
    delimiter = "\t";
  } else if (headerLine.includes(",")) {
    delimiter = ",";
  }

  const headers = headerLine
    .split(delimiter)
    .map((h) => h.replace(/^["\uFEFF]|["\s]$/g, "").trim().toLowerCase());

  const findCol = (...keywords: string[]) => {
    return headers.findIndex((h) => keywords.some((k) => h.includes(k.toLowerCase())));
  };

  const colMonth = findCol("mês", "mes", "month", "data", "periodo");
  const colLabel = findCol("rótulo", "rotulo", "label", "descrição", "descricao");
  const colPlatform = findCol("plataforma", "investimento", "nome", "corretora", "banco");
  const colValue = findCol("valor atual", "valor", "value", "total");
  const colApplied = findCol("valor aplicado", "aplicado", "investido", "applied");
  const colType = findCol("tipo", "renda", "income");
  const colRegion = findCol("região", "regiao", "region");
  const colCdi = findCol("cdi");
  const colIpca = findCol("ipca");

  if (colMonth === -1 || colPlatform === -1) {
    throw new Error(
      "Cabeçalho inválido. Certifique-se de que o arquivo contenha as colunas 'Mês' e 'Plataforma / Investimento'."
    );
  }

  const snapshotMap = new Map<string, {
    month: string;
    label: string;
    cdiRate?: number;
    ipcaRate?: number;
    investmentsMap: Map<string, Investment>;
  }>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Simple CSV row splitter handling quotes
    const cells: string[] = [];
    let insideQuote = false;
    let currentCell = "";

    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === delimiter && !insideQuote) {
        cells.push(currentCell.trim().replace(/^"|"$/g, ""));
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim().replace(/^"|"$/g, ""));

    const monthRaw = cells[colMonth];
    const platformRaw = cells[colPlatform];
    if (!monthRaw || !platformRaw) continue;

    const monthId = normalizeMonthId(monthRaw);
    const label = colLabel !== -1 && cells[colLabel] ? cells[colLabel] : monthRaw;
    const value = colValue !== -1 ? parseNumber(cells[colValue]) : 0;
    const appliedAmount = colApplied !== -1 ? parseNumber(cells[colApplied]) : value;
    const incomeType = colType !== -1 ? parseIncomeType(cells[colType]) : "fixed";
    const region = colRegion !== -1 ? parseRegion(cells[colRegion]) : "brazil";
    const cdiRate = colCdi !== -1 ? parseNumber(cells[colCdi]) : 10.75;
    const ipcaRate = colIpca !== -1 ? parseNumber(cells[colIpca]) : 4.50;

    let existingSnap = snapshotMap.get(monthId);
    if (!existingSnap) {
      existingSnap = {
        month: monthId,
        label,
        cdiRate,
        ipcaRate,
        investmentsMap: new Map(),
      };
      snapshotMap.set(monthId, existingSnap);
    }

    const invKey = platformRaw.toLowerCase().trim();
    existingSnap.investmentsMap.set(invKey, {
      name: platformRaw,
      value,
      appliedAmount,
      incomeType,
      region,
      mode: "CONSOLIDATED",
      percentage: 0,
      totalReturn: appliedAmount > 0 ? (value - appliedAmount) / appliedAmount : 0,
      annualReturn: 0,
    });
  }

  const resultSnapshots: MonthlySnapshot[] = [];
  snapshotMap.forEach((snapData) => {
    const investments = Array.from(snapData.investmentsMap.values());
    const total = investments.reduce((sum, inv) => sum + inv.value, 0);

    resultSnapshots.push({
      month: snapData.month,
      label: snapData.label,
      total,
      cdiRate: snapData.cdiRate || 10.75,
      ipcaRate: snapData.ipcaRate || 4.50,
      fixedIncome: investments.filter((i) => i.incomeType === "fixed").reduce((sum, i) => sum + i.value, 0),
      variableIncome: investments.filter((i) => i.incomeType === "variable").reduce((sum, i) => sum + i.value, 0),
      brazil: investments.filter((i) => i.region === "brazil").reduce((sum, i) => sum + i.value, 0),
      exterior: investments.filter((i) => i.region === "exterior").reduce((sum, i) => sum + i.value, 0),
      investments,
    });
  });

  resultSnapshots.sort((a, b) => a.month.localeCompare(b.month));

  return {
    snapshots: resultSnapshots,
    totalRowsParsed: lines.length - 1,
    monthsCount: resultSnapshots.length,
    investmentsCount: resultSnapshots.reduce((sum, s) => sum + (s.investments?.length || 0), 0),
    warnings,
  };
}

function parseXmlSpreadsheet(text: string): ParsedImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const rows = Array.from(doc.querySelectorAll("Row"));
  if (rows.length < 2) {
    throw new Error("Arquivo XML Spreadsheet sem dados suficientes.");
  }

  const headerCells = Array.from(rows[0].querySelectorAll("Cell")).map((c) =>
    (c.textContent || "").trim().toLowerCase()
  );

  const findCol = (...keywords: string[]) =>
    headerCells.findIndex((h) => keywords.some((k) => h.includes(k.toLowerCase())));

  const colMonth = findCol("mês", "mes", "month", "data");
  const colLabel = findCol("rótulo", "rotulo", "label");
  const colPlatform = findCol("plataforma", "investimento", "nome");
  const colValue = findCol("valor atual", "valor");
  const colApplied = findCol("valor aplicado", "aplicado");
  const colType = findCol("tipo");
  const colRegion = findCol("região", "regiao");

  const snapshotMap = new Map<string, MonthlySnapshot>();

  for (let i = 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll("Cell")).map((c) => (c.textContent || "").trim());
    if (cells.length === 0) continue;

    const monthRaw = cells[colMonth] || cells[0];
    const platformRaw = cells[colPlatform] || cells[2];
    if (!monthRaw || !platformRaw) continue;

    const monthId = normalizeMonthId(monthRaw);
    const value = parseNumber(cells[colValue]);
    const appliedAmount = parseNumber(cells[colApplied]) || value;

    let snap = snapshotMap.get(monthId);
    if (!snap) {
      snap = {
        month: monthId,
        label: cells[colLabel] || monthId,
        total: 0,
        cdiRate: 10.75,
        ipcaRate: 4.50,
        investments: [],
      };
      snapshotMap.set(monthId, snap);
    }

    snap.investments.push({
      name: platformRaw,
      value,
      appliedAmount,
      incomeType: parseIncomeType(cells[colType]),
      region: parseRegion(cells[colRegion]),
      mode: "CONSOLIDATED",
      percentage: 0,
      totalReturn: 0,
      annualReturn: 0,
    });
    snap.total += value;
  }

  const snapshots = Array.from(snapshotMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return {
    snapshots,
    totalRowsParsed: rows.length - 1,
    monthsCount: snapshots.length,
    investmentsCount: snapshots.reduce((sum, s) => sum + s.investments.length, 0),
    warnings: [],
  };
}
