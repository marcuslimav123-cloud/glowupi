# HANDOFF — Deploy do Glow Upi em produção (continuação de sessão)

> Contexto para a sessão do Claude que continuar este trabalho.
> Dono do projeto: Marcus (não-técnico, fala pt-BR, respostas simples e diretas).
> Ele pediu para NÃO usar multi-agentes/workflows (custo).

## Estado atual (10/10/2026)

- **VPS**: Hostinger KVM 2 (2 vCPU, 8GB RAM, Ubuntu 24.04), IP **179.236.69.85**
- **Domínio**: **glowupi.com.br** (registrado na própria Hostinger; DNS ainda NÃO aponta para a VPS)
- **Credenciais disponíveis na sessão nova**:
  - `VPS_ROOT_PASSWORD` — variável de ambiente (senha root da VPS)
  - **Conector Hostinger (preferir!)**: o usuário instalou/está instalando o conector oficial
    da Hostinger no claude.ai (OAuth). Se houver tools `mcp__hostinger*` (ou via ToolSearch),
    usá-las para DNS e dados da VPS em vez de curl na API.
  - `HOSTINGER_API_TOKEN` — network secret (fallback): o proxy injeta `Authorization: Bearer ...`
    em chamadas para `developers.hostinger.com` (não dá para ler o valor; pode não existir
    se o usuário não achou o token — o conector substitui)
- O app já foi rodado e validado de ponta a ponta em sessão anterior (screenshots enviados ao
  usuário): landing, admin (/admin/login), dashboard do salão, agenda, portal público.

## O que já está pronto neste branch (claude/stoic-tesla-ownbsp, PR #1)

- `OBJECT_STORAGE_MODE=local`: uploads em disco local (testado: PUT autenticado,
  round-trip idêntico, 401 sem auth, traversal 404)
- Webhook Stripe usa `APP_BASE_URL` (fallback REPLIT_DOMAINS)
- `deploy/setup-vps.sh`: bootstrap completo Ubuntu 24.04 (Node 22, pnpm, Postgres,
  Caddy+HTTPS, systemd, ufw, VAPID, drizzle push, build do frontend). Idempotente.
- `deploy/README.md`: guia de operação

## ⚡ PLANO DE EXECUÇÃO ATUAL (atualizado 10/10/2026 13:10 UTC — substitui os passos antigos abaixo)

Fatos já confirmados pela sessão-mãe (NÃO refazer):
- VPS Hostinger id **2050687**, KVM 2, **Ubuntu 26.04**, IP **179.236.69.85**, rodando.
- **DNS JÁ CONFIGURADO**: glowupi.com.br (A) e www (CNAME) → 179.236.69.85, TTL 300.
- O conector MCP Hostinger da conta (tools `mcp__Marcus_GLOWUPI_CONECTOR__search/execute`)
  funciona em sessões novas e **adiciona chave SSH root na VM em execução** via
  operação `vps_ssh-keys_add-virtual-machine` (testado com sucesso).
- **Senha root NÃO é necessária** (ignore VPS_ROOT_PASSWORD; pode não existir).

Passos:
1. Carregar tools do conector via ToolSearch (`mcp__Marcus_GLOWUPI_CONECTOR__*`).
   `apt-get update && apt-get install -y openssh-client rsync` se faltarem.
2. `ssh-keygen -t ed25519` sem passphrase → adicionar a pública via execute:
   `vps_ssh-keys_add-virtual-machine` com `{"virtualMachineId": 2050687, "keys": ["<pub>"]}`.
3. Testar `ssh -i <chave> -o StrictHostKeyChecking=accept-new root@179.236.69.85 'echo ok'`.
   Porta 22 bloqueada? Tentar ProxyCommand CONNECT via $HTTPS_PROXY; se nada passar,
   explicar ao Marcus em linguagem simples (fallback: terminal do navegador no hPanel).
4. `rsync -a --exclude node_modules --exclude dist --exclude .git ./ root@179.236.69.85:/opt/glowupi/`
   e `ssh ... 'bash /opt/glowupi/deploy/setup-vps.sh glowupi.com.br'`.
   Template é Ubuntu 26.04 (script escrito p/ 24.04): adaptar pacotes se divergirem.
5. Conferir `systemctl status glowupi-api` e `caddy`. Certificado HTTPS pode levar
   alguns minutos (propagação de DNS; Caddy insiste sozinho).
6. Blindar: `PasswordAuthentication no` + reload ssh (seguro: sessões futuras
   readicionam chave pelo conector).
7. Smoke test: `curl -I https://glowupi.com.br`; `/api/auth/me` → 401 JSON. Screenshots
   com Playwright (chromium em /opt/pw-browsers, lib em /opt/node-tools/node_modules)
   enviados ao Marcus via SendUserFile.
8. Avisar o Marcus: falta só `GOOGLE_CLIENT_ID` em /etc/glowupi.env (ele cria no Google
   Cloud Console, origem https://glowupi.com.br) + `systemctl restart glowupi-api`
   para o cadastro Google funcionar. Login super admin já funciona.

## Passos restantes (em ordem) — HISTÓRICO (superado pelo plano acima)

1. **Testar acessos**: `env | grep VPS_ROOT_PASSWORD`; TCP 179.236.69.85:22;
   `curl https://developers.hostinger.com/api/vps/v1/virtual-machines` (deve voltar 200 com o
   token injetado). Instalar `openssh-client sshpass` via apt se faltarem.
2. **DNS via API Hostinger** (developers.hostinger.com/api/dns/...): apontar registro A de
   `glowupi.com.br` (e `www`) para `179.236.69.85` (TTL baixo, ex. 300).
3. **Copiar código para a VPS**: `rsync -a --exclude node_modules --exclude dist --exclude .git`
   do checkout deste branch para `root@179.236.69.85:/opt/glowupi/`
   (sshpass -p "$VPS_ROOT_PASSWORD" ssh -o StrictHostKeyChecking=accept-new).
   Se SSH sair bloqueado pela rede da sessão, tentar via proxy CONNECT
   (`ssh -o ProxyCommand='nc -X connect -x $HTTPS_PROXY %h %p'`); último recurso: gerar
   comando único para o usuário colar no "Browser terminal" do hPanel.
4. **Rodar** `bash /opt/glowupi/deploy/setup-vps.sh glowupi.com.br` na VPS.
5. **Blindar SSH** (prometido ao usuário): criar chave, instalar em authorized_keys,
   `PasswordAuthentication no` + reload sshd. Guardar a chave privada via SendUserFile?
   NÃO — deixar a chave só na sessão é inútil (efêmera). Melhor: gerar chave, salvar a
   privada em `/root/.ssh/` da própria VPS não faz sentido; alternativa pragmática:
   manter login por senha ATIVO até combinar com o usuário, OU instalar chave e enviar a
   privada ao usuário via SendUserFile com aviso para guardar. Decidir com o usuário.
6. **Smoke test**: `curl -I https://glowupi.com.br` (SSL ok), `/api/auth/me` → 401 JSON,
   abrir com Playwright (Chromium em /opt/pw-browsers, playwright em
   /opt/node-tools/node_modules) e mandar screenshots via SendUserFile.
7. **Avisar o usuário** que falta só o `GOOGLE_CLIENT_ID` (ele cria no Google Cloud Console
   com origem https://glowupi.com.br; colocar em /etc/glowupi.env e reiniciar o serviço)
   para o cadastro Google funcionar. Login super admin já funciona sem isso.

## Credenciais seeded do app (defaults do código, lib/adminAuth.ts)

- Super admin web: `/admin/login` → marcus@admin.com / MaGu1409 (trocar depois em produção!)

## Notas

- O usuário acompanha pelo celular/PC não confiável; enviar screenshots de progresso.
- NÃO pedir para ele colar senhas no chat. NÃO commitar segredos.
- Commits: branch `claude/stoic-tesla-ownbsp`, PR github.com/marcuslimav123-cloud/glowupi/pull/1.
