# Assets para App Store / Google Play

Esta pasta deve conter os ativos finais exigidos pela Apple App Store Connect e Google Play Console antes do envio para review.

## Apple App Store (obrigatório)

### App Icon
- 1024x1024 PNG, sem alpha, sem cantos arredondados
- Arquivo: `app-icon-1024.png`

### Screenshots (mínimo 3 por tamanho)
Capturar pelo simulador iOS (Xcode) ou dispositivo real:
- **6.7"** (iPhone 15/14/13 Pro Max) — 1290 x 2796
- **6.5"** (iPhone 11 Pro Max / XS Max) — 1242 x 2688 *ou* 1284 x 2778
- **5.5"** (iPhone 8 Plus) — 1242 x 2208 (opcional, mas recomendado)
- **iPad Pro 12.9"** (3ª geração+) — 2048 x 2732 (somente se app universal)

Telas sugeridas para captura:
1. Login (com Sign in with Apple visível)
2. Dashboard / Agenda do dia
3. Comandas (aba "Abertas")
4. Clientes
5. Paywall (Plano e assinatura)
6. Menu (mostrando itens legais e Excluir conta)

Salvar como:
```
assets/store/ios/6.7/01-login.png
assets/store/ios/6.7/02-agenda.png
...
assets/store/ios/6.5/01-login.png
...
```

## Google Play

### App Icon
- 512x512 PNG (32 bits, com alpha)

### Feature Graphic
- 1024 x 500 PNG/JPG

### Screenshots (mínimo 2)
- Telefone: 16:9 ou 9:16, mínimo 320px
- Tablet 7": opcional
- Tablet 10": opcional

## Texto da listagem (App Store Connect)

Recomendamos preparar (em pt-BR e en-US):

- **Subtítulo** (até 30 caracteres): "Gestão para barbearias"
- **Promotional text** (até 170 caracteres)
- **Description** (até 4000 caracteres) — destacar agenda, comandas, clientes, lembretes, relatórios
- **Keywords** (até 100 caracteres separados por vírgula): `barbearia,salao,agenda,gestao,barber,salon,cliente,comanda`
- **Support URL**: `https://glowupi.com/suporte`
- **Marketing URL**: `https://glowupi.com`
- **Privacy Policy URL**: `https://glowupi.com/legal/privacidade`

## Próximos passos para envio

1. Gerar build de produção: `eas build --platform ios --profile production`
2. Submeter via `eas submit --platform ios --profile production`
3. Anexar screenshots e textos no App Store Connect
4. Anexar `notes-app-review.txt` no campo "App Review Information > Notes"
5. Preencher demo account: `apple.review@glowupi.com` / `AppleReview2026!`
