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
