import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, barbeariasTable, superAdminsTable, profissionaisTable, profissionaisPerfisTable, perfisAcessoTable, platformConfigTable, passwordResetTokensTable, lgpdConsentsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { hashPassword, createSession, deleteSession, requireAuth } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";
import { randomBytes } from "crypto";
import { sendEmail } from "../lib/brevo.js";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  try {
    const { nome, email, senha, utm } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
    }
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      return res.status(409).json({ error: "Este email já está cadastrado" });
    }
    const [user] = await db.insert(usersTable).values({
      nome,
      email,
      senhaHash: hashPassword(senha),
      role: "dono",
      utmSource: utm?.utmSource || null,
      utmMedium: utm?.utmMedium || null,
      utmCampaign: utm?.utmCampaign || null,
      utmContent: utm?.utmContent || null,
      utmTerm: utm?.utmTerm || null,
      fbclid: utm?.fbclid || null,
      gclid: utm?.gclid || null,
      landingPage: utm?.landingPage || null,
      referrer: utm?.referrer || null,
    }).returning();
    const token = await createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    const { senhaHash: _, ...userWithoutPass } = user;
    return res.json({ token, user: { ...userWithoutPass, createdAt: user.createdAt.toISOString() } });
  } catch (e) {
    console.error("register error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }
    const [adminUser] = await db.select().from(superAdminsTable).where(eq(superAdminsTable.email, email)).limit(1);
    if (adminUser) {
      return res.status(403).json({ error: "Este é um login de administrador. Acesse /admin/login para entrar no painel administrativo.", isAdmin: true });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }
    if (user.senhaHash !== hashPassword(senha)) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }
    const token = await createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    const { senhaHash: _, ...userWithoutPass } = user;
    return res.json({ token, user: { ...userWithoutPass, createdAt: user.createdAt.toISOString() } });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/logout", async (req, res) => {
  const token = req.cookies?.["session"] || req.headers.authorization?.replace("Bearer ", "");
  if (token) await deleteSession(token);
  res.clearCookie("session", { path: "/" });
  return res.json({ success: true, message: "Logout realizado" });
});

router.post("/google", async (req, res) => {
  try {
    const { credential, utm } = req.body;
    if (!credential) return res.status(400).json({ error: "Token do Google obrigatório" });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Login com Google não configurado" });

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: "Token inválido" });
    if (!payload.email_verified) return res.status(400).json({ error: "E-mail do Google não verificado" });

    const googleId = payload.sub;
    const email = payload.email;
    const nome = payload.name || email.split("@")[0];
    const fotoUrl = payload.picture || null;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    let isNew = false;

    if (user) {
      if (!user.googleId) {
        [user] = await db.update(usersTable).set({ googleId, fotoUrl: fotoUrl || user.fotoUrl }).where(eq(usersTable.id, user.id)).returning();
      }
    } else {
      isNew = true;
      [user] = await db.insert(usersTable).values({
        nome,
        email,
        googleId,
        fotoUrl,
        role: "dono",
        utmSource: utm?.utmSource || null,
        utmMedium: utm?.utmMedium || null,
        utmCampaign: utm?.utmCampaign || null,
        utmContent: utm?.utmContent || null,
        utmTerm: utm?.utmTerm || null,
        fbclid: utm?.fbclid || null,
        gclid: utm?.gclid || null,
        landingPage: utm?.landingPage || null,
        referrer: utm?.referrer || null,
      }).returning();
    }

    let existingBarbearia: { id: number; onboardingStep: number | null } | undefined;
    [existingBarbearia] = await db.select({ id: barbeariasTable.id, onboardingStep: barbeariasTable.onboardingStep })
      .from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);

    if (!existingBarbearia && user.barbeariaId) {
      [existingBarbearia] = await db.select({ id: barbeariasTable.id, onboardingStep: barbeariasTable.onboardingStep })
        .from(barbeariasTable).where(eq(barbeariasTable.id, user.barbeariaId)).limit(1);
    }

    const token = await createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    const { senhaHash: _, ...userWithoutPass } = user;
    return res.json({
      token,
      user: { ...userWithoutPass, createdAt: user.createdAt.toISOString() },
      isNew,
      hasBarbearia: !!existingBarbearia,
      onboardingComplete: existingBarbearia ? true : false,
    });
  } catch (e: any) {
    console.error("Google auth error:", e);
    return res.status(401).json({ error: "Falha na autenticação com Google" });
  }
});

router.get("/google/mobile", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "Login com Google não configurado" });

  const redirectScheme = (req.query.redirect_scheme as string) || "mobile";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const redirectUri = `${protocol}://${host}/api/auth/google/mobile/callback`;

  const state = Buffer.from(JSON.stringify({ redirect_scheme: redirectScheme })).toString("base64url");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return res.redirect(googleAuthUrl.toString());
});

router.get("/google/signin-popup", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).send("Google OAuth não configurado");

  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const apiBase = `${protocol}://${host}`;
  const callbackUri = `${apiBase}/api/auth/google/mobile/callback`;

  const returnUrl = req.query.return_url as string | undefined;
  const statePayload: Record<string, string> = returnUrl
    ? { redirect_scheme: "__return_url__", return_url: returnUrl }
    : { redirect_scheme: "__popup__" };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", callbackUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  const directAuthUrl = googleAuthUrl.toString();

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login com Google - Glow Upi</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}
  .card{background:#1a1a1a;border-radius:16px;padding:40px 32px;max-width:380px;width:100%;border:1px solid #333}
  h2{color:#d4a853;font-size:22px;margin:0 0 8px}
  p{color:#aaa;font-size:14px;margin:0 0 28px}
  .g-btn{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;padding:14px 20px;background:#fff;color:#333;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:system-ui,sans-serif;transition:background .2s}
  .g-btn:hover{background:#f0f0f0}
  .g-btn svg{width:20px;height:20px}
  .spinner{display:none;margin:20px auto;width:32px;height:32px;border:3px solid #333;border-top:3px solid #d4a853;border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
</head><body>
<div class="card">
  <h2>Glow Upi</h2>
  <p>Selecione sua conta Google para continuar</p>
  <button class="g-btn" onclick="window.location.href='${directAuthUrl}'">
    <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
    Continuar com Google
  </button>
  <div class="spinner" id="spinner"></div>
</div>
</body></html>`;

  res.setHeader("Content-Type", "text/html");
  return res.send(html);
});

router.get("/google/mobile/callback", async (req, res) => {
  const errorPage = (title: string, msg: string) => `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}
    .card{background:#1a1a1a;border-radius:16px;padding:40px;max-width:400px;border:1px solid #333}
    h1{color:#d4a853;font-size:24px;margin-bottom:16px}p{color:#aaa;font-size:16px;line-height:1.5}
    .btn{display:inline-block;margin-top:20px;padding:12px 24px;background:#d4a853;color:#000;border-radius:10px;text-decoration:none;font-weight:600}</style></head>
    <body><div class="card"><h1>${title}</h1><p>${msg}</p><a class="btn" href="javascript:window.close()">Fechar</a></div></body></html>`;

  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error("Google OAuth error:", oauthError);
      return res.status(400).send(errorPage("Erro no Google", "A autenticação com Google foi cancelada ou falhou. Feche esta janela e tente novamente."));
    }

    if (!code) return res.status(400).send(errorPage("Erro", "Código de autorização não recebido. Feche esta janela e tente novamente."));

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(500).send(errorPage("Erro de Configuração", "Google OAuth não configurado no servidor."));

    let redirectScheme = "mobile";
    let stateData: Record<string, string> = {};
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state as string, "base64url").toString());
        redirectScheme = stateData.redirect_scheme || "mobile";
      } catch {}
    }

    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/google/mobile/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json() as { id_token?: string; error?: string; error_description?: string };
    if (!tokenRes.ok || !tokenData.id_token) {
      console.error("Google token exchange error:", tokenData);
      if (tokenData.error === "redirect_uri_mismatch") {
        const mismatchPage = `
          <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Configuração necessária</title>
          <style>body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}
          .card{background:#1a1a1a;border-radius:16px;padding:40px;max-width:550px;border:1px solid #333;text-align:left}
          h1{color:#d4a853;font-size:22px;margin-bottom:16px;text-align:center}p{color:#aaa;font-size:15px;line-height:1.6;margin-bottom:12px}
          code{background:#2a2a2a;padding:4px 8px;border-radius:6px;font-size:13px;color:#d4a853;word-break:break-all;display:inline-block;margin:4px 0}
          ol{color:#ccc;font-size:14px;line-height:1.8;padding-left:20px}
          .btn{display:inline-block;margin-top:16px;padding:12px 24px;background:#d4a853;color:#000;border-radius:10px;text-decoration:none;font-weight:600}</style></head>
          <body><div class="card">
          <h1>Configuração do Google Console</h1>
          <p>A URL de redirecionamento abaixo precisa ser registrada no Google Cloud Console:</p>
          <code>${redirectUri}</code>
          <p><strong>Passos:</strong></p>
          <ol>
            <li>Acesse <a href="https://console.cloud.google.com/apis/credentials" style="color:#d4a853" target="_blank">Google Cloud Console → APIs & Services → Credentials</a></li>
            <li>Clique no seu OAuth 2.0 Client ID</li>
            <li>Em <strong>"Authorized redirect URIs"</strong>, adicione a URL acima</li>
            <li>Salve e tente novamente após alguns minutos</li>
          </ol>
          <div style="text-align:center"><a class="btn" href="javascript:window.close()">Fechar</a></div>
          </div></body></html>`;
        return res.status(400).send(mismatchPage);
      }
      return res.status(400).send(errorPage("Erro de Autenticação", "Erro ao trocar código por token do Google. Tente novamente."));
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: tokenData.id_token, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(400).send(errorPage("Email não verificado", "O email do Google não está verificado. Use outra conta."));
    }

    const googleId = payload.sub;
    const email = payload.email;
    const nome = payload.name || email.split("@")[0];
    const fotoUrl = payload.picture || null;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (user) {
      if (!user.googleId) {
        [user] = await db.update(usersTable).set({ googleId, fotoUrl: fotoUrl || user.fotoUrl }).where(eq(usersTable.id, user.id)).returning();
      }
    } else {
      [user] = await db.insert(usersTable).values({
        nome,
        email,
        googleId,
        fotoUrl,
        role: "dono",
      }).returning();
    }

    const token = await createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });

    if (redirectScheme === "__webapp__") {
      let [existingBarbearia] = await db.select({ id: barbeariasTable.id })
        .from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
      if (!existingBarbearia && user.barbeariaId) {
        [existingBarbearia] = await db.select({ id: barbeariasTable.id })
          .from(barbeariasTable).where(eq(barbeariasTable.id, user.barbeariaId)).limit(1);
      }
      let target = "/dashboard";
      if (!user.telefone) target = "/completar-perfil";
      else if (!existingBarbearia) target = "/onboarding/barbearia";
      return res.redirect(target);
    }

    if (redirectScheme === "__popup__") {
      const successPage = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Login realizado</title>
        <style>body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
        .card{background:#1a1a1a;border-radius:16px;padding:40px;text-align:center;border:1px solid #333}
        h2{color:#22c55e;margin:0 0 8px}p{color:#aaa;font-size:14px}</style></head>
        <body><div class="card"><h2>Login realizado!</h2><p>Fechando...</p></div>
        <script>
          if(window.opener){window.opener.postMessage({type:'google-auth-success',token:'${token}'},window.location.origin);setTimeout(function(){window.close()},500)}
          else{document.querySelector('p').textContent='Feche esta janela e volte ao app.'}
        </script></body></html>`;
      return res.send(successPage);
    }

    if (redirectScheme === "__return_url__" && stateData.return_url) {
      try {
        const returnUrl = new URL(stateData.return_url);
        const allowedSchemes = ["exp:", "exps:", "mobile:", "http:", "https:"];
        if (!allowedSchemes.includes(returnUrl.protocol)) {
          return res.status(400).send(errorPage("Erro", "URL de retorno inválida."));
        }
        if (returnUrl.protocol === "https:" || returnUrl.protocol === "http:") {
          const host = returnUrl.hostname;
          if (!host.endsWith(".replit.dev") && !host.endsWith(".replit.app") && !host.endsWith("glowupi.com.br") && host !== "localhost") {
            return res.status(400).send(errorPage("Erro", "URL de retorno não autorizada."));
          }
        }
        returnUrl.searchParams.set("token", token);
        return res.redirect(returnUrl.toString());
      } catch {
        return res.status(400).send(errorPage("Erro", "URL de retorno malformada."));
      }
    }

    const appRedirect = `${redirectScheme}://auth?token=${encodeURIComponent(token)}`;
    return res.redirect(appRedirect);
  } catch (e) {
    console.error("Google mobile callback error:", e);
    return res.status(500).send(errorPage("Erro Interno", "Ocorreu um erro inesperado na autenticação. Feche esta janela e tente novamente."));
  }
});

router.post("/complete-profile", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { telefone } = req.body;
    if (!telefone) return res.status(400).json({ error: "WhatsApp é obrigatório" });
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) return res.status(400).json({ error: "WhatsApp inválido. Use DDD + número." });
    const [updated] = await db.update(usersTable).set({ telefone }).where(eq(usersTable.id, user.id)).returning();
    const { senhaHash: _, ...userWithoutPass } = updated;
    return res.json({ ...userWithoutPass, createdAt: updated.createdAt.toISOString() });
  } catch (e) {
    console.error("complete-profile error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/tema", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { tema } = req.body;
    const validTemas = ["blue", "black", "purple", "green", "red", "yellow", "teal", "bluegray", "brown", "light-blue", "light-purple", "light-green", "light-red", "light-yellow", "light-teal", "light-bluegray", "light-brown"];
    if (!tema || !validTemas.includes(tema)) {
      return res.status(400).json({ error: "Tema inválido" });
    }
    const [updated] = await db.update(usersTable).set({ tema, updatedAt: new Date() }).where(eq(usersTable.id, user.id)).returning();
    return res.json({ tema: updated.tema });
  } catch (e) {
    console.error("tema update error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { senhaHash: _, ...userWithoutPass } = user;
    let barbearia = null;
    if (user.role === "dono") {
      const [b] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
      barbearia = b || null;
    } else if (user.barbeariaId) {
      const [b] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, user.barbeariaId)).limit(1);
      barbearia = b || null;
    }
    let perfilPermissoes: string[] | null = null;
    if (barbearia && (user.role === "gerente" || user.role === "colaborador") && user.profissionalId) {
      const [vinculo] = await db.select().from(profissionaisPerfisTable)
        .where(eq(profissionaisPerfisTable.profissionalId, user.profissionalId)).limit(1);
      if (vinculo) {
        const [perfil] = await db.select().from(perfisAcessoTable)
          .where(and(
            eq(perfisAcessoTable.id, vinculo.perfilId),
            eq(perfisAcessoTable.ativo, true),
            eq(perfisAcessoTable.barbeariaId, barbearia.id)
          )).limit(1);
        if (perfil && Array.isArray(perfil.permissoes)) {
          perfilPermissoes = perfil.permissoes as string[];
        }
      }
    }

    const [superAdmin] = await db.select().from(superAdminsTable).where(eq(superAdminsTable.email, user.email)).limit(1);
    const isSuperAdmin = !!superAdmin && superAdmin.ativo;

    const [lastConsent] = await db.select().from(lgpdConsentsTable)
      .where(eq(lgpdConsentsTable.userId, user.id))
      .orderBy(desc(lgpdConsentsTable.acceptedAt))
      .limit(1);

    return res.json({
      ...userWithoutPass,
      createdAt: user.createdAt.toISOString(),
      isSuperAdmin,
      barbearia: barbearia ? {
        ...barbearia,
        createdAt: barbearia.createdAt.toISOString(),
        updatedAt: barbearia.updatedAt.toISOString(),
        planoVencimento: barbearia.planoVencimento?.toISOString() ?? null,
      } : null,
      barbeariaId: barbearia?.id ?? null,
      onboardingCompleto: barbearia ? (barbearia.onboardingStep ?? 0) >= 5 : false,
      tutorialCompleto: barbearia?.tutorialCompleto ?? false,
      perfilPermissoes,
      lgpdConsentido: !!lastConsent,
    });
  } catch (e) {
    console.error("me error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email é obrigatório" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      return res.json({ success: true, message: "Se o email existir, enviaremos instruções de recuperação." });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "https://glowupi.com.br";
    const resetLink = `${baseUrl}/redefinir-senha?token=${token}`;

    await sendEmail({
      to: [{ email: user.email, name: user.nome }],
      subject: "Redefinir Senha - Glow Upi",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d4a853; margin: 0;">Glow Upi</h1>
          </div>
          <h2 style="color: #333;">Redefinir Senha</h2>
          <p style="color: #666;">Olá ${user.nome},</p>
          <p style="color: #666;">Recebemos um pedido para redefinir sua senha. Clique no botão abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #d4a853; color: #000; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir Senha</a>
          </div>
          <p style="color: #999; font-size: 13px;">Este link expira em 1 hora. Se você não solicitou, ignore este email.</p>
        </div>
      `,
    });

    return res.json({ success: true, message: "Se o email existir, enviaremos instruções de recuperação." });
  } catch (e) {
    console.error("forgot-password error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) return res.status(400).json({ error: "Token e nova senha são obrigatórios" });
    if (novaSenha.length < 6) return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });

    const [resetToken] = await db.select().from(passwordResetTokensTable)
      .where(and(eq(passwordResetTokensTable.token, token), eq(passwordResetTokensTable.usado, false)))
      .limit(1);

    if (!resetToken) return res.status(400).json({ error: "Token inválido ou já utilizado" });
    if (new Date() > resetToken.expiresAt) return res.status(400).json({ error: "Token expirado. Solicite um novo link." });

    const senhaHash = await hashPassword(novaSenha);

    await db.update(usersTable).set({ senhaHash, updatedAt: new Date() }).where(eq(usersTable.id, resetToken.userId));
    await db.update(passwordResetTokensTable).set({ usado: true }).where(eq(passwordResetTokensTable.id, resetToken.id));

    return res.json({ success: true, message: "Senha redefinida com sucesso" });
  } catch (e) {
    console.error("reset-password error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/lgpd-consent", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const tipo = req.body.tipo || "full";
    const ipAddress = req.headers["x-forwarded-for"] || req.ip || null;
    const userAgent = req.headers["user-agent"] || null;

    const [consent] = await db.insert(lgpdConsentsTable).values({
      userId: user.id,
      tipo,
      ipAddress: typeof ipAddress === "string" ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent,
    }).returning();

    console.log(`[lgpd] User ${user.id} (${user.email}) accepted LGPD consent type=${tipo} ip=${ipAddress}`);

    return res.json({ success: true, consentId: consent.id, acceptedAt: consent.acceptedAt.toISOString() });
  } catch (e) {
    console.error("lgpd-consent error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
