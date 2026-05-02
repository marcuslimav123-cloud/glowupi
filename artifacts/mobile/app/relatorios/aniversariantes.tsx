import React, { useMemo } from "react";
import { ReportListScreen } from "@/components/ReportListScreen";
import { dateToStr } from "@/lib/api";

type Row = {
  id: number;
  nome: string;
  aniversario: string;
  diasAte: number;
  telefone: string | null;
  celular: string | null;
};

export default function AniversariantesScreen() {
  const initialRange = useMemo(() => {
    const today = new Date();
    const ahead = new Date();
    ahead.setDate(today.getDate() + 30);
    return { di: dateToStr(today), df: dateToStr(ahead) };
  }, []);

  return (
    <ReportListScreen<Row>
      title="Aniversariantes"
      subtitle="Clientes com aniversário no período"
      endpoint={(id, di, df) => `/barbearias/${id}/relatorios/aniversariantes?dataInicio=${di}&dataFim=${df}`}
      queryKey="rel-aniversariantes"
      csvFilename="aniversariantes"
      itemKey={(r) => r.id}
      emptyIcon="gift"
      emptyMessage="Nenhum aniversariante no período."
      initialRange={initialRange}
      fields={[
        { label: "Cliente", value: (r) => r.nome, prominent: true },
        { label: "Aniversário", value: (r) => r.aniversario || "—" },
        {
          label: "Status",
          value: (r) =>
            r.diasAte === 0
              ? "Hoje!"
              : r.diasAte > 0
                ? `em ${r.diasAte} ${r.diasAte === 1 ? "dia" : "dias"}`
                : `há ${Math.abs(r.diasAte)} ${Math.abs(r.diasAte) === 1 ? "dia" : "dias"}`,
        },
        { label: "Telefone", value: (r) => r.telefone || r.celular || "—" },
      ]}
    />
  );
}
