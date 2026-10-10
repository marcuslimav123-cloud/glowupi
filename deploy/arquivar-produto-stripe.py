#!/usr/bin/env python3
# Arquiva (desativa) um produto antigo no Stripe e os preços dele, para que ele
# não possa mais ser escolhido em novos checkouts. Assinaturas já existentes
# continuam funcionando normalmente.
#
# Uso, na VPS (lê a chave de /etc/glowupi.env):
#   curl -fsSL https://raw.githubusercontent.com/marcuslimav123-cloud/glowupi/claude/stoic-tesla-ownbsp/deploy/arquivar-produto-stripe.py | python3 - prod_XXXXXXXX
import json
import sys
import urllib.parse
import urllib.request

ENV = "/etc/glowupi.env"


def read_key():
    with open(ENV) as f:
        for line in f:
            if line.startswith("STRIPE_LIVE_SECRET_KEY="):
                return line.split("=", 1)[1].strip().strip("'\"")
    sys.exit("STRIPE_LIVE_SECRET_KEY não encontrada em /etc/glowupi.env")


def api(key, path, params=None, data=None):
    url = "https://api.stripe.com/v1/" + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body)
    r.add_header("Authorization", "Bearer " + key)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.load(resp)


def main():
    if len(sys.argv) < 2 or not sys.argv[1].startswith("prod_"):
        sys.exit("Informe o id do produto, ex.: python3 - prod_UKvdekvD2cpRPW")
    pid = sys.argv[1]
    key = read_key()
    prod = api(key, "products/" + pid)
    print(f'Produto: {prod["name"]} ({pid})')
    prices = api(key, "prices", {"product": pid, "limit": 100})["data"]
    ativas = 0
    for pr in prices:
        subs = api(key, "subscriptions", {"price": pr["id"], "status": "active", "limit": 100})["data"]
        ativas += len(subs)
    print(f"Assinaturas ativas usando este produto: {ativas} (continuam funcionando após arquivar)")
    for pr in prices:
        if pr.get("active"):
            api(key, "prices/" + pr["id"], data={"active": "false"})
            print(f'  preço {pr["id"]} arquivado')
    api(key, "products/" + pid, data={"active": "false"})
    print("Produto arquivado. Ele não aparece mais para novas assinaturas.")


if __name__ == "__main__":
    main()
