import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, barbeariasTable, superAdminsTable, profissionaisTable, profissionaisPerfisTable, perfisAcessoTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, createSession, deleteSession, requireAuth } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";

const router: IRouter = Router();

router.post("/register", async (_req, res) => {
  return res.status(403).json({ error: "O cadastro é feito exclusivamente via Google. Use o botão 'Cadastrar com Google'." });
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      const [adminUser] = await db.select().from(superAdminsTable).where(eq(superAdminsTable.email, email)).limit(1);
      if (adminUser) {
        return res.status(403).json({ error: "Este é um login de administrador. Acesse /admin/login para entrar no painel administrativo.", isAdmin: true });
      }
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }
    if (user.senhaHash !== hashPassword(senha)) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }
    const token = createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
    const { senhaHash: _, ...userWithoutPass } = user;
    return res.json({ token, user: { ...userWithoutPass, createdAt: user.createdAt.toISOString() } });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/logout", (req, res) => {
  const token = req.cookies?.["session"] || req.headers.authorization?.replace("Bearer ", "");
  if (token) deleteSession(token);
  res.clearCookie("session");
  return res.json({ success: true, message: "Logout realizado" });
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
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
      }).returning();
    }

    const token = createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
    const { senhaHash: _, ...userWithoutPass } = user;
    return res.json({ token, user: { ...userWithoutPass, createdAt: user.createdAt.toISOString() }, isNew });
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

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login com Google - Glow Upi</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}
  .card{background:#1a1a1a;border-radius:16px;padding:40px 32px;max-width:420px;width:100%;border:1px solid #333}
  h2{color:#d4a853;font-size:20px;margin:0 0 8px}
  p{color:#aaa;font-size:14px;margin:0 0 24px}
  .spinner{display:none;margin:20px auto;width:32px;height:32px;border:3px solid #333;border-top:3px solid #d4a853;border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .msg{font-size:14px;margin-top:16px;display:none;line-height:1.6}
  .msg.error{color:#ef4444}
  .msg.config{color:#facc15}
  #google-btn{display:flex;justify-content:center}
  code{background:#2a2a2a;padding:3px 6px;border-radius:4px;font-size:11px;color:#d4a853;word-break:break-all}
  .steps{text-align:left;color:#aaa;font-size:13px;line-height:1.7;margin-top:12px}
  .steps li{margin-bottom:4px}
  .btn{display:inline-block;margin-top:16px;padding:10px 20px;background:#d4a853;color:#000;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;cursor:pointer;border:none}
</style>
<script src="https://accounts.google.com/gsi/client" async defer></script>
</head><body>
<div class="card">
  <h2>Glow Upi</h2>
  <p>Faça login com sua conta Google</p>
  <div id="google-btn"></div>
  <div class="spinner" id="spinner"></div>
  <div class="msg" id="msg"></div>
  <div id="config-info" style="display:none">
    <div class="msg config" style="display:block">
      Para ativar o login com Google, adicione este dominio no Google Cloud Console:
    </div>
    <p style="margin:8px 0"><code>${apiBase}</code></p>
    <ol class="steps">
      <li>Acesse <a href="https://console.cloud.google.com/apis/credentials" style="color:#d4a853" target="_blank">Google Cloud Console &rarr; Credentials</a></li>
      <li>Clique no seu OAuth 2.0 Client ID</li>
      <li>Em <strong>"Authorized JavaScript origins"</strong>, adicione a URL acima</li>
      <li>Em <strong>"Authorized redirect URIs"</strong>, adicione:<br/><code>${apiBase}/api/auth/google/mobile/callback</code></li>
      <li>Salve e aguarde ~5 minutos</li>
    </ol>
    <button class="btn" onclick="window.close()">Fechar</button>
  </div>
</div>
<script>
  var gsiLogOriginal = console.warn;
  var originError = false;
  console.warn = function() {
    var msg = Array.from(arguments).join(' ');
    if (msg.indexOf('not allowed for the given client') > -1) {
      originError = true;
      document.getElementById('google-btn').style.display = 'none';
      document.getElementById('config-info').style.display = 'block';
    }
    gsiLogOriginal.apply(console, arguments);
  };

  function handleCredential(response) {
    document.getElementById('spinner').style.display = 'block';
    document.getElementById('google-btn').style.display = 'none';
    var msgEl = document.getElementById('msg');
    msgEl.style.display = 'none';

    fetch('${apiBase}/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.token) {
        if (window.opener) {
          window.opener.postMessage({ type: 'google-auth-success', token: data.token }, '*');
          window.close();
        } else {
          msgEl.textContent = 'Login realizado! Feche esta janela.';
          msgEl.className = 'msg';
          msgEl.style.color = '#22c55e';
          msgEl.style.display = 'block';
          document.getElementById('spinner').style.display = 'none';
        }
      } else {
        throw new Error(data.error || 'Erro no login');
      }
    })
    .catch(function(err) {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('google-btn').style.display = 'flex';
      msgEl.textContent = err.message || 'Erro ao fazer login';
      msgEl.className = 'msg error';
      msgEl.style.display = 'block';
    });
  }

  window.onload = function() {
    setTimeout(function() {
      if (typeof google !== 'undefined' && !originError) {
        google.accounts.id.initialize({
          client_id: '${clientId}',
          callback: handleCredential,
          auto_select: false,
          ux_mode: 'popup'
        });
        google.accounts.id.renderButton(
          document.getElementById('google-btn'),
          { theme: 'filled_black', size: 'large', width: 300, text: 'continue_with', locale: 'pt-BR' }
        );
      } else if (!originError) {
        document.getElementById('config-info').style.display = 'block';
      }
    }, 1000);
  };
</script>
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
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state as string, "base64url").toString());
        redirectScheme = parsed.redirect_scheme || "mobile";
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

    const token = createSession(user.id);

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
      onboardingCompleto: barbearia ? barbearia.onboardingStep >= 3 : false,
      perfilPermissoes,
    });
  } catch (e) {
    console.error("me error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
