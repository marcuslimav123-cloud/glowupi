#!/usr/bin/env bash
#
# Glow Upi — bootstrap completo de uma VPS Ubuntu 24.04 (ou 22.04).
#
# Uso (como root, na VPS):
#   bash setup-vps.sh seudominio.com.br
#
# O código deve estar em /opt/glowupi (via rsync/scp), ou passe GIT_URL:
#   GIT_URL=https://<token>@github.com/usuario/glowupi GIT_BRANCH=main bash setup-vps.sh seudominio.com.br
#
# O script é idempotente: pode rodar de novo para atualizar (ele não
# sobrescreve /etc/glowupi.env nem recria o banco se já existirem).
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Uso: bash setup-vps.sh <dominio>  (ex.: bash setup-vps.sh glowupi.com.br)"
  exit 1
fi

APP_DIR=/opt/glowupi
ENV_FILE=/etc/glowupi.env
UPLOAD_DIR=/var/lib/glowupi/uploads
SERVICE_USER=glowupi

echo "==> [1/9] Pacotes base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ca-certificates gnupg ufw postgresql postgresql-contrib

echo "==> [2/9] Node.js 22 + pnpm"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v pnpm >/dev/null 2>&1 || npm install -g pnpm@10

echo "==> [3/9] Caddy (servidor web com HTTPS automático)"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> [4/9] Código em $APP_DIR"
if [ ! -d "$APP_DIR" ]; then
  if [ -n "${GIT_URL:-}" ]; then
    git clone --branch "${GIT_BRANCH:-main}" "$GIT_URL" "$APP_DIR"
  else
    echo "ERRO: coloque o código em $APP_DIR (rsync/scp) ou defina GIT_URL."
    exit 1
  fi
fi
cd "$APP_DIR"
pnpm install --frozen-lockfile --prod=false

echo "==> [5/9] Banco de dados PostgreSQL"
systemctl enable --now postgresql
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='glowupi'" | grep -q 1; then
  DB_PASS="$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 24)"
  sudo -u postgres psql -c "CREATE ROLE glowupi LOGIN PASSWORD '$DB_PASS';"
  sudo -u postgres psql -c "CREATE DATABASE glowupi OWNER glowupi;"
  NEW_DB=1
else
  NEW_DB=0
fi

echo "==> [6/9] Arquivo de configuração $ENV_FILE"
if [ ! -f "$ENV_FILE" ]; then
  if [ "${NEW_DB:-0}" != "1" ]; then
    echo "ERRO: banco já existe mas $ENV_FILE não. Defina DATABASE_URL manualmente em $ENV_FILE."
    exit 1
  fi
  VAPID_JSON="$(cd "$APP_DIR/artifacts/api-server" && pnpm exec web-push generate-vapid-keys --json)"
  VAPID_PUB="$(echo "$VAPID_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).publicKey))')"
  VAPID_PRIV="$(echo "$VAPID_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).privateKey))')"
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://glowupi:${DB_PASS}@localhost:5432/glowupi
APP_BASE_URL=https://${DOMAIN}
OBJECT_STORAGE_MODE=local
LOCAL_OBJECT_DIR=${UPLOAD_DIR}
VAPID_PUBLIC_KEY=${VAPID_PUB}
VAPID_PRIVATE_KEY=${VAPID_PRIV}
VAPID_SUBJECT=mailto:contato@${DOMAIN}
# Preencher depois para habilitar login Google (obrigatório p/ cadastro de clientes):
GOOGLE_CLIENT_ID=
# Opcionais (Stripe, e-mail etc.) — preencher quando for ativar:
# STRIPE_SECRET_KEY=
# BREVO_API_KEY=
EOF
  chmod 600 "$ENV_FILE"
fi

echo "==> [7/9] Schema do banco (drizzle push)"
set -a; . "$ENV_FILE"; set +a
(cd "$APP_DIR" && pnpm --filter db run push-force)

echo "==> [8/9] Build do frontend + serviço systemd"
(cd "$APP_DIR" && pnpm --filter @workspace/barberpro build)
id -u "$SERVICE_USER" >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin "$SERVICE_USER"
mkdir -p "$UPLOAD_DIR"
chown -R "$SERVICE_USER":"$SERVICE_USER" /var/lib/glowupi
chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR"

cat > /etc/systemd/system/glowupi-api.service <<EOF
[Unit]
Description=Glow Upi API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=${SERVICE_USER}
WorkingDirectory=${APP_DIR}/artifacts/api-server
EnvironmentFile=${ENV_FILE}
ExecStart=/bin/bash -c 'exec "\$(command -v pnpm)" exec tsx src/index.ts'
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now glowupi-api
systemctl restart glowupi-api

echo "==> [9/9] Caddy (HTTPS em https://${DOMAIN}) + firewall"
cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
	encode gzip

	handle /api/* {
		reverse_proxy 127.0.0.1:5000
	}

	handle {
		root * ${APP_DIR}/artifacts/barberpro/dist/public
		try_files {path} /index.html
		file_server
	}
}
EOF
systemctl enable --now caddy
systemctl reload caddy

ufw allow OpenSSH >/dev/null
ufw allow 80 >/dev/null
ufw allow 443 >/dev/null
ufw --force enable >/dev/null

echo ""
echo "============================================================"
echo " Pronto! Verificações:"
systemctl is-active glowupi-api && echo " - API: ativa"
systemctl is-active caddy && echo " - Caddy: ativo"
echo " - Aponte o DNS de ${DOMAIN} (registro A) para o IP desta máquina."
echo " - O HTTPS é emitido automaticamente no primeiro acesso após o DNS propagar."
echo " - Logs da API: journalctl -u glowupi-api -f"
echo "============================================================"
