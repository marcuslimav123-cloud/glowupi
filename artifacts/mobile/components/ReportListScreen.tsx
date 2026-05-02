import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { DateRangeBar } from "@/components/DateRangeBar";
import { fetchJson, getErrorMessage, dateToStr } from "@/lib/api";
import { buildCsv, shareCsv } from "@/lib/csvExport";
import { useAuth } from "@/contexts/AuthContext";

export type ReportField<T> = {
  label: string;
  value: (item: T, idx: number) => string;
  prominent?: boolean;
  csv?: (item: T, idx: number) => string | number;
};

type Props<T> = {
  title: string;
  subtitle?: string;
  endpoint: (barbeariaId: number, di: string, df: string) => string;
  queryKey: string;
  initialDays?: number;
  fields: ReportField<T>[];
  csvFilename: string;
  emptyIcon?: keyof typeof Feather.glyphMap;
  emptyMessage?: string;
  itemKey: (item: T, idx: number) => string | number;
  rightTopExtra?: React.ReactNode;
  selectData?: (raw: unknown) => T[];
  initialRange?: { di: string; df: string };
};

function defaultDates(days: number): { di: string; df: string } {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - days);
  return { di: dateToStr(start), df: dateToStr(today) };
}

export function ReportListScreen<T>({
  title,
  subtitle,
  endpoint,
  queryKey,
  initialDays = 30,
  fields,
  csvFilename,
  emptyIcon = "inbox",
  emptyMessage = "Sem dados no período.",
  itemKey,
  rightTopExtra,
  selectData,
  initialRange,
}: Props<T>) {
  const { barbeariaId } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const initial = useMemo(() => initialRange ?? defaultDates(initialDays), [initialDays, initialRange?.di, initialRange?.df]);
  const [di, setDi] = useState(initial.di);
  const [df, setDf] = useState(initial.df);
  const [searchDi, setSearchDi] = useState(initial.di);
  const [searchDf, setSearchDf] = useState(initial.df);

  const enabled = !!barbeariaId;

  const query = useQuery<T[]>({
    queryKey: [queryKey, barbeariaId, searchDi, searchDf],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(endpoint(barbeariaId, searchDi, searchDf));
      if (selectData) return selectData(raw);
      return Array.isArray(raw) ? (raw as T[]) : [];
    },
    enabled,
  });

  const handleApply = useCallback(() => {
    setSearchDi(di);
    setSearchDf(df);
  }, [di, df]);

  const handleExport = useCallback(async () => {
    const data = query.data ?? [];
    if (!data.length) return;
    try {
      const headers = fields.map((f) => f.label);
      const rows = data.map((it, idx) => fields.map((f) => (f.csv ? f.csv(it, idx) : f.value(it, idx))));
      const csv = buildCsv(headers, rows);
      await shareCsv(`${csvFilename}_${searchDi}_${searchDf}`, csv);
    } catch (e) {
      Alert.alert("Erro ao exportar", getErrorMessage(e));
    }
  }, [query.data, fields, csvFilename, searchDi, searchDf]);

  const data = query.data ?? [];
  const isLoading = query.isLoading;
  const isError = query.isError;

  return (
    <ScreenContainer title={title} subtitle={subtitle} scroll={false} contentPadding={false}>
      <FlatList
        data={data}
        keyExtractor={(item, idx) => String(itemKey(item, idx))}
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isLoading}
            onRefresh={() => query.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          <View>
            <DateRangeBar
              inicio={di}
              fim={df}
              onInicioChange={setDi}
              onFimChange={setDf}
              onApply={handleApply}
              onExport={handleExport}
              exportDisabled={!data.length}
              loading={isLoading || query.isRefetching}
            />
            {rightTopExtra}
            <View style={styles.countRow}>
              <Text style={styles.count}>
                {isLoading ? "Carregando…" : `${data.length} ${data.length === 1 ? "registro" : "registros"}`}
              </Text>
              {!isLoading && data.length > 0 ? (
                <Text style={styles.range}>{searchDi} → {searchDf}</Text>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList count={4} variant="card" />
          ) : isError ? (
            <EmptyState icon="alert-triangle" title="Erro ao carregar" description={getErrorMessage(query.error)} />
          ) : (
            <EmptyState icon={emptyIcon} title="Sem registros" description={emptyMessage} />
          )
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            {fields.map((f, i) => {
              const v = f.value(item, index);
              return (
                <View key={i} style={styles.line}>
                  <Text style={styles.lineLabel}>{f.label}</Text>
                  <Text
                    style={[styles.lineValue, f.prominent ? styles.lineValueProminent : null]}
                    numberOfLines={3}
                  >
                    {v || "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 16 },
    countRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    count: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: c.textSecondary,
    },
    range: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: c.textMuted,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      gap: 4,
    },
    line: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 2,
    },
    lineLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: c.textMuted,
      flexShrink: 0,
      maxWidth: "45%",
    },
    lineValue: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: c.text,
      flex: 1,
      textAlign: "right",
    },
    lineValueProminent: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: c.accent,
    },
  });

export default ReportListScreen;
