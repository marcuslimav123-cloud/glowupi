# Ajude o Neném a Nascer

Tablet de doação por Pix pro carro de aplicativo. O mesmo Worker da Cloudflare serve a página (`public/`) e o servidor (`src/worker.js`).

## O que fica onde

| Onde | O quê |
|---|---|
| **Segredos da Cloudflare** (ninguém vê, nem no código) | Token do Mercado Pago (`MP_ACCESS_TOKEN`, ou `MP_TOKEN` do Worker antigo), PIN da configuração (`ADMIN_PIN`) |
| **Banco no servidor** (Durable Object com SQLite) | Configuração (chave Pix, nome do titular, cidade, meta etc.), doações, votos, sessões |
| **Navegador do tablet** | Só o que o passageiro já vê na tela (nomes, gestação, meta, total, placar) e o "pareamento" do tablet |

Proteções:
- A configuração só abre com o PIN. São 5 tentativas a cada 15 minutos, e a sessão vale 30 minutos.
- Um Pix só entra no total depois que o servidor confere direto no Mercado Pago. Pagamentos da sua conta que não vieram do tablet são ignorados.
- O Mercado Pago avisa o servidor (webhook) quando o Pix cai. Assim conta mesmo se o tablet fechar antes.
- O "Já fiz o Pix" (modo reserva, sem Mercado Pago) só soma no total se vier do tablet que você pareou com o PIN.
- Cada Pix dá direito a um palpite (menino/menina).
- A página roda com cabeçalhos de segurança (CSP, sem iframe, sem referrer).

> A chave Pix de reserva aparece dentro do código "copia e cola" sempre que ela é usada. Isso é do próprio Pix, não tem como esconder. Com o Mercado Pago ligado, o QR não mostra a chave.

## Colocar no ar (no seu computador)

Precisa do [Node.js](https://nodejs.org) instalado.

```bash
cd ajude-o-nenem
npm install
npx wrangler login                       # abre o navegador pra entrar na Cloudflare
npx wrangler secret put MP_ACCESS_TOKEN  # cola o Access Token de PRODUÇÃO do Mercado Pago
npx wrangler secret put ADMIN_PIN        # escolhe um PIN (ex.: 6 números)
npx wrangler deploy
```

Antes do `deploy`, troque o `PAYER_EMAIL` no `wrangler.toml` por um e-mail seu. Ele precisa ser diferente do e-mail da conta do Mercado Pago.

O nome do Worker é `ajude-o-nenem`, então ele **substitui** o que está hoje em `https://ajude-o-nenem.marcuslimav123.workers.dev`. Se o Worker antigo guardava o token do Mercado Pago como `MP_TOKEN`, não precisa cadastrar de novo: o servidor também lê esse nome.

## Primeira vez no tablet

1. Abra `https://ajude-o-nenem.marcuslimav123.workers.dev` no tablet.
2. Segure a engrenagem ⚙️ (canto de baixo) por 1,5 s e digite o PIN. Isso também pareia o tablet.
3. Preencha os dados. Em **"Já juntado por fora"**, coloque o total que o tablet antigo mostrava. As doações antigas ficavam no tablet e no Worker antigo e não passam pra cá sozinhas.
4. Salve.

Se perder o tablet, entre no PIN em outro aparelho e toque em **"Desconectar todos os aparelhos"**. Pra trocar o PIN, use `npx wrangler secret put ADMIN_PIN`.

## Desenvolvimento

```bash
npm run dev    # http://localhost:8787 (crie um .dev.vars com MP_ACCESS_TOKEN e ADMIN_PIN)
npm test       # teste de ponta a ponta com um Mercado Pago falso
```
