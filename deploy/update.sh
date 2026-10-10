#!/usr/bin/env bash
#
# Glow Upi — atualiza o sistema na VPS com a versão mais recente do GitHub.
#
# Uso (como root, na VPS):
#   bash /opt/glowupi/deploy/update.sh
# ou direto do GitHub:
#   curl -fsSL https://raw.githubusercontent.com/marcuslimav123-cloud/glowupi/claude/stoic-tesla-ownbsp/deploy/update.sh | bash
#
# O que faz: baixa o código novo, instala dependências, aplica mudanças de
# schema no banco, reconstrói o frontend, reinicia a API e garante o backup
# diário do banco. Não mexe em /etc/glowupi.env nem nos dados.
set -euo pipefail

APP_DIR=/opt/glowupi
ENV_FILE=/etc/glowupi.env
SERVICE_USER=glowupi
BACKUP_DIR=/var/backups/glowupi

echo "==> [1/6] Baixando a versão mais recente"
cd "$APP_DIR"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch --quiet origin "$BRANCH"
git reset --hard --quiet "origin/$BRANCH"
echo "    versão: $(git log -1 --format='%h %s')"

echo "==> [2/6] Dependências"
pnpm install --frozen-lockfile --prod=false --silent

echo "==> [3/6] Schema do banco"
set -a; . "$ENV_FILE"; set +a
pnpm --filter db run push-force >/dev/null

echo "==> [4/6] Build do frontend"
pnpm --filter @workspace/barberpro build >/dev/null
chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR"

echo "==> [5/6] Reiniciando a API"
systemctl restart glowupi-api
API_OK=0
for _ in $(seq 1 30); do
  sleep 2
  if curl -fsS "http://127.0.0.1:${PORT:-5000}/api/healthz" >/dev/null 2>&1; then API_OK=1; break; fi
  systemctl is-active --quiet glowupi-api || break
done
if [ "$API_OK" = 1 ]; then
  echo "    API: ativa e respondendo"
else
  echo "    ERRO: a API não subiu. Últimas linhas do log:"
  journalctl -u glowupi-api -n 30 --no-pager
  exit 1
fi

echo "==> [6/6] Backup diário do banco (cron 03:00, mantém 14 dias)"
mkdir -p "$BACKUP_DIR"
chown postgres:postgres "$BACKUP_DIR"
cat > /etc/cron.d/glowupi-backup <<'EOF'
0 3 * * * postgres pg_dump -Fc glowupi > /var/backups/glowupi/glowupi-$(date +\%F).dump && find /var/backups/glowupi -name '*.dump' -mtime +14 -delete
EOF
chmod 644 /etc/cron.d/glowupi-backup
if [ ! -f "$BACKUP_DIR/glowupi-$(date +%F).dump" ]; then
  sudo -u postgres pg_dump -Fc glowupi > "$BACKUP_DIR/glowupi-$(date +%F).dump" && echo "    primeiro backup feito: $BACKUP_DIR/glowupi-$(date +%F).dump"
fi

echo ""
echo "=== ATUALIZAÇÃO CONCLUÍDA ==="
echo "Site: https://$(grep '^APP_BASE_URL=' "$ENV_FILE" | cut -d/ -f3)"
