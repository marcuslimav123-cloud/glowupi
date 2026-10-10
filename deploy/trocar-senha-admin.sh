#!/usr/bin/env bash
#
# Glow Upi — troca a senha dos super admins (login do painel /admin).
#
# As senhas iniciais dos admins estão no código-fonte (que é público), então
# elas PRECISAM ser trocadas no servidor de produção.
#
# Uso (como root, na VPS):
#
#   Gera uma senha nova e forte para CADA admin e mostra na tela (anote!):
#     curl -fsSL https://raw.githubusercontent.com/marcuslimav123-cloud/glowupi/claude/stoic-tesla-ownbsp/deploy/trocar-senha-admin.sh | bash
#
#   Define a senha de um admin específico:
#     curl -fsSL https://raw.githubusercontent.com/marcuslimav123-cloud/glowupi/claude/stoic-tesla-ownbsp/deploy/trocar-senha-admin.sh | bash -s -- marcus@admin.com 'SuaSenhaNova'
#
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/glowupi}
ENV_FILE=${ENV_FILE:-/etc/glowupi.env}
EMAIL="${1:-}"
SENHA="${2:-}"

set -a; . "$ENV_FILE"; set +a
cd "$APP_DIR/artifacts/api-server"

if [ -n "$EMAIL" ]; then
  EMAILS="$EMAIL"
else
  EMAILS="$(psql "$DATABASE_URL" -Atc "select email from super_admins where ativo order by id")"
fi
[ -n "$EMAILS" ] || { echo "Nenhum admin encontrado."; exit 1; }

echo ""
echo "=== NOVAS SENHAS DO PAINEL /admin (anote em lugar seguro) ==="
for e in $EMAILS; do
  if [ -n "$SENHA" ]; then
    s="$SENHA"
  else
    s="$(node -e 'console.log(require("crypto").randomBytes(12).toString("base64url"))')"
  fi
  hash="$(node -e 'console.log(require("bcryptjs").hashSync(process.argv[1], 12))' "$s")"
  n="$(echo "update super_admins set senha_hash = :'h' where email = :'e' returning id;" \
       | psql "$DATABASE_URL" -v e="$e" -v h="$hash" -At | wc -l)"
  if [ "$n" -ge 1 ]; then
    echo "  $e  ->  $s"
  else
    echo "  $e  ->  (admin não encontrado, nada alterado)"
  fi
done
echo "============================================================="
echo "Login: https://$(grep '^APP_BASE_URL=' "$ENV_FILE" | cut -d/ -f3)/admin"
