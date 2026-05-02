import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import {
  apiUrl, fetchJson, formatCurrency, todayStr, dateToStr, strToDate,
  shortDateLabel, getHorizontalRange, getWeekDates, WEEKDAYS_PT, MONTHS_PT,
  whatsappLink,
} from "@/lib/api";

type ViewMode = "dia" | "semana" | "mes";

type Agendamento = {
  id: number;
  clienteId?: number | null;
  clienteNome: string;
  clienteTelefone?: string | null;
  profissionalId: number;
  profissionalNome: string;
  servicoId: number;
  servicoNome: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  valor: number | string;
  pago: boolean;
  encaixe?: boolean;
  aniversario?: boolean;
  vip?: boolean;
  observacao?: string | null;
  atendimentoId?: number | null;
  pacoteClienteId?: number | null;
};

type Profissional = {
  id: number;
  nomeExibicao: string;
  apelido?: string | null;
  fotoUrl?: string | null;
  ativo?: boolean;
  ordem?: number;
};

function statusInfo(status: string, encaixe?: boolean): { color: string; label: string; bg: string } {
  if (encaixe) return { color: Colors.warning, label: "Encaixe", bg: Colors.warning + "20" };
  switch (status) {
    case "pago": return { color: Colors.success, label: "Pago", bg: Colors.success + "20" };
    case "confirmado": return { color: Colors.accent, label: "Confirmado", bg: Colors.accent + "20" };
    case "pendente_aprovacao": return { color: Colors.warning, label: "Pendente", bg: Colors.warning + "22" };
    case "recusado": return { color: Colors.error, label: "Recusado", bg: Colors.error + "20" };
    case "cancelado": return { color: Colors.error, label: "Cancelado", bg: Colors.error + "20" };
    case "concluido": return { color: Colors.info, label: "Concluído", bg: Colors.info + "20" };
    default: return { color: Colors.textMuted, label: status, bg: Colors.surfaceLight };
  }
}

export default function AgendaIndex() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();

  const [date, setDate] = useState(() => todayStr());
  const [viewMode, setViewMode] = useState<ViewMode>("dia");
  const [selectedProfId, setSelectedProfId] = useState<string>("all");
  const [showOnlyPendentes, setShowOnlyPendentes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const horizontalDates = useMemo(() => getHorizontalRange(date, 3, 10), [date]);
  const weekDates = useMemo(() => getWeekDates(date), [date]);

  const dateRangeParams = useMemo(() => {
    if (viewMode === "dia") return `?data=${date}`;
    if (viewMode === "semana") return `?dataInicio=${weekDates[0]}&dataFim=${weekDates[6]}`;
    const d = strToDate(date);
    const first = dateToStr(new Date(d.getFullYear(), d.getMonth(), 1));
    const last = dateToStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return `?dataInicio=${first}&dataFim=${last}`;
  }, [viewMode, date, weekDates]);

  const { data: agendamentos = [], isLoading, isError, error, refetch } = useQuery<Agendamento[]>({
    queryKey: ["agendamentos", barbeariaId, dateRangeParams],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const data = await fetchJson<Agendamento[]>(`/barbearias/${barbeariaId}/agendamentos${dateRangeParams}`);
      return Array.isArray(data) ? data.map(a => ({ ...a, valor: parseFloat(String(a.valor)) })) : [];
    },
    enabled: !!barbeariaId,
  });

  const { data: profissionais = [] } = useQuery<Profissional[]>({
    queryKey: ["profissionais", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const data = await fetchJson<Profissional[]>(`/barbearias/${barbeariaId}/profissionais`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!barbeariaId,
  });

  const { data: pendentesCount = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["agendamentos-pendentes-count", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return { count: 0 };
      return await fetchJson<{ count: number }>(`/barbearias/${barbeariaId}/agendamentos/pendentes-count`);
    },
    enabled: !!barbeariaId,
    refetchInterval: 30000,
  });

  useFocusEffect(useCallback(() => {
    refetch();
    qc.invalidateQueries({ queryKey: ["agendamentos-pendentes-count", barbeariaId] });
  }, [refetch, qc, barbeariaId]));

  const sortedProfs = useMemo(() => {
    return [...profissionais].sort((a, b) => {
      const oa = typeof a.ordem === "number" ? a.ordem : 999;
      const ob = typeof b.ordem === "number" ? b.ordem : 999;
      if (oa !== ob) return oa - ob;
      return a.id - b.id;
    });
  }, [profissionais]);

  const filtered = useMemo(() => {
    let arr = [...agendamentos];
    if (showOnlyPendentes) arr = arr.filter(a => a.status === "pendente_aprovacao");
    if (selectedProfId !== "all") {
      arr = arr.filter(a => String(a.profissionalId) === selectedProfId);
    }
    if (viewMode === "dia") arr = arr.filter(a => a.data === date);
    return arr.sort((a, b) =>
      a.data === b.data ? a.horaInicio.localeCompare(b.horaInicio) : a.data.localeCompare(b.data)
    );
  }, [agendamentos, selectedProfId, showOnlyPendentes, viewMode, date]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        qc.invalidateQueries({ queryKey: ["agendamentos-pendentes-count", barbeariaId] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, qc, barbeariaId]);

  const handleSelectDate = (d: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setDate(d);
  };

  const handleNavToNovo = (encaixe = false) => {
    setFabOpen(false);
    router.push(`/(tabs)/agenda/novo?date=${date}&encaixe=${encaixe ? "1" : "0"}`);
  };

  const dateDisplay = useMemo(() => {
    if (viewMode === "dia") return shortDateLabel(date);
    if (viewMode === "semana") {
      const a = strToDate(weekDates[0]);
      const b = strToDate(weekDates[6]);
      return `${a.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} — ${b.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
    }
    const d = strToDate(date);
    return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
  }, [viewMode, date, weekDates]);

  const webTopPad = Platform.OS === "web" ? 67 : insets.top + 8;

  return (
    <View style={[styles.container, { paddingTop: webTopPad }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Agenda</Text>
          <Text style={styles.subtitle}>{dateDisplay}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/(tabs)/agenda/picos")}
          accessibilityLabel="Horários de pico"
        >
          <Feather name="trending-up" size={20} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/(tabs)/agenda/lista-espera")}
          accessibilityLabel="Lista de espera"
        >
          <Feather name="clipboard" size={20} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/(tabs)/agenda/bloqueios")}
          accessibilityLabel="Bloqueios"
        >
          <Feather name="lock" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.viewToggle}>
        {(["dia", "semana", "mes"] as ViewMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
              {mode === "dia" ? "Dia" : mode === "semana" ? "Semana" : "Mês"}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.toggleBtn, styles.todayBtn]} onPress={() => setDate(todayStr())}>
          <Text style={styles.todayText}>Hoje</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateStrip}
        contentContainerStyle={styles.dateStripContent}
      >
        {horizontalDates.map(d => {
          const dd = strToDate(d);
          const isSel = d === date;
          const isToday = d === todayStr();
          const dayAgends = agendamentos.filter(a => a.data === d);
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dayChip, isSel && styles.dayChipActive, isToday && !isSel && styles.dayChipToday]}
              onPress={() => handleSelectDate(d)}
            >
              <Text style={[styles.dayWeek, isSel && styles.dayChipTextActive]}>
                {dd.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
              </Text>
              <Text style={[styles.dayNum, isSel && styles.dayChipTextActive]}>{dd.getDate()}</Text>
              {dayAgends.length > 0 && (
                <View style={[styles.dayDot, isSel && { backgroundColor: "#000" }]}>
                  <Text style={[styles.dayDotText, isSel && { color: "#000" }]}>{dayAgends.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {sortedProfs.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.profStrip}
          contentContainerStyle={styles.profStripContent}
        >
          <TouchableOpacity
            style={[styles.profChip, selectedProfId === "all" && styles.profChipActive]}
            onPress={() => setSelectedProfId("all")}
          >
            <View style={[styles.profAvatar, selectedProfId === "all" && styles.profAvatarActive]}>
              <Feather name="users" size={14} color={selectedProfId === "all" ? "#000" : Colors.textSecondary} />
            </View>
            <Text style={[styles.profLabel, selectedProfId === "all" && styles.profLabelActive]}>Todos</Text>
          </TouchableOpacity>
          {sortedProfs.map(p => {
            const isSel = String(p.id) === selectedProfId;
            const initial = p.nomeExibicao.charAt(0).toUpperCase();
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.profChip, isSel && styles.profChipActive]}
                onPress={() => setSelectedProfId(isSel ? "all" : String(p.id))}
              >
                <View style={[styles.profAvatar, isSel && styles.profAvatarActive]}>
                  <Text style={[styles.profInitial, isSel && { color: "#000" }]}>{initial}</Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.profLabel, isSel && styles.profLabelActive]}
                >
                  {p.apelido || p.nomeExibicao.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {pendentesCount.count > 0 && (
        <TouchableOpacity
          style={[styles.pendentesBar, showOnlyPendentes && styles.pendentesBarActive]}
          onPress={() => setShowOnlyPendentes(v => !v)}
        >
          <Feather name="clock" size={14} color={Colors.warning} />
          <Text style={styles.pendentesText}>
            {pendentesCount.count} pendente{pendentesCount.count > 1 ? "s" : ""} de aprovação
          </Text>
          <Text style={styles.pendentesAction}>
            {showOnlyPendentes ? "Ver todos" : "Filtrar"}
          </Text>
        </TouchableOpacity>
      )}

      {viewMode === "dia" && (
        <DayTimeline
          agendamentos={filtered}
          isLoading={isLoading}
          isError={isError}
          error={error}
          refetch={refetch}
          refreshing={refreshing}
          onRefresh={onRefresh}
          insets={insets}
          router={router}
          dateLabel={shortDateLabel(date)}
        />
      )}

      {viewMode === "semana" && (
        <WeekGrid
          agendamentos={filtered}
          weekDates={weekDates}
          isLoading={isLoading}
          isError={isError}
          error={error}
          refetch={refetch}
          refreshing={refreshing}
          onRefresh={onRefresh}
          insets={insets}
          router={router}
          onSelectDate={(d) => { setDate(d); setViewMode("dia"); }}
        />
      )}

      {viewMode === "mes" && (
        <MonthCalendar
          agendamentos={filtered}
          dateStr={date}
          isLoading={isLoading}
          isError={isError}
          error={error}
          refetch={refetch}
          refreshing={refreshing}
          onRefresh={onRefresh}
          insets={insets}
          onSelectDate={(d) => { setDate(d); setViewMode("dia"); }}
          onChangeMonth={(delta) => {
            const dd = strToDate(date);
            const nd = new Date(dd.getFullYear(), dd.getMonth() + delta, 1);
            setDate(dateToStr(nd));
          }}
        />
      )}

      <View style={[styles.fabContainer, { bottom: (Platform.OS === "web" ? 84 : 76 + insets.bottom) }]}>
        {fabOpen && (
          <View style={styles.fabMenu}>
            <TouchableOpacity style={styles.fabItem} onPress={() => handleNavToNovo(false)}>
              <View style={[styles.fabItemIcon, { backgroundColor: Colors.accent }]}>
                <Feather name="plus" size={18} color="#000" />
              </View>
              <Text style={styles.fabItemText}>Novo agendamento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabItem} onPress={() => handleNavToNovo(true)}>
              <View style={[styles.fabItemIcon, { backgroundColor: Colors.warning }]}>
                <Feather name="zap" size={18} color="#000" />
              </View>
              <Text style={styles.fabItemText}>Encaixe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabItem}
              onPress={() => {
                setFabOpen(false);
                router.push(`/(tabs)/agenda/bloqueios?date=${date}`);
              }}
            >
              <View style={[styles.fabItemIcon, { backgroundColor: Colors.surfaceLight }]}>
                <Feather name="lock" size={18} color={Colors.text} />
              </View>
              <Text style={styles.fabItemText}>Bloquear horário</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabItem}
              onPress={() => {
                setFabOpen(false);
                router.push("/(tabs)/agenda/lista-espera");
              }}
            >
              <View style={[styles.fabItemIcon, { backgroundColor: Colors.info }]}>
                <Feather name="clipboard" size={18} color="#fff" />
              </View>
              <Text style={styles.fabItemText}>Lista de espera</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={[styles.fab, fabOpen && styles.fabActive]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setFabOpen(v => !v);
          }}
          accessibilityLabel="Ações"
        >
          <Feather name={fabOpen ? "x" : "plus"} size={28} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AgendamentoCard({ a, router, compact }: { a: Agendamento; router: any; compact?: boolean }) {
  const info = statusInfo(a.status, a.encaixe);
  const phoneDigits = (a.clienteTelefone || "").replace(/\D/g, "");
  const hasWa = phoneDigits.length >= 10;
  return (
    <TouchableOpacity
      style={[styles.card, compact && { padding: 10, marginBottom: 6 }]}
      onPress={() => router.push(`/(tabs)/agenda/${a.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={[styles.cardTime, compact && { fontSize: 14 }]}>{a.horaInicio.slice(0, 5)}</Text>
          <Text style={styles.cardTimeUntil}>até {a.horaFim.slice(0, 5)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: info.bg }]}>
          {a.encaixe && <Feather name="zap" size={11} color={info.color} />}
          <Text style={[styles.statusText, { color: info.color }]}>{info.label}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {a.aniversario && <Feather name="gift" size={12} color={Colors.warning} />}
            {a.vip && <Feather name="star" size={12} color={Colors.warning} />}
            <Text style={styles.clientName} numberOfLines={1}>{a.clienteNome}</Text>
          </View>
          <Text style={styles.serviceLine} numberOfLines={1}>
            {a.servicoNome} · {a.profissionalNome}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.valueText}>{formatCurrency(Number(a.valor))}</Text>
          {hasWa && (
            <TouchableOpacity
              style={styles.waBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                Linking.openURL(whatsappLink(a.clienteTelefone || undefined));
              }}
            >
              <Feather name="phone" size={14} color={Colors.success} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {a.atendimentoId && (
        <View style={styles.conjuntoTag}>
          <Feather name="users" size={10} color="#a78bfa" />
          <Text style={styles.conjuntoText}>Atendimento conjunto</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function DayTimeline(props: {
  agendamentos: Agendamento[]; isLoading: boolean; isError: boolean; error: any;
  refetch: () => void; refreshing: boolean; onRefresh: () => void; insets: any; router: any;
  dateLabel: string;
}) {
  const { agendamentos, isLoading, isError, error, refetch, refreshing, onRefresh, insets, router, dateLabel } = props;
  const HORAS = useMemo(() => {
    const arr: number[] = [];
    let minH = 8, maxH = 20;
    for (const a of agendamentos) {
      const h = parseInt(a.horaInicio.slice(0, 2));
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
    for (let h = minH; h <= Math.max(maxH, 20); h++) arr.push(h);
    return arr;
  }, [agendamentos]);

  if (isLoading) {
    return (
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <SkeletonList count={4} variant="card" />
      </ScrollView>
    );
  }
  if (isError) {
    return (
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <ErrorView title="Não foi possível carregar a agenda" error={error} onRetry={() => refetch()} />
      </ScrollView>
    );
  }
  if (agendamentos.length === 0) {
    return (
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <EmptyState
          icon="calendar"
          title="Nenhum agendamento"
          description={`Você não tem atendimentos para ${dateLabel.toLowerCase()}.`}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 140 : 110 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      {HORAS.map(h => {
        const hourLabel = `${String(h).padStart(2, "0")}:00`;
        const items = agendamentos.filter(a => parseInt(a.horaInicio.slice(0, 2)) === h);
        return (
          <View key={h} style={styles.hourRow}>
            <View style={styles.hourCol}>
              <Text style={styles.hourLabel}>{hourLabel}</Text>
              <View style={styles.hourLine} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {items.length === 0 ? (
                <View style={styles.emptyHourSlot} />
              ) : (
                items.map(a => <AgendamentoCard key={a.id} a={a} router={router} />)
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function WeekGrid(props: {
  agendamentos: Agendamento[]; weekDates: string[]; isLoading: boolean; isError: boolean; error: any;
  refetch: () => void; refreshing: boolean; onRefresh: () => void; insets: any; router: any;
  onSelectDate: (d: string) => void;
}) {
  const { agendamentos, weekDates, isLoading, isError, error, refetch, refreshing, onRefresh, insets, router, onSelectDate } = props;
  if (isLoading) return <ScrollView style={styles.list} contentContainerStyle={styles.listContent}><SkeletonList count={4} variant="card" /></ScrollView>;
  if (isError) return <ScrollView style={styles.list} contentContainerStyle={styles.listContent}><ErrorView title="Não foi possível carregar a agenda" error={error} onRetry={() => refetch()} /></ScrollView>;
  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 140 : 110 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      {weekDates.map(d => {
        const day = strToDate(d);
        const items = agendamentos.filter(a => a.data === d).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
        const isToday = d === todayStr();
        return (
          <View key={d} style={styles.weekDayBlock}>
            <TouchableOpacity onPress={() => onSelectDate(d)} style={styles.weekDayHeader}>
              <View style={[styles.weekDayBadge, isToday && { backgroundColor: Colors.accent }]}>
                <Text style={[styles.weekDayWeek, isToday && { color: "#000" }]}>
                  {day.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                </Text>
                <Text style={[styles.weekDayNum, isToday && { color: "#000" }]}>{day.getDate()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekDayTitle}>
                  {day.toLocaleDateString("pt-BR", { weekday: "long" })}
                </Text>
                <Text style={styles.weekDayCount}>
                  {items.length === 0 ? "Sem atendimentos" : `${items.length} atendimento${items.length > 1 ? "s" : ""}`}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            {items.length > 0 && (
              <View style={{ paddingLeft: 12 }}>
                {items.map(a => <AgendamentoCard key={a.id} a={a} router={router} compact />)}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function MonthCalendar(props: {
  agendamentos: Agendamento[]; dateStr: string; isLoading: boolean; isError: boolean; error: any;
  refetch: () => void; refreshing: boolean; onRefresh: () => void; insets: any;
  onSelectDate: (d: string) => void; onChangeMonth: (delta: number) => void;
}) {
  const { agendamentos, dateStr, isLoading, isError, error, refetch, refreshing, onRefresh, insets, onSelectDate, onChangeMonth } = props;
  const d = strToDate(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= lastDay.getDate(); day++) cells.push(dateToStr(new Date(year, month, day)));
  while (cells.length % 7 !== 0) cells.push(null);

  const countsByDate: Record<string, { total: number; pendentes: number; encaixes: number }> = {};
  for (const a of agendamentos) {
    if (!countsByDate[a.data]) countsByDate[a.data] = { total: 0, pendentes: 0, encaixes: 0 };
    countsByDate[a.data].total++;
    if (a.status === "pendente_aprovacao") countsByDate[a.data].pendentes++;
    if (a.encaixe) countsByDate[a.data].encaixes++;
  }

  const today = todayStr();

  if (isLoading) return <ScrollView style={styles.list} contentContainerStyle={styles.listContent}><SkeletonList count={4} variant="card" /></ScrollView>;
  if (isError) return <ScrollView style={styles.list} contentContainerStyle={styles.listContent}><ErrorView title="Não foi possível carregar a agenda" error={error} onRetry={() => refetch()} /></ScrollView>;

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 140 : 110 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => onChangeMonth(-1)} style={styles.monthNavBtn}>
          <Feather name="chevron-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTHS_PT[month]} {year}
        </Text>
        <TouchableOpacity onPress={() => onChangeMonth(1)} style={styles.monthNavBtn}>
          <Feather name="chevron-right" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarGrid}>
        {WEEKDAYS_PT.map(w => (
          <Text key={w} style={styles.calWeekHeader}>{w}</Text>
        ))}
        {cells.map((cd, idx) => {
          if (!cd) return <View key={`empty-${idx}`} style={[styles.calCell, { backgroundColor: "transparent" }]} />;
          const info = countsByDate[cd];
          const dayN = parseInt(cd.slice(8, 10));
          const isToday = cd === today;
          return (
            <TouchableOpacity
              key={cd}
              style={[styles.calCell, isToday && styles.calCellToday]}
              onPress={() => onSelectDate(cd)}
            >
              <Text style={[styles.calDayNum, isToday && { color: Colors.accent }]}>{dayN}</Text>
              {info && info.total > 0 && (
                <View style={styles.calBadgeRow}>
                  <View style={styles.calBadge}>
                    <Text style={styles.calBadgeText}>{info.total}</Text>
                  </View>
                  {info.pendentes > 0 && <View style={[styles.calDotMini, { backgroundColor: Colors.warning }]} />}
                  {info.encaixes > 0 && <View style={[styles.calDotMini, { backgroundColor: "#fb923c" }]} />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.calLegend}>
        <View style={styles.calLegendItem}>
          <View style={[styles.calDotMini, { backgroundColor: Colors.warning }]} />
          <Text style={styles.calLegendText}>Pendentes</Text>
        </View>
        <View style={styles.calLegendItem}>
          <View style={[styles.calDotMini, { backgroundColor: "#fb923c" }]} />
          <Text style={styles.calLegendText}>Encaixes</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hourRow: { flexDirection: "row", marginBottom: 4, alignItems: "stretch" },
  hourCol: { width: 56, alignItems: "center" },
  hourLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, marginTop: 2 },
  hourLine: { flex: 1, width: 1, backgroundColor: Colors.surfaceBorder, marginTop: 4 },
  emptyHourSlot: { height: 28, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, opacity: 0.4 },
  weekDayBlock: { marginBottom: 14 },
  weekDayHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: 6 },
  weekDayBadge: { width: 48, height: 56, borderRadius: 10, backgroundColor: Colors.surfaceLight, alignItems: "center", justifyContent: "center" },
  weekDayWeek: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "uppercase" },
  weekDayNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 1 },
  weekDayTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text, textTransform: "capitalize" },
  weekDayCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingHorizontal: 4 },
  monthNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  monthTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, textTransform: "capitalize" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calWeekHeader: { width: `${100 / 7}%`, textAlign: "center", paddingVertical: 6, fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textTransform: "uppercase" },
  calCell: { width: `${100 / 7}%`, aspectRatio: 0.85, padding: 4, borderWidth: 0.5, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "flex-start" },
  calCellToday: { backgroundColor: Colors.accent + "15", borderColor: Colors.accent + "60" },
  calDayNum: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  calBadgeRow: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 3, flexWrap: "wrap", justifyContent: "center" },
  calBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, backgroundColor: Colors.accent + "33" },
  calBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.accent },
  calDotMini: { width: 5, height: 5, borderRadius: 3 },
  calLegend: { flexDirection: "row", gap: 14, marginTop: 12, justifyContent: "center" },
  calLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  calLegendText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  headerRow: {
    flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2, textTransform: "capitalize" },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center",
  },
  viewToggle: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  toggleBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  toggleBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  toggleText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  toggleTextActive: { color: "#000", fontFamily: "Inter_600SemiBold" },
  todayBtn: { marginLeft: "auto", borderColor: Colors.accent + "60" },
  todayText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  dateStrip: { maxHeight: 80, marginTop: 12 },
  dateStripContent: { paddingHorizontal: 12, gap: 6 },
  dayChip: {
    minWidth: 52, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  dayChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dayChipToday: { borderColor: Colors.accent + "60" },
  dayWeek: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "capitalize" },
  dayNum: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 2 },
  dayChipTextActive: { color: "#000" },
  dayDot: {
    marginTop: 3, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8,
    backgroundColor: Colors.accent + "33", minWidth: 16, alignItems: "center",
  },
  dayDotText: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.accent },
  profStrip: { maxHeight: 78, marginTop: 8 },
  profStripContent: { paddingHorizontal: 12, gap: 8 },
  profChip: { alignItems: "center", minWidth: 60 },
  profChipActive: {},
  profAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface,
    borderWidth: 2, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center",
  },
  profAvatarActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  profInitial: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textSecondary },
  profLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginTop: 4, maxWidth: 60 },
  profLabelActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  pendentesBar: {
    flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    backgroundColor: Colors.warning + "12", borderWidth: 1, borderColor: Colors.warning + "40",
  },
  pendentesBarActive: { backgroundColor: Colors.warning + "22" },
  pendentesText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.warning },
  pendentesAction: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.warning, textDecorationLine: "underline" },
  list: { flex: 1, marginTop: 10 },
  listContent: { paddingHorizontal: 16 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardLeft: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  cardTime: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  cardTimeUntil: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBody: { flexDirection: "row", alignItems: "center", gap: 10 },
  clientName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  serviceLine: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  dateLine: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.accent, marginTop: 2, textTransform: "capitalize" },
  cardRight: { alignItems: "flex-end", gap: 6 },
  valueText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.accent },
  waBtn: {
    width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.success + "15", borderWidth: 1, borderColor: Colors.success + "40",
  },
  conjuntoTag: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8,
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: "#7c3aed22", borderWidth: 1, borderColor: "#a78bfa55",
  },
  conjuntoText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#a78bfa" },
  fabContainer: { position: "absolute", right: 18, alignItems: "flex-end" },
  fabMenu: { gap: 10, marginBottom: 12, alignItems: "flex-end" },
  fabItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  fabItemIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  fabItemText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, paddingRight: 6 },
  fab: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabActive: { backgroundColor: Colors.error },
});
