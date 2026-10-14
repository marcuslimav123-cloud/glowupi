#!/usr/bin/env python3
# Lista, somente leitura, todos os produtos e preços da conta Stripe do Glow Upi,
# do jeito que o sistema os enxerga (metadata.tier / metadata.period).
#
# Uso, na VPS (lê a chave de /etc/glowupi.env):
#   curl -fsSL https://raw.githubusercontent.com/marcuslimav123-cloud/glowupi/claude/stoic-tesla-ownbsp/deploy/listar-stripe.py | python3
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime

ENV = "/etc/glowupi.env"


def read_key():
    with open(ENV) as f:
        for line in f:
            if line.startswith("STRIPE_LIVE_SECRET_KEY="):
                return line.split("=", 1)[1].strip().strip("'\"")
    sys.exit("STRIPE_LIVE_SECRET_KEY não encontrada em /etc/glowupi.env")


def api(key, path, params=None):
    url = "https://api.stripe.com/v1/" + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    r = urllib.request.Request(url)
    r.add_header("Authorization", "Bearer " + key)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.load(resp)


def brl(cents):
    return "R$ {:,.2f}".format((cents or 0) / 100).replace(",", "X").replace(".", ",").replace("X", ".")


def main():
    key = read_key()
    print("Produtos (ativos e inativos) e seus preços:\n")
    for active in (True, False):
        prods = api(key, "products", {"active": "true" if active else "false", "limit": 100})["data"]
        for p in prods:
            tier = (p.get("metadata") or {}).get("tier") or "-"
            created = datetime.fromtimestamp(p["created"]).strftime("%d/%m/%Y")
            flag = "ATIVO " if active else "inativo"
            print(f"[{flag}] {p['name']}  (id={p['id']}, tier={tier}, criado={created})")
            if p.get("description"):
                print(f"          descrição: {p['description'][:80]}")
            prices = api(key, "prices", {"product": p["id"], "limit": 100})["data"]
            for pr in prices:
                rec = pr.get("recurring") or {}
                interval = f"{rec.get('interval_count', 1)} {rec.get('interval', '-')}" if rec else "avulso"
                period = (pr.get("metadata") or {}).get("period") or "-"
                st = "ativo" if pr.get("active") else "inativo"
                nick = f', apelido="{pr["nickname"]}"' if pr.get("nickname") else ""
                print(f"          preço {pr['id']}: {brl(pr.get('unit_amount'))} a cada {interval}, period={period}, {st}{nick}")
            print()


if __name__ == "__main__":
    main()
