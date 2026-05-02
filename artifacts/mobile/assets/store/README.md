# Assets para App Store / Google Play

Esta pasta deve conter os ativos finais exigidos pela Apple App Store Connect e Google Play Console antes do envio para review.

## Apple App Store (obrigatório)

### App Icon
- 1024x1024 PNG, sem alpha, sem cantos arredondados
- Arquivo: `app-icon-1024.png`

### Screenshots iOS (mínimo 5 por tamanho exigido em 2024+)

A Apple exige obrigatoriamente os dois tamanhos a seguir, com **no mínimo 5 screenshots** cada:

- **6.9"** (iPhone 16 Pro Max / 15 Pro Max) — 1290 x 2796 pixels (portrait)
- **6.5"** (iPhone 11 Pro Max / XS Max) — 1242 x 2688 ou 1284 x 2778 pixels (portrait)

Tamanhos opcionais (recomendados):
- **6.7"** (iPhone 14 Pro Max) — 1290 x 2796 (idêntico ao 6.9", App Store usa o mesmo arquivo)
- **iPad Pro 12.9"** (3ª geração+) — 2048 x 2732 (somente se o app for marcado como universal)

Cinco telas sugeridas (numerar 01..05):

1. Login (com botão Sign in with Apple visível)
2. Agenda do dia (visão profissional)
3. Comandas (aba "Abertas")
4. Clientes (lista + busca)
5. Paywall / Plano (preços, restaurar compras, termos)

Salvar como:
```
assets/store/ios/6.9/01-login.png
assets/store/ios/6.9/02-agenda.png
assets/store/ios/6.9/03-comandas.png
assets/store/ios/6.9/04-clientes.png
assets/store/ios/6.9/05-paywall.png

assets/store/ios/6.5/01-login.png
... (mesmo padrão, 5 arquivos)
```

## Google Play

### App Icon
- 512x512 PNG (32 bits, com alpha)

### Feature Graphic
- 1024 x 500 PNG/JPG

### Screenshots (mínimo 2, recomendado 4-8)
- Telefone: 16:9 ou 9:16, mínimo 320px

## Texto da listagem (App Store Connect)

Recomendamos preparar (em pt-BR e en-US):

- **Subtítulo** (até 30 caracteres): "Gestão para barbearias"
- **Promotional text** (até 170 caracteres)
- **Description** (até 4000 caracteres) — destacar agenda, comandas, clientes, lembretes, relatórios
- **Keywords** (até 100 caracteres separados por vírgula): `barbearia,salao,agenda,gestao,barber,salon,cliente,comanda`
- **Support URL**: `https://glowupi.com/suporte`
- **Marketing URL**: `https://glowupi.com`
- **Privacy Policy URL**: `https://glowupi.com/legal/privacidade`

## Como capturar (sem dispositivo físico)

```bash
# Abrir no simulador iPhone 16 Pro Max:
pnpm --filter @workspace/mobile exec expo start --ios
# Dentro do simulador: Cmd+S salva PNG na área de trabalho do macOS.
```

## Próximos passos para envio

1. Gerar build de produção: `eas build --platform ios --profile production`
2. Submeter via `eas submit --platform ios --profile production`
3. Anexar screenshots e textos no App Store Connect
4. Anexar `notes-app-review.txt` no campo "App Review Information > Notes"
5. Preencher demo account: `apple.review@glowupi.com` / `AppleReview2026!`
