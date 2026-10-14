#!/usr/bin/env python3
# Cria no Stripe todos os produtos e preços oficiais do Glow Upi (idempotente:
# pode rodar quantas vezes quiser — só cria o que estiver faltando).
#
# Uso, na VPS (lê a chave de /etc/glowupi.env):
#   curl -fsSL https://raw.githubusercontent.com/marcuslimav123-cloud/glowupi/claude/stoic-tesla-ownbsp/deploy/setup-stripe-planos.py | python3
#
# Estrutura esperada pelo app (routes/checkout.ts + DirectSales.tsx):
#   - produto.metadata.tier ∈ {1_pro, 2_5_pro, 6_15_pro, 15_plus_pro, single}
#   - nome começando com "Glow Upi"
#   - cada preço com metadata.period ∈ {mensal, semestral, anual}
import json, sys, subprocess
import urllib.request, urllib.parse, urllib.error

ENV = "/etc/glowupi.env"
key = ""
try:
    for line in open(ENV):
        if line.startswith("STRIPE_LIVE_SECRET_KEY="):
            key = line.strip().split("=", 1)[1]
except FileNotFoundError:
    sys.exit(f"Arquivo {ENV} não encontrado — rode na VPS do Glow Upi.")
if not key.startswith("sk_"):
    sys.exit("STRIPE_LIVE_SECRET_KEY não encontrada em /etc/glowupi.env")

API = "https://api.stripe.com/v1"

def req(method, path, data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    r = urllib.request.Request(API + path, data=body, method=method)
    r.add_header("Authorization", "Bearer " + key)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print("ERRO do Stripe:", e.read().decode()[:400])
        sys.exit(1)

# (tier, nome, {periodo: (valor_em_centavos, intervalo, qtd_intervalos)})
# Valores oficiais de TIERS_STATIC em DirectSales.tsx; "single" da oferta PDVD.
PLANOS = [
    ("1_pro",       "Glow Upi 1 Profissional",       {"mensal": (7990,  "month", 1), "semestral": (40680,  "month", 6), "anual": (67080,  "year", 1)}),
    ("2_5_pro",     "Glow Upi 2 a 5 Profissionais",  {"mensal": (10990, "month", 1), "semestral": (55980,  "month", 6), "anual": (92280,  "year", 1)}),
    ("6_15_pro",    "Glow Upi 6 a 15 Profissionais", {"mensal": (16450, "month", 1), "semestral": (83880,  "month", 6), "anual": (138180, "year", 1)}),
    ("15_plus_pro", "Glow Upi +15 Profissionais",    {"mensal": (21990, "month", 1), "semestral": (112080, "month", 6), "anual": (184680, "year", 1)}),
    ("single",      "Glow Upi Acesso Completo",      {"mensal": (9700,  "month", 1)}),
]

produtos = req("GET", "/products?active=true&limit=100")["data"]
por_tier = {}
for p in produtos:
    t = (p.get("metadata") or {}).get("tier")
    if t and t not in por_tier:
        por_tier[t] = p

criados_prod = criados_preco = 0
for tier, nome, precos in PLANOS:
    prod = por_tier.get(tier)
    if prod:
        print(f"[ja existe] {nome} ({prod['id']})")
    else:
        prod = req("POST", "/products", {"name": nome, "metadata[tier]": tier})
        criados_prod += 1
        print(f"[CRIADO]    {nome} ({prod['id']})")
    existentes = req("GET", f"/prices?product={prod['id']}&active=true&limit=100")["data"]
    por_periodo = {(pr.get("metadata") or {}).get("period"): pr for pr in existentes}
    for periodo, (valor, intervalo, qtd) in precos.items():
        if periodo in por_periodo:
            print(f"    [ja existe] preco {periodo}")
            continue
        pr = req("POST", "/prices", {
            "product": prod["id"],
            "unit_amount": str(valor),
            "currency": "brl",
            "recurring[interval]": intervalo,
            "recurring[interval_count]": str(qtd),
            "metadata[period]": periodo,
            "nickname": f"{nome} — {periodo}",
        })
        criados_preco += 1
        print(f"    [CRIADO]    preco {periodo}: R$ {valor/100:,.2f} ({pr['id']})")

print(f"\nResumo: {criados_prod} produtos e {criados_preco} precos criados.")
print("Reiniciando o Glow Upi para sincronizar...")
subprocess.run(["systemctl", "restart", "glowupi-api"], check=False)
print("=== PLANOS DO STRIPE CONFIGURADOS COM SUCESSO ===")
