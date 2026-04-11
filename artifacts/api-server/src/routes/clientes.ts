import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clientesTable, barbeariasTable, agendamentosTable, comandasTable, resgatesTable } from "@workspace/db/schema";
import { eq, and, ilike, or, desc, sql, inArray, gte } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";
import multer from "multer";
import * as XLSX from "xlsx";

const router: IRouter = Router({ mergeParams: true });

function formatCliente(c: any) {
  return { ...c, totalGasto: parseFloat(c.totalGasto), createdAt: c.createdAt?.toISOString?.() ?? c.createdAt, updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt };
}

async function calcPontosValidos(barbeariaId: number, clienteId: number, diasExpiracao: number): Promise<number> {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasExpiracao);
  const comandasValidas = await db.select({
    pontosGanhos: comandasTable.pontosGanhos,
  }).from(comandasTable).where(
    and(
      eq(comandasTable.barbeariaId, barbeariaId),
      eq(comandasTable.clienteId, clienteId),
      gte(comandasTable.createdAt, dataLimite)
    )
  );
  const totalPontosGanhos = comandasValidas.reduce((sum, c) => sum + (c.pontosGanhos || 0), 0);
  const resgatesNoWindow = await db.select({
    pontosUsados: resgatesTable.pontosUsados,
  }).from(resgatesTable).where(
    and(
      eq(resgatesTable.barbeariaId, barbeariaId),
      eq(resgatesTable.clienteId, clienteId),
      gte(resgatesTable.createdAt, dataLimite),
    )
  );
  const totalResgatado = resgatesNoWindow.reduce((sum, r) => sum + r.pontosUsados, 0);
  return Math.max(0, totalPontosGanhos - totalResgatado);
}

async function ajustarPontosExpiracao(clientes: any[], barbeariaId: number, params: Record<string, string>): Promise<any[]> {
  const fidelidadeDesativada = params["fidelidade_desativar"] === "Sim";
  const diasExpiracao = parseInt(params["fidelidade_expiracao_pontos"] || "365");
  if (fidelidadeDesativada) {
    return clientes.map(c => ({ ...c, pontosFidelidade: 0 }));
  }
  if (diasExpiracao <= 0) return clientes;
  const result: any[] = [];
  for (const c of clientes) {
    if (c.pontosFidelidade > 0) {
      const validos = await calcPontosValidos(barbeariaId, c.id, diasExpiracao);
      result.push({ ...c, pontosFidelidade: validos });
    } else {
      result.push(c);
    }
  }
  return result;
}

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador" && (params["cliente_mostrar_lista_app"] || "Sim") !== "Sim") {
    return res.status(403).json({ error: "Listagem de clientes não permitida para seu perfil" });
  }

  const search = req.query.search as string;
  let clientes;
  if (search) {
    clientes = await db.select().from(clientesTable).where(and(eq(clientesTable.barbeariaId, barbeariaId), or(ilike(clientesTable.nome, `%${search}%`), ilike(clientesTable.telefone, `%${search}%`))));
  } else {
    clientes = await db.select().from(clientesTable).where(eq(clientesTable.barbeariaId, barbeariaId));
  }

  clientes = await ajustarPontosExpiracao(clientes, barbeariaId, params);

  const hidePhone = user.role === "colaborador" && params["cliente_nao_mostrar_telefone"] === "Sim";
  return res.json(clientes.map(c => {
    const formatted = formatCliente(c);
    if (hidePhone) {
      delete formatted.telefone;
    }
    return formatted;
  }));
});

router.post("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador" && params["cliente_cadastro_nao_gestor"] !== "Sim") {
    return res.status(403).json({ error: "Cadastro de cliente não permitido para seu perfil" });
  }

  const { nome, telefone, email, aniversario, observacoes, vip } = req.body;
  if (!nome || !telefone) return res.status(400).json({ error: "Nome e telefone são obrigatórios" });

  if (params["cliente_controle_celular"] === "Sim") {
    const existente = await db.select().from(clientesTable).where(
      and(eq(clientesTable.barbeariaId, barbeariaId), eq(clientesTable.telefone, telefone))
    );
    if (existente.length > 0) {
      return res.status(409).json({ error: "Já existe um cliente cadastrado com este número de celular" });
    }
  }

  const autoAprovar = params["cliente_aprovar_cadastro_auto"] !== "Não";
  const statusInicial = autoAprovar ? "aprovado" : "pendente";

  const [cliente] = await db.insert(clientesTable).values({
    barbeariaId,
    nome,
    telefone,
    email: email || null,
    aniversario: aniversario || null,
    observacoes: observacoes || null,
    vip: vip ?? false,
    status: statusInicial,
  }).returning();
  return res.status(201).json(formatCliente(cliente));
});

router.get("/:clienteId/dashboard", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const params = await getParametros(barbeariaId);

  const [clienteRaw] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, clienteId), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!clienteRaw) return res.status(404).json({ error: "Cliente não encontrado" });
  const [cliente] = await ajustarPontosExpiracao([clienteRaw], barbeariaId, params);

  const agendamentos = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.barbeariaId, barbeariaId), eq(agendamentosTable.clienteId, clienteId))).orderBy(desc(agendamentosTable.data));

  const agendamentoIds = agendamentos.map(a => a.id);
  const comandas = agendamentoIds.length > 0
    ? await db.select().from(comandasTable).where(and(eq(comandasTable.barbeariaId, barbeariaId), inArray(comandasTable.agendamentoId, agendamentoIds))).orderBy(desc(comandasTable.dataFechamento))
    : [];

  const servicoCount: Record<string, number> = {};
  const produtoCount: Record<string, number> = {};

  agendamentos.forEach(a => {
    servicoCount[a.servicoNome] = (servicoCount[a.servicoNome] || 0) + 1;
  });

  comandas.forEach(c => {
    const prods = Array.isArray(c.produtos) ? c.produtos : [];
    (prods as Array<{ nome: string; quantidade?: number }>).forEach(p => {
      if (p.nome) produtoCount[p.nome] = (produtoCount[p.nome] || 0) + (p.quantidade ?? 1);
    });
  });

  const servicoMaisRealizado = Object.entries(servicoCount).sort((a, b) => b[1] - a[1])[0] ?? null;
  const produtoMaisComprado = Object.entries(produtoCount).sort((a, b) => b[1] - a[1])[0] ?? null;

  const ultimoAgendamento = agendamentos[0] ?? null;
  let diasSemAgendar: number | null = null;
  if (ultimoAgendamento) {
    const diff = Date.now() - new Date(ultimoAgendamento.data).getTime();
    diasSemAgendar = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  return res.json({
    cliente: formatCliente(cliente),
    servicoMaisRealizado: servicoMaisRealizado ? { nome: servicoMaisRealizado[0], vezes: servicoMaisRealizado[1] } : null,
    produtoMaisComprado: produtoMaisComprado ? { nome: produtoMaisComprado[0], vezes: produtoMaisComprado[1] } : null,
    diasSemAgendar,
    totalGasto: parseFloat(cliente.totalGasto as string),
    pontosFidelidade: cliente.pontosFidelidade,
    totalAgendamentos: agendamentos.length,
    totalComandas: comandas.length,
  });
});

router.get("/:clienteId/agendamentos", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const status = req.query.status as string | undefined;
  const dataInicio = req.query.dataInicio as string | undefined;
  const dataFim = req.query.dataFim as string | undefined;

  const conditions = [eq(agendamentosTable.barbeariaId, barbeariaId), eq(agendamentosTable.clienteId, clienteId)];
  if (status) conditions.push(eq(agendamentosTable.status, status));
  if (dataInicio) conditions.push(sql`${agendamentosTable.data} >= ${dataInicio}`);
  if (dataFim) conditions.push(sql`${agendamentosTable.data} <= ${dataFim}`);

  const allRows = await db.select().from(agendamentosTable).where(and(...conditions)).orderBy(desc(agendamentosTable.data));
  const total = allRows.length;
  const offset = (page - 1) * limit;
  const items = allRows.slice(offset, offset + limit);

  return res.json({
    items: items.map(a => ({
      id: a.id, data: a.data, horaInicio: a.horaInicio, horaFim: a.horaFim,
      servicoNome: a.servicoNome, profissionalNome: a.profissionalNome,
      status: a.status, valor: parseFloat(a.valor as string),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/:clienteId/comandas", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const dataInicio = req.query.dataInicio as string | undefined;
  const dataFim = req.query.dataFim as string | undefined;

  const agendamentoIds = (await db.select({ id: agendamentosTable.id }).from(agendamentosTable)
    .where(and(eq(agendamentosTable.barbeariaId, barbeariaId), eq(agendamentosTable.clienteId, clienteId)))).map(a => a.id);

  if (agendamentoIds.length === 0) {
    return res.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }

  const conditions = [eq(comandasTable.barbeariaId, barbeariaId), inArray(comandasTable.agendamentoId, agendamentoIds)];
  if (dataInicio) conditions.push(sql`DATE(${comandasTable.dataFechamento}) >= ${dataInicio}`);
  if (dataFim) conditions.push(sql`DATE(${comandasTable.dataFechamento}) <= ${dataFim}`);

  const allRows = await db.select().from(comandasTable).where(and(...conditions)).orderBy(desc(comandasTable.dataFechamento));
  const total = allRows.length;
  const offset = (page - 1) * limit;
  const items = allRows.slice(offset, offset + limit);

  return res.json({
    items: items.map(c => ({
      id: c.id, dataFechamento: c.dataFechamento?.toISOString(),
      profissionalNome: c.profissionalNome,
      valorTotal: parseFloat(c.valorTotal as string),
      pagamentos: c.pagamentos,
      servicos: c.servicos,
      produtos: c.produtos,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/:clienteId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador" && (params["cliente_mostrar_lista_app"] || "Sim") !== "Sim") {
    return res.status(403).json({ error: "Acesso a clientes não permitido para seu perfil" });
  }

  const id = parseInt(req.params.clienteId);
  const [clienteRaw] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, id), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!clienteRaw) return res.status(404).json({ error: "Cliente não encontrado" });
  const [cliente] = await ajustarPontosExpiracao([clienteRaw], barbeariaId, params);
  const formatted = formatCliente(cliente);
  if (user.role === "colaborador" && params["cliente_nao_mostrar_telefone"] === "Sim") {
    delete formatted.telefone;
  }
  return res.json(formatted);
});

router.put("/:clienteId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.clienteId);
  const { nome, telefone, email, aniversario, observacoes, vip } = req.body;
  const [existing] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, id), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Cliente não encontrado" });
  const [updated] = await db.update(clientesTable).set({
    nome: nome ?? existing.nome,
    telefone: telefone ?? existing.telefone,
    email: email ?? existing.email,
    aniversario: aniversario ?? existing.aniversario,
    observacoes: observacoes ?? existing.observacoes,
    vip: vip !== undefined ? vip : existing.vip,
    updatedAt: new Date(),
  }).where(eq(clientesTable.id, id)).returning();
  return res.json(formatCliente(updated));
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const FIELD_SYNONYMS: Record<string, string[]> = {
  nome: ["nome", "name", "cliente", "client", "nome completo", "full name", "nome do cliente", "customer name", "customer"],
  telefone: ["telefone", "phone", "celular", "cel", "mobile", "whatsapp", "tel", "numero", "phone number", "contato", "contact"],
  email: ["email", "e-mail", "e mail", "correio", "mail"],
  aniversario: ["aniversario", "aniversário", "nascimento", "data de nascimento", "birthday", "birth date", "data nasc", "dt nascimento", "dt nasc"],
  observacoes: ["observacoes", "observações", "observacao", "observação", "obs", "notas", "notes", "comentarios", "comentários"],
};

function detectColumnMapping(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i];
    for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      const normalizedSynonyms = synonyms.map(s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      if (normalizedSynonyms.includes(header)) {
        if (!Object.values(mapping).includes(field)) {
          mapping[i] = field;
        }
        break;
      }
    }
  }
  return mapping;
}

router.post("/import/preview", requireAuth, requireRole("dono", "gerente"), upload.single("file"), async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: "Planilha vazia" });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rawData.length < 2) {
      return res.status(400).json({ error: "A planilha precisa ter pelo menos um cabeçalho e uma linha de dados" });
    }

    const headers = rawData[0].map((h: any) => String(h || "").trim());
    const autoMapping = detectColumnMapping(headers);

    const previewRows = rawData.slice(1, 6).map(row =>
      headers.map((_: any, i: number) => String(row[i] ?? "").trim())
    );

    res.json({
      headers,
      autoMapping,
      totalRows: rawData.length - 1,
      previewRows,
      sheetName,
    });
  } catch (error: any) {
    console.error("Import preview error:", error);
    res.status(500).json({ error: "Erro ao processar arquivo. Verifique o formato." });
  }
});

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

router.post("/import/execute", requireAuth, requireRole("dono", "gerente"), upload.single("file"), async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    let columnMapping: Record<string, number>;
    try {
      columnMapping = JSON.parse(req.body.columnMapping || "{}");
    } catch {
      return res.status(400).json({ error: "Mapeamento de colunas inválido" });
    }

    if (!columnMapping.nome && columnMapping.nome !== 0) {
      return res.status(400).json({ error: "A coluna 'Nome' é obrigatória no mapeamento" });
    }

    const params = await getParametros(barbeariaId);
    const autoAprovar = params["cliente_aprovar_cadastro_auto"] !== "Não";
    const controleCelular = params["cliente_controle_celular"] === "Sim";

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rawData.length < 2) {
      return res.status(400).json({ error: "Planilha vazia" });
    }

    const MAX_ROWS = 5000;
    if (rawData.length - 1 > MAX_ROWS) {
      return res.status(400).json({ error: `Limite de ${MAX_ROWS} clientes por importação. Sua planilha tem ${rawData.length - 1} linhas.` });
    }

    let existingPhones = new Set<string>();
    if (controleCelular) {
      const existing = await db.select({ telefone: clientesTable.telefone }).from(clientesTable)
        .where(eq(clientesTable.barbeariaId, barbeariaId));
      existingPhones = new Set(existing.map(e => normalizePhone(e.telefone)).filter(p => p.length > 0));
    }

    const rows = rawData.slice(1);
    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];
    const BATCH_SIZE = 100;

    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);
      const valuesToInsert: any[] = [];

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowNum = batchStart + i + 2;

        const nome = String(row[columnMapping.nome] ?? "").trim();
        if (!nome) {
          skipped++;
          continue;
        }

        const rawTelefone = columnMapping.telefone !== undefined ? String(row[columnMapping.telefone] ?? "").trim() : "";
        const telefone = normalizePhone(rawTelefone);
        const email = columnMapping.email !== undefined ? String(row[columnMapping.email] ?? "").trim().toLowerCase() : "";
        const aniversario = columnMapping.aniversario !== undefined ? String(row[columnMapping.aniversario] ?? "").trim() : "";
        const observacoes = columnMapping.observacoes !== undefined ? String(row[columnMapping.observacoes] ?? "").trim() : "";

        if (!telefone) {
          skipped++;
          errors.push(`Linha ${rowNum}: "${nome}" sem telefone`);
          continue;
        }

        if (controleCelular && existingPhones.has(telefone)) {
          skipped++;
          errors.push(`Linha ${rowNum}: "${nome}" telefone duplicado (${rawTelefone})`);
          continue;
        }

        if (controleCelular) existingPhones.add(telefone);

        let parsedAniversario = "";
        if (aniversario) {
          const num = Number(aniversario);
          if (!isNaN(num) && num > 30000) {
            const d = XLSX.SSF.parse_date_code(num);
            if (d) parsedAniversario = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
          } else if (/\d{2}\/\d{2}\/\d{4}/.test(aniversario)) {
            const [dd, mm, yyyy] = aniversario.split("/");
            parsedAniversario = `${yyyy}-${mm}-${dd}`;
          } else if (/\d{4}-\d{2}-\d{2}/.test(aniversario)) {
            parsedAniversario = aniversario;
          }
        }

        valuesToInsert.push({
          barbeariaId,
          nome,
          telefone,
          email: email || null,
          aniversario: parsedAniversario || null,
          observacoes: observacoes || null,
          vip: false,
          status: autoAprovar ? "aprovado" : "pendente",
        });
      }

      if (valuesToInsert.length > 0) {
        await db.insert(clientesTable).values(valuesToInsert);
        imported += valuesToInsert.length;
      }
    }

    res.json({
      imported,
      skipped,
      total: rows.length,
      errors: errors.slice(0, 50),
    });
  } catch (error: any) {
    console.error("Import execute error:", error);
    res.status(500).json({ error: "Erro ao importar clientes. Tente novamente." });
  }
});

export default router;
