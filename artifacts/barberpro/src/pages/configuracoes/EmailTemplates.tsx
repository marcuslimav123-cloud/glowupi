import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, Pencil, RotateCcw, Send, X, Check, ChevronLeft } from "lucide-react";

interface TemplateInfo {
  tipo: string;
  label: string;
  variaveis: string[];
  exemplos: Record<string, string>;
  customizado: boolean;
  assunto: string;
  corpo: string;
}

export default function EmailTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TemplateInfo | null>(null);
  const [editAssunto, setEditAssunto] = useState("");
  const [editCorpo, setEditCorpo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await fetch(apiUrl("/email-templates"), { credentials: "include" });
      if (res.ok) setTemplates(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(t: TemplateInfo) {
    setEditing(t);
    setEditAssunto(t.assunto);
    setEditCorpo(t.corpo);
    setPreviewHtml(null);
  }

  function cancelEdit() {
    setEditing(null);
    setEditAssunto("");
    setEditCorpo("");
    setPreviewHtml(null);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/email-templates/${editing.tipo}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assunto: editAssunto, corpo: editCorpo }),
      });
      if (res.ok) {
        toast({ title: "Template salvo com sucesso!" });
        cancelEdit();
        loadTemplates();
      } else {
        const data = await res.json();
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(tipo: string) {
    setResetting(tipo);
    try {
      const res = await fetch(apiUrl(`/email-templates/${tipo}/reset`), {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Template restaurado ao padrao" });
        loadTemplates();
      }
    } catch {
      toast({ title: "Erro ao restaurar", variant: "destructive" });
    } finally {
      setResetting(null);
    }
  }

  async function handleTest(tipo: string) {
    setTesting(tipo);
    try {
      const res = await fetch(apiUrl(`/email-templates/${tipo}/test`), {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "E-mail de teste enviado!", description: `Enviado para ${data.sentTo}` });
      } else {
        toast({ title: "Falha no envio", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao enviar teste", variant: "destructive" });
    } finally {
      setTesting(null);
    }
  }

  function showPreview() {
    if (!editing) return;
    let rendered = editCorpo;
    for (const [key, val] of Object.entries(editing.exemplos)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
    }
    setPreviewHtml(rendered);
  }

  if (editing) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-[20px] font-bold text-foreground tracking-tight">Editar Template</h1>
              <p className="text-foreground/45 text-[13px]">{editing.label}</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <div>
              <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Assunto do E-mail</label>
              <Input
                value={editAssunto}
                onChange={e => setEditAssunto(e.target.value)}
                className="rounded-xl h-10 text-[14px]"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Corpo do E-mail (HTML)</label>
              <textarea
                value={editCorpo}
                onChange={e => setEditCorpo(e.target.value)}
                rows={18}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-[13px] text-foreground/80 font-mono bg-card resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="bg-amber-50/60 rounded-xl p-4">
              <p className="text-[12px] font-medium text-amber-700 mb-2">Variaveis disponiveis:</p>
              <div className="flex flex-wrap gap-1.5">
                {editing.variaveis.map(v => (
                  <span
                    key={v}
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${v}}}`);
                      toast({ title: `{{${v}}} copiado!` });
                    }}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-100/80 text-amber-800 text-[11px] font-mono cursor-pointer hover:bg-amber-200/80 transition-colors"
                  >
                    {"{{" + v + "}}"}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-amber-600/60 mt-2">Clique para copiar</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" onClick={cancelEdit} className="rounded-xl h-10 text-[13px]">
                Cancelar
              </Button>
              <Button variant="outline" onClick={showPreview} className="rounded-xl h-10 text-[13px] gap-2">
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <div className="flex-1" />
              <Button onClick={handleSave} disabled={saving} className="rounded-xl h-10 text-[13px] gap-2">
                <Check className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Template"}
              </Button>
            </div>
          </div>

          {previewHtml && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-foreground/60">Preview do E-mail</h2>
                <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)} className="h-7 text-[12px]">
                  <X className="h-3.5 w-3.5 mr-1" /> Fechar
                </Button>
              </div>
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border">
                  <p className="text-[12px] text-foreground/40">
                    <strong>Assunto:</strong> {editAssunto.replace(/\{\{(\w+)\}\}/g, (_, k) => editing.exemplos[k] || `{{${k}}}`)}
                  </p>
                </div>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-0"
                  style={{ height: "500px" }}
                  sandbox="allow-same-origin"
                  title="Preview do template"
                />
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Modelos de e-mail</h1>
          <p className="text-foreground/45 text-[14px] mt-1">Textos dos e-mails automáticos que seus clientes recebem</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map(t => (
              <div key={t.tipo} className="bg-card rounded-2xl border border-border p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary/60" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-foreground">{t.label}</h3>
                      <p className="text-[12px] text-foreground/40">
                        {t.customizado ? (
                          <span className="text-primary font-medium">Personalizado</span>
                        ) : (
                          "Template padrao"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-[12px] gap-1.5"
                      onClick={() => handleTest(t.tipo)}
                      disabled={testing === t.tipo}
                    >
                      <Send className={cn("h-3.5 w-3.5", testing === t.tipo && "animate-pulse")} />
                      {testing === t.tipo ? "Enviando..." : "Enviar Teste"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-[12px] gap-1.5"
                      onClick={() => startEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    {t.customizado && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg text-[12px] gap-1.5 text-foreground/40 hover:text-orange-500"
                        onClick={() => handleReset(t.tipo)}
                        disabled={resetting === t.tipo}
                      >
                        <RotateCcw className={cn("h-3.5 w-3.5", resetting === t.tipo && "animate-spin")} />
                        Restaurar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl px-4 py-3">
                  <p className="text-[12px] text-foreground/50">
                    <strong>Assunto:</strong> {t.assunto}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {t.variaveis.map(v => (
                    <span key={v} className="inline-flex px-2 py-0.5 rounded-md bg-muted/50 text-[10px] text-foreground/35 font-mono">
                      {"{{" + v + "}}"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
