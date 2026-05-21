import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, RefreshCw, AlertTriangle } from "lucide-react";

type SyncRun = {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  provider: string | null;
  bybit_total_brl: number | null;
  coinbase_total_brl: number | null;
  integrated_total_brl: number | null;
  expected_total_brl: number | null;
  difference_brl: number | null;
  anomalies_count: number;
  critical_stage: string | null;
  summary: Record<string, unknown> | null;
};

type AuditLog = {
  id: string;
  exchange: string | null;
  stage: string;
  timestamp: string;
  data: unknown;
};

type NormalizedAsset = {
  id: string;
  exchange: string;
  wallet_type: string | null;
  asset: string;
  quantity: number | null;
  usd_value: number | null;
  brl_value: number | null;
  source_field: string | null;
};

const brl = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: NormalizedAsset[]): string {
  const header = "exchange,wallet_type,asset,quantity,usd_value,brl_value,source_field";
  const body = rows
    .map((r) =>
      [
        r.exchange,
        r.wallet_type ?? "",
        r.asset,
        r.quantity ?? "",
        r.usd_value ?? "",
        r.brl_value ?? "",
        r.source_field ?? "",
      ].join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}

export default function AdminAuditCenter() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [normalized, setNormalized] = useState<NormalizedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const selected = useMemo(
    () => runs.find((r) => r.id === selectedId) ?? null,
    [runs, selectedId],
  );

  const loadRuns = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("variable-assets", {
      body: { action: "get_audit_runs", limit: 30 },
    });
    if (data?.success) {
      const list = (data.runs ?? []) as SyncRun[];
      setRuns(list);
      if (!selectedId && list[0]) setSelectedId(list[0].id);
    }
    setLoading(false);
  };

  const loadRun = async (id: string) => {
    const { data } = await supabase.functions.invoke("variable-assets", {
      body: { action: "get_audit_run", run_id: id },
    });
    if (data?.success) {
      setLogs((data.logs ?? []) as AuditLog[]);
      setNormalized((data.normalized ?? []) as NormalizedAsset[]);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    if (selectedId) loadRun(selectedId);
  }, [selectedId]);

  const runSyncAll = async () => {
    setSyncing(true);
    await supabase.functions.invoke("variable-assets", { body: { action: "sync_all" } });
    setSyncing(false);
    await loadRuns();
  };

  const rawLogs = logs.filter((l) => l.stage.endsWith("_RAW"));
  const walletDiscoveryLog = logs.find((l) => l.stage === "WALLET_DISCOVERY");
  const consolidationLog = logs.find((l) => l.stage === "CONSOLIDATION");
  const errorLogs = logs.filter((l) => l.stage === "ERROR" || l.stage === "ANOMALY");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Integration Audit Center</h1>
              <p className="text-xs text-muted-foreground">
                Admin · Permanent audit of exchange synchronization
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadRuns} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={runSyncAll} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync All"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Run list */}
        <Card className="lg:max-h-[80vh] overflow-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sync Runs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {runs.length === 0 && (
              <p className="px-6 py-4 text-sm text-muted-foreground">
                No sync runs yet. Click "Sync All" to start.
              </p>
            )}
            {runs.map((r) => {
              const active = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 ${
                    active ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">
                      {r.provider ?? "—"}
                    </span>
                    <Badge
                      variant={
                        r.status === "completed"
                          ? "secondary"
                          : r.status === "failed"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.started_at).toLocaleString()}
                  </p>
                  <p className="text-xs mt-1">
                    Integrated: <span className="font-mono">{brl(r.integrated_total_brl)}</span>
                  </p>
                  {r.anomalies_count > 0 && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> {r.anomalies_count} anomaly
                    </p>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Selected run details */}
        <div className="space-y-4">
          {!selected && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Select a sync run to inspect it.
              </CardContent>
            </Card>
          )}
          {selected && (
            <>
              {/* Status / Consolidated */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      variant={
                        selected.status === "completed"
                          ? "secondary"
                          : selected.status === "failed"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {selected.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Duration:{" "}
                      {selected.duration_ms != null ? `${selected.duration_ms} ms` : "—"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground">Bybit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-mono">{brl(selected.bybit_total_brl)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground">Coinbase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-mono">{brl(selected.coinbase_total_brl)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground">
                      Integrated Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-mono">{brl(selected.integrated_total_brl)}</p>
                    {selected.difference_brl != null && selected.difference_brl > 0 && (
                      <p className="text-xs text-destructive mt-1">
                        Δ {brl(selected.difference_brl)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {selected.critical_stage && (
                <Card className="border-destructive">
                  <CardContent className="py-3 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Value divergence detected at stage:{" "}
                    <span className="font-mono">{selected.critical_stage}</span>
                  </CardContent>
                </Card>
              )}

              <Tabs defaultValue="normalized">
                <TabsList>
                  <TabsTrigger value="normalized">Normalized Assets</TabsTrigger>
                  <TabsTrigger value="wallets">Wallet Discovery</TabsTrigger>
                  <TabsTrigger value="raw">Raw Responses</TabsTrigger>
                  <TabsTrigger value="consolidation">Consolidation</TabsTrigger>
                  <TabsTrigger value="errors">Errors / Anomalies</TabsTrigger>
                  <TabsTrigger value="export">Export</TabsTrigger>
                </TabsList>

                <TabsContent value="normalized">
                  <Card>
                    <CardContent className="p-0 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exchange</TableHead>
                            <TableHead>Wallet</TableHead>
                            <TableHead>Asset</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">USD</TableHead>
                            <TableHead className="text-right">BRL</TableHead>
                            <TableHead>Source field</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {normalized.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="capitalize">{a.exchange}</TableCell>
                              <TableCell className="text-xs">
                                {a.wallet_type ?? "—"}
                              </TableCell>
                              <TableCell className="font-mono">{a.asset}</TableCell>
                              <TableCell className="text-right font-mono">
                                {a.quantity ?? "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {a.usd_value ?? "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {brl(a.brl_value)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {a.source_field ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                          {normalized.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground">
                                No normalized assets recorded.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="wallets">
                  <Card>
                    <CardContent className="py-4">
                      {walletDiscoveryLog ? (
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                          {JSON.stringify(walletDiscoveryLog.data, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No wallet discovery log for this run.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="raw">
                  <div className="space-y-3">
                    {rawLogs.length === 0 && (
                      <Card>
                        <CardContent className="py-4 text-sm text-muted-foreground">
                          No raw responses captured.
                        </CardContent>
                      </Card>
                    )}
                    {rawLogs.map((log) => (
                      <Card key={log.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{log.stage}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="consolidation">
                  <Card>
                    <CardContent className="py-4 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>Bybit total</div>
                        <div className="font-mono">{brl(selected.bybit_total_brl)}</div>
                        <div>Coinbase total</div>
                        <div className="font-mono">{brl(selected.coinbase_total_brl)}</div>
                        <div>Integrated total</div>
                        <div className="font-mono">{brl(selected.integrated_total_brl)}</div>
                        <div>Expected total</div>
                        <div className="font-mono">{brl(selected.expected_total_brl)}</div>
                        <div>Difference</div>
                        <div className="font-mono">{brl(selected.difference_brl)}</div>
                      </div>
                      {consolidationLog && (
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto mt-3">
                          {JSON.stringify(consolidationLog.data, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="errors">
                  <Card>
                    <CardContent className="p-0 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Stage</TableHead>
                            <TableHead>Exchange</TableHead>
                            <TableHead>When</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errorLogs.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell>
                                <Badge
                                  variant={l.stage === "ERROR" ? "destructive" : "outline"}
                                >
                                  {l.stage}
                                </Badge>
                              </TableCell>
                              <TableCell className="capitalize">{l.exchange ?? "—"}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(l.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <pre className="text-xs whitespace-pre-wrap">
                                  {JSON.stringify(l.data, null, 2)}
                                </pre>
                              </TableCell>
                            </TableRow>
                          ))}
                          {errorLogs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No errors or anomalies for this run.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="export">
                  <Card>
                    <CardContent className="py-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadFile(
                            `audit-run-${selected.id}.json`,
                            JSON.stringify({ run: selected, logs, normalized }, null, 2),
                            "application/json",
                          )
                        }
                      >
                        <Download className="w-4 h-4 mr-1" /> Export JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadFile(
                            `normalized-${selected.id}.csv`,
                            toCsv(normalized),
                            "text/csv",
                          )
                        }
                      >
                        <Download className="w-4 h-4 mr-1" /> Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadFile(
                            `raw-${selected.id}.json`,
                            JSON.stringify(rawLogs, null, 2),
                            "application/json",
                          )
                        }
                      >
                        <Download className="w-4 h-4 mr-1" /> Download Raw Responses
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const report = [
                            `Audit Report — Run ${selected.id}`,
                            `Started: ${selected.started_at}`,
                            `Status: ${selected.status}`,
                            `Provider: ${selected.provider}`,
                            `Bybit:      ${brl(selected.bybit_total_brl)}`,
                            `Coinbase:   ${brl(selected.coinbase_total_brl)}`,
                            `Integrated: ${brl(selected.integrated_total_brl)}`,
                            `Expected:   ${brl(selected.expected_total_brl)}`,
                            `Difference: ${brl(selected.difference_brl)}`,
                            `Anomalies:  ${selected.anomalies_count}`,
                            `Critical stage: ${selected.critical_stage ?? "—"}`,
                          ].join("\n");
                          downloadFile(
                            `audit-report-${selected.id}.txt`,
                            report,
                            "text/plain",
                          );
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" /> Audit Report
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
