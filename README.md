# Limpeza de Capacetes

Sistema de limpeza de capacetes com pagamento PIX (Mercado Pago), controle via ESP32 e interface em tablet (PWA).

## Stack

- **Frontend + Backend:** Next.js (App Router)
- **Banco:** PostgreSQL + TypeORM
- **Pagamento:** Mercado Pago PIX (webhook)
- **Hardware:** ESP32 (Wi-Fi, comandos e eventos)

## Pré-requisitos

- Node.js 18+
- PostgreSQL
- Variável `DATABASE_URL` (ex.: `postgresql://user:pass@localhost:5432/limpeza_capacetes`)

## Setup

### Com Docker (recomendado)

Requer Docker e Docker Compose. Sobe PostgreSQL e a aplicação.

```bash
cp .env.example .env   # opcional: edite .env com SEED_SECRET, MP_ACCESS_TOKEN, etc.
docker compose up -d --build
```

O Compose lê as variáveis do `.env` do projeto (SEED_SECRET, MP_ACCESS_TOKEN, MP_PAYER_EMAIL, MP_WEBHOOK_SECRET). Se não houver `.env` ou as variáveis estiverem vazias, a app sobe com PIX mock.

Aguarde o app estar no ar (porta 3000). Criar máquina de teste:

```bash
curl -X POST http://localhost:3000/api/seed
```

Acesse: http://localhost:3000

### Sem Docker

```bash
npm install
cp .env.example .env
# Ajuste DATABASE_URL no .env
npm run dev
```

Criar banco e seed (uma máquina para testes):

```bash
# Criar o banco no PostgreSQL, depois:
curl -X POST http://localhost:3000/api/seed
```

## Tipos de limpeza

É possível cadastrar **tipos de limpeza** (nome, valor em R$, tempo em minutos). Eles aparecem na primeira tela para o usuário escolher; a sessão usa o preço e a duração do tipo. O firmware recebe a duração em segundos na resposta de `GET /api/machines/[id]/next-command` (campo `durationSeconds`) e usa esse valor como duração da fase UV do ciclo.

- **Cadastro no banco (em reais):** após rodar as migrations, use a função `insert_cleaning_type(nome, valor_em_reais, duração_em_segundos)` no PostgreSQL. Exemplos:
  ```sql
  SELECT insert_cleaning_type('Limpeza Básica', 2.60, 360);   -- R$ 2,60, 6 min
  SELECT insert_cleaning_type('Promoção', 0.60, 180);        -- R$ 0,60, 3 min
  SELECT insert_cleaning_type('Limpeza Profunda', 20, 720);  -- R$ 20, 12 min
  ```
  A tabela `cleaning_types` usa a coluna `price` (reais, numeric). A API `GET /api/cleaning-types` lista os tipos; `POST /api/cleaning-types` aceita `price` ou `priceReais` em reais (ex.: 2.60 ou 0.60).
- **Seed:** ao rodar `POST /api/seed`, se não houver tipos cadastrados, são criados três padrão (Básica 6 min R$9, Padrão 8 min R$15, Profunda 12 min R$20).

## Cupons

Cupons são cadastrados no banco (tabela `coupons`): `code` (único, ex.: `PROMO10`), `discount_percent` (0–100), `active` (boolean). Na tela de pagamento, o usuário pode inserir um cupom; se válido, um novo QR Code PIX é gerado com o valor já descontado. Se o desconto for 100%, a sessão é considerada paga e o fluxo segue para a tela de progresso.

**Rodar a migration:** `npm run migration:run` (cria a tabela `coupons`).

**Inserir cupons (exemplo no PostgreSQL):**
```sql
INSERT INTO coupons (id, code, discount_percent, active, created_at)
VALUES (uuid_generate_v4(), 'PROMO10', 10, true, now());   -- 10% de desconto
INSERT INTO coupons (id, code, discount_percent, active, created_at)
VALUES (uuid_generate_v4(), 'GRATIS', 100, true, now());   -- 100% (pula pagamento)
```

## Uso (desenvolvimento)

1. Acesse `http://localhost:3000`
2. Se houver tipos de limpeza, clique em um; a sessão é criada e você é redirecionado para a tela de pagamento.
3. Na tela de pagamento, use **Simular pagamento** (visível só em dev) para seguir o fluxo sem PIX real; na tela de sucesso, use **Simular fechamento** para ir ao progresso.
4. A tela de progresso avança conforme eventos do ESP32 ou, em dev, simulação automática do ciclo.
5. Na tela final, envie o feedback (emoção); o redirecionamento para a Home é automático.

A interface usa tema escuro neon (CLEANCAP), barra superior com data/hora e link para **Perguntas Frequentes** (`/faq`).

## ESP32

- **Comando (polling):** `GET /api/machines/[id]/next-command` com header `Authorization: Bearer <api_token>` ou `X-Machine-Token: <api_token>`. A resposta pode incluir `{ "command": "START_CYCLE", "sessionId": "...", "durationSeconds": 360 }`; quando `durationSeconds` está presente, o firmware usa esse valor (em segundos) como duração da fase UV do ciclo.
- **Eventos:** `POST /api/machines/[id]/events` com body `{ "event": "STARTED" | "PORTA_ABERTA" | ... }` e o mesmo token

O token da máquina está em `Machine.apiToken` (no seed: `dev-token-máquina-1`). No firmware, edite `firmware/config_wifi.h`: `MACHINE_ID` deve ser o UUID retornado ao rodar o seed (ou o id da máquina no banco); use o mesmo token em `MACHINE_TOKEN`.

## Pagamento PIX (Mercado Pago)

Para usar **PIX real**, configure no [painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app):

1. Crie uma aplicação e obtenha o **Access Token** (produção ou teste).
2. Defina no ambiente: `MP_ACCESS_TOKEN=<seu_access_token>`.
3. Em **Webhooks / Notificações**, configure a URL: `https://seu-dominio.com/api/webhooks/mercadopago` e selecione o evento **Pagamentos**. (Se a aplicação não tiver domínio e for acessada só por IP, o webhook não será chamado pelo MP; nesse caso a tela de pagamento usa **polling automático** a cada 4 s em `GET /api/sessions/[id]/payment-status` para detectar aprovação e seguir o fluxo.)
4. (Opcional) `MP_PAYER_EMAIL`: e-mail usado quando o front não envia `payerEmail` (ex.: kiosk). (Opcional) `MP_WEBHOOK_SECRET`: segredo para validar notificações; notificações PIX/QR Code não usam assinatura.

**Sem `MP_ACCESS_TOKEN`** o sistema continua com PIX mock (QR e countdown funcionam, pagamento é simulado em dev).

**Token de teste (TEST-...):** com Access Token de **teste**, o Mercado Pago aprova o PIX automaticamente (não é preciso escanear o QR). O pagamento passa a "approved" em poucos segundos e o polling da tela detecta e redireciona para a próxima etapa.

**Configuração pelo banco de dados:** a tabela `mercadopago_config` armazena `access_token`, `payer_email`, `webhook_secret` e `active`. Se existir uma linha com `active = true` e `access_token` preenchido, essa configuração é usada; caso contrário, o sistema usa as variáveis de ambiente. Rodar a migration: `npm run migration:run`. Atualizar via API: `GET /api/config/mercadopago` (retorna config com token mascarado) e `PATCH /api/config/mercadopago` com body `{ "accessToken": "...", "payerEmail": "...", "webhookSecret": "...", "active": true }`. Ou via SQL: `UPDATE mercadopago_config SET access_token = 'SEU_TOKEN', payer_email = 'email@exemplo.com' WHERE id = (SELECT id FROM mercadopago_config LIMIT 1);`

## Variáveis de ambiente

| Variável           | Descrição                                                |
|--------------------|----------------------------------------------------------|
| `DATABASE_URL`     | URL do PostgreSQL                                        |
| `MP_ACCESS_TOKEN`  | Access Token (fallback se não houver config no banco)  |
| `MP_PAYER_EMAIL`   | E-mail do pagador (fallback)                             |
| `MP_WEBHOOK_SECRET`| Segredo do webhook (fallback)                            |

## Tablet / Kiosk

Para uso em tablet em modo kiosk (tela cheia, sem barra de endereço), use um navegador em modo kiosk (ex.: [Fully Kiosk Browser](https://www.fully-kiosk.com/)) e aponte para a URL da aplicação.

## Estrutura

- `app/` – Rotas e páginas (Next.js App Router)
- `app/api/` – Route Handlers (sessões, máquinas, webhook, SSE)
- `lib/entities/` – Entidades TypeORM (Machine, Session, Payment, Feedback)
- `lib/data-source.ts` – Configuração TypeORM
- `lib/events.ts` – Eventos em tempo real (SSE) por sessão
- `lib/mercadopago.ts` – Cliente Mercado Pago (createPixPayment, getPaymentStatus)

## Funcionalidades implementadas

### Backend e dados

- PostgreSQL + TypeORM: entidades Machine, Session, Payment, Feedback, CleaningType, Coupon
- Migrations para schema inicial, tipos de limpeza e cupons (coupons: code, discount_percent, active)
- API: listagem e status de máquinas; criação de sessão; geração de pagamento PIX (real via Mercado Pago se `MP_ACCESS_TOKEN` configurado, senão mock); aplicação de cupom (`POST /api/sessions/[id]/apply-coupon`) com novo QR ou 100% → PAID; webhook Mercado Pago (confirma status via GET antes de aprovar); SSE para eventos da sessão; feedback; seed; simulação de pagamento (dev)

### Fluxo do usuário

- **Home:** exibe tipos de limpeza (se houver) para seleção, ou preço da máquina; ao clicar no tipo → redireciona para criação de sessão e Pagamento
- **Pagamento:** criado ao escolher tipo na Home; exibe QR PIX (real ou mock), countdown; cupom aplica desconto e gera novo QR ou 100% → Sucesso
- **Pagamento:** exibe PIX (QR Code), countdown; "Inserir Cupom" aplica cupom (desconto %): novo QR com valor final ou 100% → Sucesso. Countdown de expiração, escuta SSE para PAID; em dev, botão “Simular pagamento”
- **Sucesso:** “Pagamento efetuado”; usuário fecha a porta; em dev, “Simular fechamento” → Progresso
- **Progresso:** escuta SSE; etapas Limpeza UV e Finalização; ao FINISHED → Final
- **Final:** feedback por emoção; redirecionamento automático para Home

### Integração com máquina (ESP32)

- Firmware chama `GET /api/machines/:id/next-command` (Bearer/Token) e `POST /api/machines/:id/events`; backend atualiza lastSeenAt e emite eventos no SSE

### UI

- Tema escuro neon (cyan/roxo), fontes Outfit e Source Sans 3, fundo com partículas e scanline, barra superior com data/hora e link FAQ
- Telas: Home, Instruções, Pagamento, Progresso, Final, FAQ, 404; padrões visuais: cards com hud-corner, glow, botões neon
