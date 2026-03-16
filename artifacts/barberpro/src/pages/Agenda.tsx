import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListAgendamentos, useListProfissionais, useCreateAgendamento } from "@workspace/api-client-react";
import { generateTimeSlots, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Agenda() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNewOpen, setIsNewOpen] = useState(false);

  const { data: profissionais = [] } = useListProfissionais(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: agendamentos = [], refetch } = useListAgendamentos(barbeariaId!, { data: date }, { query: { enabled: !!barbeariaId } });
  
  const createMutation = useCreateAgendamento();

  const timeSlots = generateTimeSlots("08:00", "20:00", 30);

  const handlePrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMutation.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          clienteNome: fd.get("clienteNome") as string,
          clienteTelefone: fd.get("clienteTelefone") as string,
          profissionalId: Number(fd.get("profissionalId")),
          servicoId: 1, // hardcoded for demo, normally would come from a select populated by useListServicos
          data: date,
          horaInicio: fd.get("horaInicio") as string,
        }
      });
      toast({ title: "Agendado com sucesso!" });
      setIsNewOpen(false);
      refetch();
    } catch (err) {
      toast({ title: "Erro ao agendar", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'confirmado': return 'bg-primary/20 border-primary/50 text-primary';
      case 'cancelado': return 'bg-destructive/20 border-destructive/50 text-destructive';
      case 'bloqueio': return 'bg-muted border-border text-muted-foreground';
      default: return 'bg-secondary border-border text-foreground';
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus horários</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card p-2 rounded-xl border border-border shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}><ChevronLeft className="h-5 w-5"/></Button>
          <div className="flex items-center gap-2 px-4 font-medium min-w-[140px] justify-center">
            <CalendarIcon className="h-4 w-4 text-primary" />
            {new Date(date).toLocaleDateString('pt-BR')}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay}><ChevronRight className="h-5 w-5"/></Button>
        </div>

        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25"><Plus className="mr-2 h-4 w-4"/> Novo Agendamento</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Novo Agendamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="flex gap-2">
                  <Input name="clienteNome" required placeholder="Nome do cliente" className="flex-1 bg-background" />
                  <Button type="button" variant="outline" size="icon"><Search className="h-4 w-4"/></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input name="clienteTelefone" required placeholder="(00) 00000-0000" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Profissional</Label>
                  <Select name="profissionalId" required>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {profissionais.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nomeExibicao}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Select name="horaInicio" required>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="09:00" /></SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>Confirmar Agendamento</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* AGENDA GRID */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
        {/* Header Row */}
        <div className="flex border-b border-border bg-muted/30">
          <div className="w-20 shrink-0 border-r border-border p-4 flex items-center justify-center">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {profissionais.map(prof => (
              <div key={prof.id} className="flex-1 min-w-[200px] p-4 text-center border-r border-border last:border-r-0">
                <p className="font-semibold text-foreground truncate">{prof.nomeExibicao}</p>
                <p className="text-xs text-primary mt-1 font-medium">{formatCurrency(0)} hoje</p>
              </div>
            ))}
          </div>
        </div>

        {/* Time Grid */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="flex min-h-max">
            {/* Time Column */}
            <div className="w-20 shrink-0 border-r border-border bg-card">
              {timeSlots.map(time => (
                <div key={time} className="h-20 border-b border-border flex items-center justify-center text-sm text-muted-foreground">
                  {time}
                </div>
              ))}
            </div>

            {/* Professional Columns */}
            <div className="flex-1 flex relative">
              {profissionais.map(prof => (
                <div key={prof.id} className="flex-1 min-w-[200px] border-r border-border last:border-r-0 relative">
                  {/* Grid lines */}
                  {timeSlots.map(time => (
                    <div key={time} className="h-20 border-b border-border/50 hover:bg-muted/10 transition-colors cursor-pointer group">
                      <div className="opacity-0 group-hover:opacity-100 absolute left-2 text-xs text-primary font-medium mt-1">
                        + {time}
                      </div>
                    </div>
                  ))}

                  {/* Appointments Overlay */}
                  {agendamentos.filter(a => a.profissionalId === prof.id).map(agendamento => {
                    const slotIndex = timeSlots.indexOf(agendamento.horaInicio);
                    if (slotIndex === -1) return null;
                    const top = slotIndex * 80;
                    const height = 80; // Assuming 30 min duration for simplicty, real app calculates based on horaFim

                    return (
                      <div 
                        key={agendamento.id} 
                        className={`absolute left-1 right-1 rounded-lg border p-2 text-sm shadow-sm transition-transform hover:scale-[1.02] cursor-pointer z-10 flex flex-col justify-between ${getStatusColor(agendamento.status)}`}
                        style={{ top: `${top + 2}px`, height: `${height - 4}px` }}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold truncate">{agendamento.clienteNome}</span>
                          {agendamento.status === 'pago' && <span className="text-xs">💰</span>}
                        </div>
                        <div className="flex justify-between items-end text-xs opacity-90 mt-1">
                          <span className="truncate max-w-[100px]">{agendamento.servicoNome}</span>
                          <span className="font-medium">{formatCurrency(agendamento.valor)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
