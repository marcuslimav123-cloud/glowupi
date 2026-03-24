import React, { useState } from 'react';
import './_group.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { 
  Sparkles, 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  Users, 
  Scissors, 
  Package, 
  UserCircle, 
  FileText, 
  Wallet, 
  BadgeDollarSign, 
  Store, 
  Gift,
  TrendingUp,
  DollarSign,
  UserPlus,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

const mockData = {
  faturamentoTotal: 12450.00,
  faturamentoVariacao: 8.5,
  totalAgendamentos: 47,
  ticketMedio: 265.00,
  clientesNovos: 12,
  faturamentoPorDia: [
    { data: 'Seg', valor: 1800 }, { data: 'Ter', valor: 2200 },
    { data: 'Qua', valor: 1600 }, { data: 'Qui', valor: 2800 },
    { data: 'Sex', valor: 3200 }, { data: 'Sáb', valor: 850 },
  ],
  topServicos: [
    { nome: 'Manicure Gel', valor: 35, percentual: 35 },
    { nome: 'Design de Sobrancelha', valor: 25, percentual: 25 },
    { nome: 'Hidratação Capilar', valor: 20, percentual: 20 },
    { nome: 'Limpeza de Pele', valor: 15, percentual: 15 },
    { nome: 'Coloração', valor: 5, percentual: 5 },
  ],
  rankingProfissionais: [
    { profissionalId: 1, nome: 'Ana Beatriz', atendimentos: 18, faturamento: 4850 },
    { profissionalId: 2, nome: 'Carla Mendes', atendimentos: 15, faturamento: 3920 },
    { profissionalId: 3, nome: 'Juliana Lima', atendimentos: 14, faturamento: 3680 },
  ],
  alertas: [
    { nivel: 'warning', mensagem: 'Estoque baixo: Base Coat UV (3 unidades)' },
    { nivel: 'danger', mensagem: 'Agenda lotada para sexta-feira' },
  ],
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const COLORS = ['#d4a853', '#e09891', '#c98e46', '#8e6c7a', '#1e5f6e'];

export function GlamourNoir() {
  const [period, setPeriod] = useState('Semana');

  return (
    <div className="min-h-screen bg-[#1a1020] text-[#e8e4eb] font-['Nunito'] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#d4a853]/20 bg-[#130b18] flex flex-col hidden md:flex shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-[#d4a853]/20">
          <Sparkles className="h-6 w-6 text-[#d4a853] mr-3" />
          <span className="font-['Playfair_Display'] text-2xl font-bold tracking-wide text-[#d4a853] italic">Glow Agenda</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div className="space-y-1">
            <a href="#" className="flex items-center px-4 py-3 bg-[#d4a853]/10 text-[#d4a853] rounded border border-[#d4a853]/30 shadow-[0_0_10px_rgba(212,168,83,0.1)] transition-all">
              <LayoutDashboard className="h-5 w-5 mr-3" />
              <span className="font-semibold tracking-wide">Dashboard</span>
            </a>
          </div>

          <div>
            <div className="px-4 mb-3 text-xs font-['Playfair_Display'] tracking-[0.2em] text-[#d4a853]/60 uppercase">Agenda</div>
            <div className="space-y-1">
              <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
                <Calendar className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Agenda</span>
              </a>
              <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
                <Clock className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Horários de Pico</span>
              </a>
            </div>
          </div>

          <div>
            <div className="px-4 mb-3 text-xs font-['Playfair_Display'] tracking-[0.2em] text-[#d4a853]/60 uppercase">Gestão</div>
            <div className="space-y-1">
              <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
                <Users className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Profissionais</span>
              </a>
              <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
                <Scissors className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Serviços</span>
              </a>
              <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
                <Package className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Produtos</span>
              </a>
              <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
                <UserCircle className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Clientes</span>
              </a>
            </div>
          </div>

          <div className="space-y-1 pt-4 border-t border-[#d4a853]/10">
            <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
              <FileText className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Relatórios</span>
            </a>
            <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
              <Wallet className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Caixa</span>
            </a>
            <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
              <BadgeDollarSign className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Financeiro</span>
            </a>
            <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
              <Store className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Meu Estúdio</span>
            </a>
            <a href="#" className="flex items-center px-4 py-2.5 text-[#e8e4eb]/70 hover:text-[#d4a853] hover:bg-[#d4a853]/5 rounded transition-colors group">
              <Gift className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Clube de Fidelidade</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#d4a853]/20 pb-6">
            <div>
              <h1 className="text-4xl font-['Playfair_Display'] text-[#d4a853] italic font-semibold tracking-wide">Dashboard</h1>
              <p className="text-[#e8e4eb]/60 mt-2 font-light tracking-wide">Uma visão refinada do seu império de beleza.</p>
            </div>
            
            <div className="flex bg-[#2a1f35] p-1 rounded-sm border border-[#d4a853]/20">
              {['Hoje', 'Semana', 'Mês'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-6 py-1.5 text-sm transition-all duration-300 ${
                    period === p 
                      ? 'bg-[#d4a853] text-[#1a1020] font-semibold shadow-[0_0_15px_rgba(212,168,83,0.3)]' 
                      : 'text-[#e8e4eb]/70 hover:text-[#d4a853]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#2a1f35]/80 border-[#d4a853]/20 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#d4a853]/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm font-['Playfair_Display'] text-[#d4a853]/80 uppercase tracking-widest">Faturamento</p>
                    <p className="text-3xl font-light text-[#e8e4eb] tracking-wide">{formatCurrency(mockData.faturamentoTotal)}</p>
                  </div>
                  <div className="p-3 bg-[#d4a853]/10 rounded-full border border-[#d4a853]/20">
                    <DollarSign className="h-5 w-5 text-[#d4a853]" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-[#d4a853] mr-1" />
                  <span className="text-[#d4a853] font-medium">+{mockData.faturamentoVariacao}%</span>
                  <span className="text-[#e8e4eb]/50 ml-2 font-light">vs. período anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#2a1f35]/80 border-[#d4a853]/20 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#d4a853]/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm font-['Playfair_Display'] text-[#d4a853]/80 uppercase tracking-widest">Agendamentos</p>
                    <p className="text-3xl font-light text-[#e8e4eb] tracking-wide">{mockData.totalAgendamentos}</p>
                  </div>
                  <div className="p-3 bg-[#d4a853]/10 rounded-full border border-[#d4a853]/20">
                    <Calendar className="h-5 w-5 text-[#d4a853]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#2a1f35]/80 border-[#d4a853]/20 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#d4a853]/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm font-['Playfair_Display'] text-[#d4a853]/80 uppercase tracking-widest">Ticket Médio</p>
                    <p className="text-3xl font-light text-[#e8e4eb] tracking-wide">{formatCurrency(mockData.ticketMedio)}</p>
                  </div>
                  <div className="p-3 bg-[#d4a853]/10 rounded-full border border-[#d4a853]/20">
                    <BadgeDollarSign className="h-5 w-5 text-[#d4a853]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#2a1f35]/80 border-[#d4a853]/20 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#d4a853]/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm font-['Playfair_Display'] text-[#d4a853]/80 uppercase tracking-widest">Novos Clientes</p>
                    <p className="text-3xl font-light text-[#e8e4eb] tracking-wide">{mockData.clientesNovos}</p>
                  </div>
                  <div className="p-3 bg-[#d4a853]/10 rounded-full border border-[#d4a853]/20">
                    <UserPlus className="h-5 w-5 text-[#d4a853]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-[#2a1f35]/80 border-[#d4a853]/20 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardHeader className="border-b border-[#d4a853]/10 pb-4">
                <CardTitle className="font-['Playfair_Display'] text-xl font-medium text-[#d4a853] tracking-wide">Faturamento por Dia</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockData.faturamentoPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis 
                        dataKey="data" 
                        stroke="#e8e4eb" 
                        opacity={0.5}
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#e8e4eb" 
                        opacity={0.5}
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip 
                        cursor={{fill: '#d4a853', opacity: 0.1}}
                        contentStyle={{ 
                          backgroundColor: '#1a1020', 
                          border: '1px solid rgba(212,168,83,0.3)',
                          borderRadius: '4px',
                          color: '#e8e4eb'
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                      />
                      <Bar dataKey="valor" radius={[2, 2, 0, 0]} maxBarSize={40}>
                        {mockData.faturamentoPorDia.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === mockData.faturamentoPorDia.length - 2 ? '#d4a853' : 'rgba(212,168,83,0.4)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#2a1f35]/80 border-[#d4a853]/20 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardHeader className="border-b border-[#d4a853]/10 pb-4">
                <CardTitle className="font-['Playfair_Display'] text-xl font-medium text-[#d4a853] tracking-wide">Top Serviços</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockData.topServicos}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="percentual"
                        stroke="none"
                      >
                        {mockData.topServicos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1020', 
                          border: '1px solid rgba(212,168,83,0.3)',
                          borderRadius: '4px',
                          color: '#e8e4eb'
                        }}
                        formatter={(value: number) => [`${value}%`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-3 mt-2">
                  {mockData.topServicos.slice(0, 3).map((servico, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-[#e8e4eb]/80">{servico.nome}</span>
                      </div>
                      <span className="font-medium text-[#d4a853]">{servico.percentual}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#2a1f35]/80 border-[#d4a853]/20 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardHeader className="border-b border-[#d4a853]/10 pb-4">
                <CardTitle className="font-['Playfair_Display'] text-xl font-medium text-[#d4a853] tracking-wide flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-[#d4a853]" />
                  Ranking Profissionais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[#d4a853]/10">
                  {mockData.rankingProfissionais.map((prof, i) => (
                    <div key={prof.profissionalId} className="flex items-center justify-between p-4 hover:bg-[#d4a853]/5 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#1a1020] border border-[#d4a853]/30 flex items-center justify-center font-['Playfair_Display'] text-[#d4a853] text-lg font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium text-[#e8e4eb] group-hover:text-[#d4a853] transition-colors">{prof.nome}</p>
                          <p className="text-xs text-[#e8e4eb]/50 tracking-wide">{prof.atendimentos} atendimentos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[#d4a853]">{formatCurrency(prof.faturamento)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#2a1f35]/80 border-[#d4a853]/20 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardHeader className="border-b border-[#d4a853]/10 pb-4">
                <CardTitle className="font-['Playfair_Display'] text-xl font-medium text-[#d4a853] tracking-wide flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-[#d4a853]" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {mockData.alertas.map((alerta, i) => (
                  <div 
                    key={i} 
                    className={`p-4 border-l-2 flex items-start gap-3 bg-[#1a1020]/50 ${
                      alerta.nivel === 'warning' 
                        ? 'border-[#c98e46]' 
                        : 'border-[#e09891]'
                    }`}
                  >
                    <AlertTriangle className={`h-5 w-5 shrink-0 ${alerta.nivel === 'warning' ? 'text-[#c98e46]' : 'text-[#e09891]'}`} />
                    <p className="text-sm text-[#e8e4eb]/80 pt-0.5 leading-relaxed">{alerta.mensagem}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
