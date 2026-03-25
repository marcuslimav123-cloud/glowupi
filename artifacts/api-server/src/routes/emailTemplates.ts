import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { emailTemplatesTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { sendEmail, renderTemplate } from "../lib/brevo.js";

const router: IRouter = Router();

const TEMPLATE_TYPES = [
  {
    tipo: "convite",
    label: "Convite de Equipe",
    variaveis: ["nomeConvidado", "nomeEstabelecimento", "cargo", "link"],
    exemplos: {
      nomeConvidado: "Maria Silva",
      nomeEstabelecimento: "Studio Glow",
      cargo: "Colaborador(a)",
      link: "https://app.glowup.com.br/convite/abc123",
    },
  },
  {
    tipo: "lembrete_agendamento",
    label: "Lembrete de Agendamento",
    variaveis: ["nomeCliente", "dataHora", "servico", "nomeEstabelecimento", "profissional"],
    exemplos: {
      nomeCliente: "Ana Costa",
      dataHora: "15/04/2026 às 14:00",
      servico: "Manicure + Pedicure",
      nomeEstabelecimento: "Studio Glow",
      profissional: "Maria Silva",
    },
  },
  {
    tipo: "boas_vindas",
    label: "Boas-vindas ao Cliente",
    variaveis: ["nomeCliente", "nomeEstabelecimento"],
    exemplos: {
      nomeCliente: "Ana Costa",
      nomeEstabelecimento: "Studio Glow",
    },
  },
];

const DEFAULT_TEMPLATES: Record<string, { assunto: string; corpo: string }> = {
  convite: {
    assunto: "Convite para {{nomeEstabelecimento}} — Glow Up",
    corpo: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;background:#f8f7f4;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
    <div style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,rgba(196,164,106,0.12),rgba(196,164,106,0.03));">
      <div style="display:inline-block;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,rgba(196,164,106,0.2),rgba(196,164,106,0.08));line-height:48px;font-size:24px;margin-bottom:12px;">✨</div>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">Glow Up</h1>
      <p style="margin:0;font-size:13px;color:rgba(0,0,0,0.4);">Convite para equipe</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px;font-weight:600;">Olá, {{nomeConvidado}}!</p>
      <p style="font-size:14px;color:rgba(0,0,0,0.6);line-height:1.7;margin:0 0 24px;">
        Você foi convidado(a) para fazer parte da equipe de <strong style="color:#1a1a1a;">{{nomeEstabelecimento}}</strong> como <strong style="color:#1a1a1a;">{{cargo}}</strong>.
      </p>
      <p style="font-size:14px;color:rgba(0,0,0,0.6);line-height:1.7;margin:0 0 28px;">
        Para aceitar o convite, clique no botão abaixo e entre com sua conta Google:
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="{{link}}" style="display:inline-block;padding:14px 40px;background:#c4a46a;color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
          Aceitar Convite
        </a>
      </div>
      <div style="background:#f8f7f4;border-radius:10px;padding:16px;margin:0 0 8px;">
        <p style="font-size:12px;color:rgba(0,0,0,0.4);margin:0 0 8px;font-weight:500;">Não conseguiu clicar no botão?</p>
        <p style="font-size:12px;color:rgba(0,0,0,0.35);margin:0;word-break:break-all;line-height:1.5;">
          Copie e cole este link no seu navegador:<br>
          <span style="color:#c4a46a;">{{link}}</span>
        </p>
      </div>
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(0,0,0,0.04);text-align:center;background:rgba(0,0,0,0.01);">
      <p style="margin:0 0 4px;font-size:11px;color:rgba(0,0,0,0.25);">Este convite expira em 7 dias.</p>
      <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.2);">Glow Up — Organize sua agenda e fidelize suas clientes</p>
    </div>
  </div>
</body>
</html>`,
  },
  lembrete_agendamento: {
    assunto: "Lembrete: seu agendamento em {{nomeEstabelecimento}}",
    corpo: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;background:#f8f7f4;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
    <div style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,rgba(196,164,106,0.12),rgba(196,164,106,0.03));">
      <div style="display:inline-block;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,rgba(196,164,106,0.2),rgba(196,164,106,0.08));line-height:48px;font-size:24px;margin-bottom:12px;">📅</div>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">Glow Up</h1>
      <p style="margin:0;font-size:13px;color:rgba(0,0,0,0.4);">Lembrete de agendamento</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px;font-weight:600;">Olá, {{nomeCliente}}!</p>
      <p style="font-size:14px;color:rgba(0,0,0,0.6);line-height:1.7;margin:0 0 24px;">
        Este é um lembrete do seu agendamento:
      </p>
      <div style="background:#f8f7f4;border-radius:12px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:rgba(0,0,0,0.4);width:100px;">Serviço</td>
            <td style="padding:6px 0;font-size:14px;color:#1a1a1a;font-weight:500;">{{servico}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:rgba(0,0,0,0.4);">Data/Hora</td>
            <td style="padding:6px 0;font-size:14px;color:#1a1a1a;font-weight:500;">{{dataHora}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:rgba(0,0,0,0.4);">Profissional</td>
            <td style="padding:6px 0;font-size:14px;color:#1a1a1a;font-weight:500;">{{profissional}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:rgba(0,0,0,0.4);">Local</td>
            <td style="padding:6px 0;font-size:14px;color:#1a1a1a;font-weight:500;">{{nomeEstabelecimento}}</td>
          </tr>
        </table>
      </div>
      <p style="font-size:13px;color:rgba(0,0,0,0.45);line-height:1.6;margin:0;">
        Se precisar reagendar ou cancelar, entre em contato diretamente com <strong>{{nomeEstabelecimento}}</strong>.
      </p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(0,0,0,0.04);text-align:center;background:rgba(0,0,0,0.01);">
      <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.2);">Glow Up — Organize sua agenda e fidelize suas clientes</p>
    </div>
  </div>
</body>
</html>`,
  },
  boas_vindas: {
    assunto: "Bem-vinda ao {{nomeEstabelecimento}}! 💛",
    corpo: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;background:#f8f7f4;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
    <div style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,rgba(196,164,106,0.12),rgba(196,164,106,0.03));">
      <div style="display:inline-block;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,rgba(196,164,106,0.2),rgba(196,164,106,0.08));line-height:48px;font-size:24px;margin-bottom:12px;">💛</div>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">Glow Up</h1>
      <p style="margin:0;font-size:13px;color:rgba(0,0,0,0.4);">Boas-vindas</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px;font-weight:600;">Olá, {{nomeCliente}}!</p>
      <p style="font-size:14px;color:rgba(0,0,0,0.6);line-height:1.7;margin:0 0 24px;">
        Seja muito bem-vinda ao <strong style="color:#1a1a1a;">{{nomeEstabelecimento}}</strong>! Estamos felizes em ter você como cliente.
      </p>
      <p style="font-size:14px;color:rgba(0,0,0,0.6);line-height:1.7;margin:0 0 24px;">
        A partir de agora você pode agendar seus horários de forma prática e rápida. Aguardamos sua visita!
      </p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(0,0,0,0.04);text-align:center;background:rgba(0,0,0,0.01);">
      <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.2);">Glow Up — Organize sua agenda e fidelize suas clientes</p>
    </div>
  </div>
</body>
</html>`,
  },
};

async function ensureDefaultTemplates() {
  const existing = await db.select().from(emailTemplatesTable).where(isNull(emailTemplatesTable.barbeariaId));
  if (existing.length > 0) return;

  for (const [tipo, template] of Object.entries(DEFAULT_TEMPLATES)) {
    await db.insert(emailTemplatesTable).values({
      barbeariaId: null,
      tipo,
      assunto: template.assunto,
      corpo: template.corpo,
    });
  }
}

export async function getTemplateForType(tipo: string, barbeariaId?: number | null): Promise<{ assunto: string; corpo: string } | null> {
  await ensureDefaultTemplates();

  if (barbeariaId) {
    const [custom] = await db.select().from(emailTemplatesTable).where(
      and(eq(emailTemplatesTable.barbeariaId, barbeariaId), eq(emailTemplatesTable.tipo, tipo), eq(emailTemplatesTable.ativo, true))
    ).limit(1);
    if (custom) return { assunto: custom.assunto, corpo: custom.corpo };
  }

  const [global] = await db.select().from(emailTemplatesTable).where(
    and(isNull(emailTemplatesTable.barbeariaId), eq(emailTemplatesTable.tipo, tipo), eq(emailTemplatesTable.ativo, true))
  ).limit(1);
  if (global) return { assunto: global.assunto, corpo: global.corpo };

  const fallback = DEFAULT_TEMPLATES[tipo];
  return fallback || null;
}

router.get("/tipos", requireAuth, async (_req, res) => {
  return res.json(TEMPLATE_TYPES);
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Acesso negado" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    await ensureDefaultTemplates();

    const globals = await db.select().from(emailTemplatesTable).where(isNull(emailTemplatesTable.barbeariaId));
    const customs = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.barbeariaId, barbearia.id));

    const result = TEMPLATE_TYPES.map(t => {
      const custom = customs.find(c => c.tipo === t.tipo);
      const global = globals.find(g => g.tipo === t.tipo);
      const active = custom || global;
      return {
        tipo: t.tipo,
        label: t.label,
        variaveis: t.variaveis,
        exemplos: t.exemplos,
        customizado: !!custom,
        assunto: active?.assunto || "",
        corpo: active?.corpo || "",
      };
    });

    return res.json(result);
  } catch (e) {
    console.error("list email templates error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/:tipo", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Acesso negado" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    const template = await getTemplateForType(req.params.tipo, barbearia.id);
    if (!template) return res.status(404).json({ error: "Tipo de template não encontrado" });

    const meta = TEMPLATE_TYPES.find(t => t.tipo === req.params.tipo);
    return res.json({ ...template, tipo: req.params.tipo, variaveis: meta?.variaveis || [], exemplos: meta?.exemplos || {} });
  } catch (e) {
    console.error("get email template error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:tipo", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Acesso negado" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    const { tipo } = req.params;
    const { assunto, corpo } = req.body;
    if (!assunto || !corpo) return res.status(400).json({ error: "Assunto e corpo são obrigatórios" });
    if (!TEMPLATE_TYPES.find(t => t.tipo === tipo)) return res.status(400).json({ error: "Tipo de template inválido" });

    const [existing] = await db.select().from(emailTemplatesTable).where(
      and(eq(emailTemplatesTable.barbeariaId, barbearia.id), eq(emailTemplatesTable.tipo, tipo))
    ).limit(1);

    if (existing) {
      await db.update(emailTemplatesTable).set({ assunto, corpo, updatedAt: new Date() }).where(eq(emailTemplatesTable.id, existing.id));
    } else {
      await db.insert(emailTemplatesTable).values({ barbeariaId: barbearia.id, tipo, assunto, corpo });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error("update email template error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/:tipo/reset", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Acesso negado" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    await db.delete(emailTemplatesTable).where(
      and(eq(emailTemplatesTable.barbeariaId, barbearia.id), eq(emailTemplatesTable.tipo, req.params.tipo))
    );

    return res.json({ success: true });
  } catch (e) {
    console.error("reset email template error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/:tipo/test", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Acesso negado" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    const { tipo } = req.params;
    const meta = TEMPLATE_TYPES.find(t => t.tipo === tipo);
    if (!meta) return res.status(400).json({ error: "Tipo de template inválido" });

    const template = await getTemplateForType(tipo, barbearia.id);
    if (!template) return res.status(404).json({ error: "Template não encontrado" });

    const vars: Record<string, string> = {};
    for (const [key, val] of Object.entries(meta.exemplos)) {
      vars[key] = val;
    }
    vars.nomeEstabelecimento = barbearia.nome;

    const renderedBody = renderTemplate(template.corpo, vars);
    const renderedSubject = renderTemplate(template.assunto, vars) + " [TESTE]";

    const result = await sendEmail({
      to: [{ email: user.email, name: user.nome }],
      subject: renderedSubject,
      htmlContent: renderedBody,
    });

    if (!result.success) {
      return res.status(500).json({ error: `Falha ao enviar: ${result.error}` });
    }

    return res.json({ success: true, messageId: result.messageId, sentTo: user.email });
  } catch (e) {
    console.error("test email template error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
