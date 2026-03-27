import React from 'react';
import './_group.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie
} from 'recharts';
import { 
  Sparkles, LayoutDashboard, Calendar, Clock, Users, 
  Scissors, Package, FileText, Wallet, DollarSign, 
  Store, Award, TrendingUp, AlertCircle, Bell, ArrowRight
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

const COLORS = ['#ff6b8a', '#7c3aed', '#14b8a6', '#f59e0b', '#0ea5e9'];

export function PopPlay() {
  return (
    <div className="min-h-screen bg-fuchsia-50/50 flex font-['Nunito'] text-slate-800 selection:bg-pink-200">
      
      {/* Sidebar */}
      <aside className="w-72 bg-white m-4 rounded-3xl shadow-xl shadow-pink-100/50 border-4 border-white flex flex-col overflow-hidden relative overflow-y-auto">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-pink-400 via-violet-500 to-teal-400"></div>
        <div className="p-8 pb-4 flex items-center gap-3 relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-200 rotate-3 transition-transform hover:rotate-12 cursor-pointer">
            <Sparkles size={24} />
          </div>
          <span className="font-['Playfair_Display'] font-bold text-2xl bg-gradient-to-r from-pink-600 to-violet-600 bg-clip-text text-transparent">Glow Upi</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-3 px-4">Menu</div>
            <div className="space-y-1">
              <SidebarItem icon={<LayoutDashboard />} label="Dashboard" active />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3 px-4">Agenda</div>
            <div className="space-y-1">
              <SidebarItem icon={<Calendar />} label="Agenda" />
              <SidebarItem icon={<Clock />} label="Horários de Pico" />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-3 px-4">Gestão</div>
            <div className="space-y-1">
              <SidebarItem icon={<Users />} label="Profissionais" />
              <SidebarItem icon={<Scissors />} label="Serviços" />
              <SidebarItem icon={<Package />} label="Produtos" />
              <SidebarItem icon={<Users />} label="Clientes" />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3 px-4">Negócio</div>
            <div className="space-y-1">
              <SidebarItem icon={<FileText />} label="Relatórios" />
              <SidebarItem icon={<Wallet />} label="Caixa" />
              <SidebarItem icon={<DollarSign />} label="Financeiro" />
              <SidebarItem icon={<Store />} label="Meu Estúdio" />
              <SidebarItem icon={<Award />} label="Clube de Fidelidade" />
            </div>
          </div>
        </nav>
        
        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-r from-pink-100 to-violet-100 rounded-2xl p-4 text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 text-pink-500 shadow-sm">
              <Sparkles size={20} />
            </div>
            <p className="font-bold text-sm text-slate-800">Plano Pro</p>
            <p className="text-xs text-slate-500 mb-3">Todos os recursos liberados</p>
            <button className="w-full py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 hover:shadow-lg transition-all hover:-translate-y-0.5">
              Fazer Upgrade
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 pl-0 md:p-8 md:pl-4 overflow-y-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 bg-white p-6 rounded-3xl shadow-sm border border-fuchsia-100 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-10 right-20 w-40 h-40 bg-violet-100 rounded-full blur-3xl opacity-50"></div>
          
          <div className="relative z-10">
            <h1 className="font-['Playfair_Display'] text-4xl font-bold text-slate-800 mb-1">
              Dashboard <span className="text-3xl text-pink-400">✨</span>
            </h1>
            <p className="text-slate-500 font-medium">Bem-vinda de volta! Aqui está o resumo do seu estúdio.</p>
          </div>
          
          <div className="flex bg-fuchsia-50 rounded-2xl p-1 relative z-10 border border-fuchsia-100 shadow-inner">
            <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Hoje</button>
            <button className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-pink-600 shadow-sm transition-colors">Semana</button>
            <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Mês</button>
          </div>
        </header>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard 
            title="Faturamento" 
            value={`R$ ${mockData.faturamentoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
            trend={`+${mockData.faturamentoVariacao}%`}
            icon={<Wallet size={24} />}
            color="pink"
          />
          <MetricCard 
            title="Agendamentos" 
            value={mockData.totalAgendamentos}
            icon={<Calendar size={24} />}
            color="violet"
          />
          <MetricCard 
            title="Ticket Médio" 
            value={`R$ ${mockData.ticketMedio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
            icon={<TrendingUp size={24} />}
            color="teal"
          />
          <MetricCard 
            title="Novos Clientes" 
            value={mockData.clientesNovos}
            icon={<Users size={24} />}
            color="amber"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <Card className="lg:col-span-2 rounded-3xl border-0 shadow-lg shadow-pink-100/40 overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-400 via-violet-400 to-teal-400"></div>
            <CardHeader className="pb-2 pt-8 px-8">
              <CardTitle className="font-['Playfair_Display'] text-2xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                  <TrendingUp size={16} />
                </span>
                Faturamento da Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] pt-4 px-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData.faturamentoPorDia} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="data" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 13 }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#fdf4ff', radius: 8 }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(236, 72, 153, 0.2)', padding: '12px' }}
                    formatter={(value: number) => [`R$ ${value}`, 'Faturamento']}
                    labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}
                  />
                  <Bar dataKey="valor" radius={[10, 10, 10, 10]} barSize={40}>
                    {mockData.faturamentoPorDia.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-lg shadow-pink-100/40 overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-400 to-fuchsia-400"></div>
            <CardHeader className="pb-0 pt-8 px-8">
              <CardTitle className="font-['Playfair_Display'] text-2xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-500">
                  <Award size={16} />
                </span>
                Top Serviços
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] flex flex-col justify-center pb-8">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockData.topServicos}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="valor"
                      stroke="none"
                    >
                      {mockData.topServicos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.2)' }}
                      formatter={(value: number) => [`${value}%`, 'Participação']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-3 px-2">
                {mockData.topServicos.slice(0, 4).map((servico, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-xs font-semibold text-slate-600 truncate">{servico.nome}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
          
          <Card className="rounded-3xl border-0 shadow-lg shadow-pink-100/40 overflow-hidden relative">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-400 to-sky-400"></div>
            <CardHeader className="pb-4 pt-8 px-8 flex flex-row items-center justify-between">
              <CardTitle className="font-['Playfair_Display'] text-2xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-500">
                  <StarIcon size={16} />
                </span>
                Ranking Profissionais
              </CardTitle>
              <button className="text-teal-500 hover:text-teal-600 font-bold text-sm bg-teal-50 px-4 py-2 rounded-xl transition-colors">
                Ver todos
              </button>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="space-y-4">
                {mockData.rankingProfissionais.map((prof, index) => (
                  <div key={prof.profissionalId} className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-teal-100 hover:shadow-md transition-all group">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white mr-4 shadow-sm ${index === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500' : index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' : index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900' : 'bg-slate-200 text-slate-600'}`}>
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-lg group-hover:text-teal-600 transition-colors">{prof.nome}</h4>
                      <p className="text-slate-500 text-sm font-medium">{prof.atendimentos} atendimentos</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">
                        R$ {prof.faturamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-lg shadow-pink-100/40 overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-red-400"></div>
            <CardHeader className="pb-4 pt-8 px-8">
              <CardTitle className="font-['Playfair_Display'] text-2xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-500">
                  <Bell size={16} />
                </span>
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="space-y-4">
                {mockData.alertas.map((alerta, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 ${
                      alerta.nivel === 'danger' 
                        ? 'bg-red-50/50 border-red-100' 
                        : 'bg-amber-50/50 border-amber-100'
                    }`}
                  >
                    <div className={`mt-0.5 p-2 rounded-xl ${
                      alerta.nivel === 'danger' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'
                    }`}>
                      <AlertCircle size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-lg mb-1 ${
                        alerta.nivel === 'danger' ? 'text-red-700' : 'text-amber-700'
                      }`}>
                        {alerta.nivel === 'danger' ? 'Atenção' : 'Aviso'}
                      </h4>
                      <p className={`font-medium ${
                        alerta.nivel === 'danger' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {alerta.mensagem}
                      </p>
                    </div>
                    <button className={`p-2 rounded-xl transition-colors ${
                      alerta.nivel === 'danger' ? 'hover:bg-red-100 text-red-400' : 'hover:bg-amber-100 text-amber-400'
                    }`}>
                      <ArrowRight size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}

// Icon helper components that weren't imported
function StarIcon({ size = 24, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  );
}

// Subcomponents
function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  if (active) {
    return (
      <button className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-2xl font-bold shadow-md shadow-pink-200/50 transition-all hover:-translate-y-0.5 group">
        <span className="text-white/90 group-hover:text-white transition-colors">{icon}</span>
        <span>{label}</span>
      </button>
    );
  }
  
  return (
    <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-800 hover:bg-fuchsia-50 font-bold rounded-2xl transition-all group">
      <span className="text-slate-400 group-hover:text-pink-400 transition-colors">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MetricCard({ title, value, trend, icon, color }: { title: string, value: string | number, trend?: string, icon: React.ReactNode, color: 'pink' | 'violet' | 'teal' | 'amber' }) {
  const colorMap = {
    pink: {
      bg: 'bg-pink-100',
      text: 'text-pink-500',
      gradient: 'from-pink-400 to-pink-500',
      shadow: 'shadow-pink-100',
      border: 'border-pink-100'
    },
    violet: {
      bg: 'bg-violet-100',
      text: 'text-violet-500',
      gradient: 'from-violet-400 to-violet-500',
      shadow: 'shadow-violet-100',
      border: 'border-violet-100'
    },
    teal: {
      bg: 'bg-teal-100',
      text: 'text-teal-500',
      gradient: 'from-teal-400 to-teal-500',
      shadow: 'shadow-teal-100',
      border: 'border-teal-100'
    },
    amber: {
      bg: 'bg-amber-100',
      text: 'text-amber-500',
      gradient: 'from-amber-400 to-amber-500',
      shadow: 'shadow-amber-100',
      border: 'border-amber-100'
    }
  };

  const theme = colorMap[color];

  return (
    <Card className={`rounded-3xl border-2 ${theme.border} shadow-lg shadow-slate-100/50 hover:shadow-xl hover:${theme.shadow}/40 transition-all hover:-translate-y-1 overflow-hidden relative group bg-white`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.gradient} opacity-[0.03] rounded-bl-full group-hover:opacity-[0.08] transition-opacity`}></div>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-14 h-14 rounded-2xl ${theme.bg} flex items-center justify-center ${theme.text} rotate-3 group-hover:rotate-6 transition-transform`}>
            {icon}
          </div>
          {trend && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
              {trend}
            </span>
          )}
        </div>
        <h3 className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">{title}</h3>
        <p className="text-3xl font-['Playfair_Display'] font-bold text-slate-800">{value}</p>
      </CardContent>
    </Card>
  );
}
