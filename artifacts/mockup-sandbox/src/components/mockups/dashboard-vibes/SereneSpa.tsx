import React, { useState } from 'react';
import './_group.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import {
  Sparkles,
  LayoutDashboard,
  CalendarDays,
  Clock,
  Users,
  Scissors,
  Package,
  UserCheck,
  FileText,
  Wallet,
  DollarSign,
  Building2,
  Heart,
  TrendingUp,
  ArrowUpRight,
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

const COLORS = ['#7c9a8a', '#a6b8ae', '#d2b48c', '#a8b6c4', '#c2b3a9'];

export function SereneSpa() {
  const [period, setPeriod] = useState('Semana');

  return (
    <div className="min-h-screen flex bg-[#f7f9f7] font-['Nunito'] text-[#4a5550]">
      {/* Sidebar */}
      <aside className="w-64 bg-white/60 border-r border-[#e5ebe7] flex flex-col backdrop-blur-sm">
        <div className="p-8 pb-4 flex items-center gap-3">
          <div className="p-2 bg-[#f0f4f1] rounded-full text-[#7c9a8a]">
            <Sparkles size={20} strokeWidth={1.5} />
          </div>
          <span className="font-['Playfair_Display'] font-semibold text-xl tracking-wide text-[#334038]">Glow Upi</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          <div>
            <div className="space-y-1">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
            </div>
          </div>

          <div>
            <h4 className="px-4 text-xs font-semibold tracking-widest text-[#8a9f93] uppercase mb-3">Agenda</h4>
            <div className="space-y-1">
              <SidebarItem icon={CalendarDays} label="Agenda" />
              <SidebarItem icon={Clock} label="Horários de Pico" />
            </div>
          </div>

          <div>
            <h4 className="px-4 text-xs font-semibold tracking-widest text-[#8a9f93] uppercase mb-3">Gestão</h4>
            <div className="space-y-1">
              <SidebarItem icon={Users} label="Profissionais" />
              <SidebarItem icon={Scissors} label="Serviços" />
              <SidebarItem icon={Package} label="Produtos" />
              <SidebarItem icon={UserCheck} label="Clientes" />
            </div>
          </div>

          <div>
            <h4 className="px-4 text-xs font-semibold tracking-widest text-[#8a9f93] uppercase mb-3">Financeiro & Mais</h4>
            <div className="space-y-1">
              <SidebarItem icon={FileText} label="Relatórios" />
              <SidebarItem icon={Wallet} label="Caixa" />
              <SidebarItem icon={DollarSign} label="Financeiro" />
              <SidebarItem icon={Building2} label="Meu Estúdio" />
              <SidebarItem icon={Heart} label="Clube de Fidelidade" />
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-10 space-y-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-['Playfair_Display'] text-4xl font-medium text-[#2d3a33] tracking-tight mb-2">Dashboard</h1>
              <p className="text-[#7c9a8a] text-sm tracking-wide">Bem-vinda de volta. Aqui está o resumo do seu estúdio.</p>
            </div>
            
            <div className="flex bg-white rounded-full p-1 border border-[#e5ebe7] shadow-sm">
              {['Hoje', 'Semana', 'Mês'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-out ${
                    period === p 
                      ? 'bg-[#f0f4f1] text-[#4a5550]' 
                      : 'text-[#8a9f93] hover:text-[#4a5550]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Faturamento" 
              value={`R$ ${mockData.faturamentoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
              trend={`+${mockData.faturamentoVariacao}%`}
              icon={TrendingUp}
            />
            <MetricCard 
              title="Agendamentos" 
              value={mockData.totalAgendamentos}
              icon={CalendarDays}
            />
            <MetricCard 
              title="Ticket Médio" 
              value={`R$ ${mockData.ticketMedio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
              icon={Wallet}
            />
            <MetricCard 
              title="Novos Clientes" 
              value={mockData.clientesNovos}
              icon={UserCheck}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-[#e5ebe7] shadow-sm bg-white/80 backdrop-blur-md rounded-2xl">
              <CardHeader className="pb-8 pt-8 px-8">
                <CardTitle className="font-['Playfair_Display'] font-medium text-xl text-[#2d3a33]">Faturamento</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockData.faturamentoPorDia} barSize={32}>
                      <XAxis 
                        dataKey="data" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#8a9f93', fontSize: 13}}
                        dy={10}
                      />
                      <YAxis 
                        hide 
                      />
                      <Tooltip 
                        cursor={{fill: '#f7f9f7'}}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid #e5ebe7',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                          padding: '12px'
                        }}
                        formatter={(value) => [`R$ ${value}`, 'Faturamento']}
                      />
                      <Bar dataKey="valor" radius={[6, 6, 6, 6]}>
                        {mockData.faturamentoPorDia.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 4 ? '#7c9a8a' : '#d8e0da'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#e5ebe7] shadow-sm bg-white/80 backdrop-blur-md rounded-2xl">
              <CardHeader className="pb-4 pt-8 px-8">
                <CardTitle className="font-['Playfair_Display'] font-medium text-xl text-[#2d3a33]">Top Serviços</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockData.topServicos}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="valor"
                        stroke="none"
                      >
                        {mockData.topServicos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid #e5ebe7',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 mt-4">
                  {mockData.topServicos.slice(0,3).map((servico, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i]}} />
                        <span className="text-[#4a5550]">{servico.nome}</span>
                      </div>
                      <span className="font-medium text-[#2d3a33]">{servico.percentual}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
            <Card className="border-[#e5ebe7] shadow-sm bg-white/80 backdrop-blur-md rounded-2xl">
              <CardHeader className="pb-6 pt-8 px-8">
                <CardTitle className="font-['Playfair_Display'] font-medium text-xl text-[#2d3a33]">Ranking Profissionais</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="space-y-6">
                  {mockData.rankingProfissionais.map((prof, i) => (
                    <div key={prof.profissionalId} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#f0f4f1] text-[#7c9a8a] flex items-center justify-center font-['Playfair_Display'] font-medium">
                          {prof.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#2d3a33] group-hover:text-[#7c9a8a] transition-colors">{prof.nome}</p>
                          <p className="text-xs text-[#8a9f93] tracking-wide mt-0.5">{prof.atendimentos} atendimentos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[#2d3a33]">R$ {prof.faturamento.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#e5ebe7] shadow-sm bg-white/80 backdrop-blur-md rounded-2xl">
              <CardHeader className="pb-6 pt-8 px-8">
                <CardTitle className="font-['Playfair_Display'] font-medium text-xl text-[#2d3a33]">Alertas</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4">
                {mockData.alertas.map((alerta, i) => (
                  <div 
                    key={i} 
                    className="flex gap-4 p-5 rounded-xl border border-[#e5ebe7] bg-white transition-all hover:shadow-sm"
                  >
                    <div className="mt-0.5">
                      {alerta.nivel === 'warning' ? (
                        <AlertTriangle className="text-[#d2b48c] w-5 h-5" strokeWidth={1.5} />
                      ) : (
                        <AlertCircle className="text-[#c2b3a9] w-5 h-5" strokeWidth={1.5} />
                      )}
                    </div>
                    <div>
                      <h5 className={`font-medium mb-1 ${alerta.nivel === 'warning' ? 'text-[#a68a5c]' : 'text-[#a18776]'}`}>
                        {alerta.nivel === 'warning' ? 'Atenção Necessária' : 'Ação Imediata'}
                      </h5>
                      <p className="text-[#4a5550] text-sm leading-relaxed">{alerta.mensagem}</p>
                    </div>
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

function SidebarItem({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
      active 
        ? 'bg-[#f0f4f1] text-[#2d3a33] font-medium' 
        : 'text-[#6a7a70] hover:bg-white/50 hover:text-[#2d3a33]'
    }`}>
      <Icon size={18} strokeWidth={active ? 2 : 1.5} className={active ? "text-[#7c9a8a]" : "text-[#8a9f93]"} />
      <span className="text-sm tracking-wide">{label}</span>
    </button>
  );
}

function MetricCard({ title, value, trend, icon: Icon }: { title: string, value: string | number, trend?: string, icon: any }) {
  return (
    <Card className="border-[#e5ebe7] shadow-sm bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-500">
      <CardContent className="p-8 relative">
        <div className="flex justify-between items-start mb-6 relative z-10">
          <p className="text-[#8a9f93] font-medium text-sm tracking-wide uppercase">{title}</p>
          <div className="p-2.5 rounded-full bg-[#f0f4f1] text-[#7c9a8a] group-hover:scale-110 group-hover:bg-[#7c9a8a] group-hover:text-white transition-all duration-500">
            <Icon size={18} strokeWidth={1.5} />
          </div>
        </div>
        <div className="flex items-baseline gap-3 relative z-10">
          <h3 className="font-['Playfair_Display'] text-3xl font-medium text-[#2d3a33]">{value}</h3>
          {trend && (
            <span className="flex items-center text-xs font-medium text-[#7c9a8a] bg-[#f0f4f1] px-2 py-1 rounded-full">
              <ArrowUpRight size={12} className="mr-0.5" />
              {trend}
            </span>
          )}
        </div>
        <div className="absolute right-0 bottom-0 opacity-[0.03] transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
          <Icon size={100} strokeWidth={1} />
        </div>
      </CardContent>
    </Card>
  );
}
