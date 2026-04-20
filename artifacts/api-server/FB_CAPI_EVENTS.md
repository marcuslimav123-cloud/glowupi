# Facebook CAPI Events

Events sent from the API server to the Meta Conversions API.

| Event name | Trigger | Notes |
|---|---|---|
| `PageView` | Frontend pageview tracking | |
| `Lead` | Lead capture | |
| `InitiateCheckout` | Cliente clica em assinar | |
| `Purchase` | Webhook `checkout.session.completed` (paid) | `eventId = purchase_<session.id>` para deduplicação |
| `CheckoutAbandoned` | Webhook `checkout.session.expired` (não pago) | Custom event. `eventId = abandoned_<session.id>`. Inclui `value`, `currency`, `content_ids` (priceId) e `content_name` quando disponíveis. |

## Configurando otimização no Ads Manager

`CheckoutAbandoned` é um evento **custom**. Para usá-lo em campanhas:

1. Em Eventos do Gerenciador, localize o evento `CheckoutAbandoned` no seu Pixel
   (aparece após o primeiro disparo do webhook).
2. Marque-o como Conversão Customizada se quiser otimizar campanhas para esse
   sinal (Ads Manager → Conversões customizadas → Criar → Origem do evento:
   Pixel → Evento: `CheckoutAbandoned`).
3. Em campanhas de aquisição, use-o como sinal adicional de aprendizado
   (público de retargeting de quem abandonou o checkout, exclusões etc.).

## Playbook de retargeting de checkout abandonado

Passo a passo para reaproveitar o sinal `CheckoutAbandoned` em campanhas. Tudo
acontece no Gerenciador de Eventos / Ads Manager — não exige código novo.

### 1. Validar o evento no Pixel

1. Gerenciador de Eventos → selecione o Pixel da Glow Upi.
2. Aba **Visão geral** → confirme que `CheckoutAbandoned` aparece nos últimos
   eventos recebidos. Se não aparecer, force a expiração de uma sessão de teste
   no Stripe e aguarde até ~30 min (o webhook só dispara quando a sessão
   expira de fato).
3. Em **Test Events**, dispare um checkout de teste e cancele para conferir o
   payload (`value`, `currency`, `content_ids`, `content_name`).

### 2. Criar a Conversão Customizada

1. Ads Manager → **Conversões customizadas** → **Criar conversão customizada**.
2. Configurações:
   - Nome: `CheckoutAbandoned`
   - Descrição: "Sessão de checkout do Stripe expirou sem pagamento"
   - Origem do dado: Pixel da Glow Upi
   - Evento: `CheckoutAbandoned` (custom)
   - Categoria: **Adicionar ao carrinho** (mais próxima semanticamente; ajuda o
     algoritmo a calibrar)
   - Regra: `Todas as URLs` (o evento é server-side, não tem URL associada)
   - Valor: usar o valor do evento (`value` enviado pelo webhook)
3. Salvar. A conversão precisa de ~20 disparos para ficar elegível como
   objetivo de otimização.

### 3. Criar os públicos de retargeting

Ads Manager → **Públicos** → **Criar público** → **Público personalizado** →
**Site** → fonte = Pixel.

Crie três públicos separados (todos com a mesma regra, mudando só a janela):

| Nome do público | Janela | Regra |
|---|---|---|
| `CheckoutAbandoned - 7d` | 7 dias | Evento = `CheckoutAbandoned` |
| `CheckoutAbandoned - 14d` | 14 dias | Evento = `CheckoutAbandoned` |
| `CheckoutAbandoned - 30d` | 30 dias | Evento = `CheckoutAbandoned` |

Também crie um público de **compradores** para usar como exclusão:

| Nome do público | Janela | Regra |
|---|---|---|
| `Purchasers - 180d` | 180 dias | Evento = `Purchase` |

### 4. Campanha de remarketing

1. Ads Manager → **Criar campanha**.
   - Objetivo: **Vendas**
   - Otimização do conjunto de anúncios: **Compra** (não otimize para
     `CheckoutAbandoned` aqui — queremos a compra final)
2. Conjunto de anúncios:
   - Público: incluir `CheckoutAbandoned - 14d`
   - Excluir: `Purchasers - 180d`
   - Posicionamentos: automáticos
   - Orçamento inicial: começar baixo (R$ 30–50/dia) — o público é pequeno
3. Criativos: foco em remoção de objeção (depoimento, garantia, urgência,
   eventual cupom). Variar 2–3 criativos.
4. Frequência: monitorar e capear em ~3–4 impressões/semana via regra
   automatizada para evitar fadiga.

### 5. Excluir abandonadores das campanhas de aquisição

Em **toda** campanha de aquisição (prospecting), no nível do conjunto de
anúncios, adicionar nas exclusões:

- `CheckoutAbandoned - 14d`
- `Purchasers - 180d`

Isso evita gastar verba de topo de funil com quem já está em remarketing
ativo ou já comprou.

### 6. Acompanhamento

- Coluna recomendada nos relatórios: `Compras`, `Custo por compra`,
  `CheckoutAbandoned` (custom), `Frequência`, `ROAS`.
- Revisar semanalmente: se o público de 14d ficar abaixo de ~1.000 pessoas,
  trocar para `CheckoutAbandoned - 30d` para ter volume suficiente para
  entrega.
- Se a conversão customizada parar de receber eventos, checar logs do webhook
  `checkout.session.expired` em `artifacts/api-server/src/webhookHandlers.ts`
  e a saúde do CAPI no Gerenciador de Eventos.
