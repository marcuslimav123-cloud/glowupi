# Deploy do Glow Upi numa VPS (fora do Replit)

Guia para colocar o sistema no ar numa VPS Ubuntu 24.04 (Hostinger, Hetzner,
RackNerd etc.) com domínio próprio e HTTPS automático.

## O que o `setup-vps.sh` instala e configura

| Componente | Função |
|---|---|
| Node.js 22 + pnpm | Runtime do backend |
| PostgreSQL 16 | Banco de dados (local, sem custo) |
| Caddy | Servidor web: HTTPS automático (Let's Encrypt), serve o frontend e faz proxy de `/api` |
| systemd `glowupi-api` | Mantém a API no ar e reinicia sozinha |
| ufw | Firewall (só SSH, 80 e 443 abertos) |
| Chaves VAPID | Geradas automaticamente (web push) |

## Passo a passo

1. **Copie o código para a VPS** (em `/opt/glowupi`):
   ```bash
   rsync -a --exclude node_modules --exclude dist ./ root@IP_DA_VPS:/opt/glowupi/
   ```
   Ou deixe o script clonar: `GIT_URL=https://<token>@github.com/<usuario>/glowupi ...`

2. **Rode o script** (como root, na VPS):
   ```bash
   bash /opt/glowupi/deploy/setup-vps.sh seudominio.com.br
   ```

3. **Aponte o DNS**: crie um registro `A` do domínio para o IP da VPS.
   O certificado HTTPS é emitido sozinho no primeiro acesso.

4. **Login Google (necessário para cadastro de donos de salão):**
   - Crie um OAuth Client ID em https://console.cloud.google.com/apis/credentials
     (tipo "Web application"):
     - Origem JavaScript autorizada: `https://seudominio.com.br`
     - URI de redirecionamento autorizado:
       `https://seudominio.com.br/api/auth/google/mobile/callback`
   - Cole o ID em `GOOGLE_CLIENT_ID=` **e o segredo em `GOOGLE_CLIENT_SECRET=`**
     no arquivo `/etc/glowupi.env` (o fluxo web troca o `code` por token no
     servidor, então o segredo é obrigatório);
   - `systemctl restart glowupi-api`.

## Adaptações feitas no código para rodar fora do Replit

- **Upload de imagens** (`OBJECT_STORAGE_MODE=local`): em vez do Object Storage
  do Replit (sidecar GCS), os arquivos são gravados em `LOCAL_OBJECT_DIR`
  (padrão `/var/lib/glowupi/uploads`) e servidos por `/api/storage/objects/...`.
  No Replit nada muda (a variável não é definida lá).
- **Webhook do Stripe**: usa `APP_BASE_URL` quando definido, com fallback para
  `REPLIT_DOMAINS`.

## Variáveis de ambiente (`/etc/glowupi.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | sim | Porta da API (5000) |
| `DATABASE_URL` | sim | Gerada pelo script |
| `APP_BASE_URL` | sim | `https://seudominio.com.br` |
| `OBJECT_STORAGE_MODE` | sim (fora do Replit) | `local` |
| `LOCAL_OBJECT_DIR` | não | Pasta dos uploads |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | p/ push | Geradas pelo script |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | p/ login Google | Criar no Google Cloud Console (os dois) |
| `STRIPE_SECRET_KEY`, `BREVO_API_KEY`... | não | Ativar depois, quando precisar |

## Operação do dia a dia

```bash
journalctl -u glowupi-api -f        # logs da API ao vivo
systemctl restart glowupi-api       # reiniciar a API
systemctl reload caddy              # recarregar config do Caddy
sudo -u postgres pg_dump glowupi > backup.sql   # backup do banco
```

Para atualizar o sistema: copie o código novo para `/opt/glowupi` e rode o
script de novo (ele refaz install, schema e build sem apagar dados).
