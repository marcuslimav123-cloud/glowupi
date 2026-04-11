import React, { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/utils";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X,
  ArrowRight, ArrowLeft, Info, Download, Loader2
} from "lucide-react";

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbeariaId: number;
  onImportComplete: () => void;
}

const FIELD_OPTIONS = [
  { value: "", label: "-- Ignorar --" },
  { value: "nome", label: "Nome" },
  { value: "telefone", label: "Telefone/WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "aniversario", label: "Aniversário" },
  { value: "observacoes", label: "Observações" },
];

type Step = "tutorial" | "upload" | "mapping" | "importing" | "result";

export function ImportExcelDialog({ open, onOpenChange, barbeariaId, onImportComplete }: ImportExcelDialogProps) {
  const [step, setStep] = useState<Step>("tutorial");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [autoMapping, setAutoMapping] = useState<Record<number, string>>({});
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("tutorial");
    setFile(null);
    setHeaders([]);
    setAutoMapping({});
    setMapping({});
    setPreviewRows([]);
    setTotalRows(0);
    setUploading(false);
    setImporting(false);
    setResult(null);
    setError("");
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/import/preview`), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar arquivo");
      }

      const data = await res.json();
      setHeaders(data.headers);
      setAutoMapping(data.autoMapping);
      setTotalRows(data.totalRows);
      setPreviewRows(data.previewRows);

      const initialMapping: Record<number, string> = {};
      for (const [colIdx, field] of Object.entries(data.autoMapping)) {
        initialMapping[Number(colIdx)] = field;
      }
      setMapping(initialMapping);
      setStep("mapping");
    } catch (err: any) {
      setError(err.message || "Erro ao processar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setStep("importing");
    setError("");

    try {
      const columnMapping: Record<string, number> = {};
      for (const [colIdx, field] of Object.entries(mapping)) {
        if (field) {
          columnMapping[field] = Number(colIdx);
        }
      }

      if (columnMapping.nome === undefined) {
        setError("Selecione a coluna do Nome");
        setStep("mapping");
        setImporting(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("columnMapping", JSON.stringify(columnMapping));

      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/import/execute`), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao importar");
      }

      const data = await res.json();
      setResult(data);
      setStep("result");
      onImportComplete();
    } catch (err: any) {
      setError(err.message || "Erro ao importar");
      setStep("mapping");
    } finally {
      setImporting(false);
    }
  };

  const handleMappingChange = (colIdx: number, value: string) => {
    setMapping(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (v === value && Number(k) !== colIdx) {
          next[Number(k)] = "";
        }
      }
      next[colIdx] = value;
      return next;
    });
  };

  const hasNomeMapping = Object.values(mapping).includes("nome");
  const hasTelefoneMapping = Object.values(mapping).includes("telefone");

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="bg-card border-border sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-500" />
            Importar Clientes via Excel
          </DialogTitle>
        </DialogHeader>

        {step === "tutorial" && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Como preparar sua planilha:</p>
                  <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal ml-4">
                    <li>A <strong>primeira linha</strong> deve conter os nomes das colunas (cabeçalho)</li>
                    <li>Cada linha abaixo do cabeçalho representa um cliente</li>
                    <li>Colunas obrigatórias: <strong>Nome</strong> e <strong>Telefone</strong></li>
                    <li>Colunas opcionais: E-mail, Aniversário, Observações</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold">Exemplo de planilha aceita:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Nome</th>
                      <th className="px-3 py-2 text-left font-medium">Telefone</th>
                      <th className="px-3 py-2 text-left font-medium">Email</th>
                      <th className="px-3 py-2 text-left font-medium">Aniversário</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="px-3 py-1.5">Maria Silva</td>
                      <td className="px-3 py-1.5">86991234567</td>
                      <td className="px-3 py-1.5">maria@email.com</td>
                      <td className="px-3 py-1.5">15/03/1990</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="px-3 py-1.5">João Santos</td>
                      <td className="px-3 py-1.5">86998765432</td>
                      <td className="px-3 py-1.5"></td>
                      <td className="px-3 py-1.5">22/07/1985</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-500">Dicas importantes</p>
                  <ul className="text-xs text-muted-foreground space-y-1 mt-1 list-disc ml-4">
                    <li>Formatos aceitos: <strong>.xlsx, .xls, .csv</strong></li>
                    <li>Limite de <strong>10MB</strong> por arquivo</li>
                    <li>O sistema detecta automaticamente as colunas pelo nome do cabeçalho</li>
                    <li>Você pode revisar e ajustar o mapeamento antes de importar</li>
                    <li>Clientes com telefone duplicado serão ignorados (se o controle de celular estiver ativo)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep("upload")}>
              Entendi, vamos começar <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-sm">Clique para selecionar o arquivo</p>
                    <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx, .xls) ou CSV (.csv)</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button variant="outline" onClick={() => setStep("tutorial")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong>{totalRows}</strong> clientes encontrados na planilha
              </p>
              {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
            </div>

            {Object.keys(autoMapping).length > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm text-green-600">
                  {Object.keys(autoMapping).length} coluna(s) detectada(s) automaticamente! Revise abaixo.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold">Mapeamento de Colunas:</p>
              <div className="space-y-2">
                {headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted/20 rounded-lg p-2.5">
                    <span className="text-sm font-medium min-w-[120px] truncate" title={header}>{header}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <select
                      value={mapping[i] || ""}
                      onChange={e => handleMappingChange(i, e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {FIELD_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {previewRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Preview (primeiras 5 linhas):</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        {headers.map((h, i) => (
                          <th key={i} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                            {mapping[i] ? (
                              <span className="text-primary">{FIELD_OPTIONS.find(o => o.value === mapping[i])?.label}</span>
                            ) : (
                              <span className="text-muted-foreground">{h}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri} className="border-t border-border">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-2 py-1 whitespace-nowrap max-w-[150px] truncate">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!hasNomeMapping && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">Selecione qual coluna contém o <strong>Nome</strong> do cliente</p>
              </div>
            )}

            {!hasTelefoneMapping && hasNomeMapping && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-600">Recomendamos mapear a coluna de <strong>Telefone</strong> também</p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); }} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" /> Trocar Arquivo
              </Button>
              <Button
                onClick={handleImport}
                disabled={!hasNomeMapping || importing}
                className="flex-1"
              >
                Importar {totalRows} Clientes <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-10 text-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
            <div>
              <p className="font-semibold">Importando clientes...</p>
              <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos para planilhas grandes</p>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-3" />
              <p className="text-xl font-bold text-green-500">{result.imported} clientes importados!</p>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground mt-1">{result.skipped} linha(s) ignorada(s)</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-primary">{result.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-500">{result.imported}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
              <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-amber-500">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Ignorados</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-muted/20 rounded-xl p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold mb-2">Detalhes das linhas ignoradas:</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{err}</p>
                ))}
              </div>
            )}

            <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
