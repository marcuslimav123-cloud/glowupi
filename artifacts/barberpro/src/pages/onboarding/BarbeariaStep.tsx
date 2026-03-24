import React, { useState } from "react";
import { useCreateBarbearia } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BarbeariaStep() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateBarbearia();
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    cidade: "",
    uf: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleCepBlur = async () => {
    if (formData.cep.length >= 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${formData.cep.replace(/\D/g, '')}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf
          }));
        }
      } catch (e) {
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ data: formData });
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao configurar seu estúdio.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafafa]">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-foreground text-white flex items-center justify-center text-[12px] font-bold">1</div>
              <span className="font-medium text-[13px] text-foreground">Seu Estúdio</span>
            </div>
            <div className="h-0.5 flex-1 mx-4 bg-black/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-foreground w-1/3"></div>
            </div>
            <div className="flex items-center gap-2 opacity-30">
              <div className="h-7 w-7 rounded-full bg-white border border-black/[0.08] flex items-center justify-center text-[12px] font-bold">2</div>
            </div>
          </div>
          <h1 className="text-[24px] font-bold text-foreground">Configure seu espaço</h1>
          <p className="text-foreground/40 text-[14px] mt-1">Insira os dados do seu salão ou estúdio para começarmos.</p>
        </div>

        <div className="bg-white border border-black/[0.06] rounded-2xl p-6 md:p-8 shadow-xl shadow-black/[0.03]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome do Salão / Estúdio *</Label>
                <Input id="nome" required value={formData.nome} onChange={handleChange} className="h-12 text-lg" placeholder="Ex: Studio Glow Beauty" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone / WhatsApp *</Label>
                <Input id="telefone" required value={formData.telefone} onChange={handleChange} className="h-11" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} className="h-11" placeholder="00000-000" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="logradouro">Endereço</Label>
                <Input id="logradouro" value={formData.logradouro} onChange={handleChange} className="h-11" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" value={formData.numero} onChange={handleChange} className="h-11" />
              </div>

              <div className="space-y-2 flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" value={formData.cidade} onChange={handleChange} className="h-11" />
                </div>
                <div className="w-24 space-y-2">
                  <Label htmlFor="uf">UF</Label>
                  <Input id="uf" value={formData.uf} onChange={handleChange} className="h-11" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" size="lg" className="px-8 shadow-lg shadow-primary/20" disabled={createMutation.isPending}>
                Continuar <CheckCircle2 className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
