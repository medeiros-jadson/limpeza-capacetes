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
cp .env.example .env   # opcional: edite .env com SEED_SECRET
docker compose up -d --build
```

O Compose lê o `.env` (ex.: SEED_SECRET). Mercado Pago é configurado só pelo banco (tabela mercadopago_config).

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

A configuração do Mercado Pago é feita **somente pelo banco de dados** (tabela `mercadopago_config`).

1. No [painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app), crie uma aplicação e obtenha o **Access Token** (produção ou teste). A **conta vendedor** precisa ter **chaves PIX cadastradas** para receber PIX; sem isso a API pode retornar 500 ao criar o pagamento.
2. Rode a migration: `npm run migration:run` (cria a tabela `mercadopago_config`).
3. Cadastre o token e o e-mail: **PATCH** `/api/config/mercadopago` com body `{ "accessToken": "SEU_TOKEN", "payerEmail": "email@exemplo.com", "active": true }` ou via SQL: `UPDATE mercadopago_config SET access_token = 'SEU_TOKEN', payer_email = 'email@exemplo.com', active = true WHERE id = (SELECT id FROM mercadopago_config LIMIT 1);`
4. Em **Webhooks / Notificações** no painel MP, configure a URL `https://seu-dominio.com/api/webhooks/mercadopago` e o evento **Pagamentos**. (Sem domínio, use o **polling automático** na tela de pagamento.)

**Sem configuração no banco** (nenhuma linha com `active = true` e `access_token` preenchido), a criação de pagamento retorna erro 503; é obrigatório configurar o Mercado Pago para gerar PIX.

**Token de teste (TEST-...):** no ambiente de teste do MP o pagamento pode ser aprovado automaticamente; o polling detecta e redireciona.

## Variáveis de ambiente

| Variável       | Descrição                 |
|----------------|---------------------------|
| `DATABASE_URL` | URL do PostgreSQL         |
| `SEED_SECRET`  | Opcional; protege /api/seed |

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
- API: listagem e status de máquinas; criação de sessão; geração de pagamento PIX (Mercado Pago; config obrigatória no banco); aplicação de cupom (`POST /api/sessions/[id]/apply-coupon`) com novo QR ou 100% → PAID; webhook Mercado Pago (confirma status via GET antes de aprovar); SSE para eventos da sessão; feedback; seed; simulação de pagamento (dev)

### Fluxo do usuário

- **Home:** exibe tipos de limpeza (se houver) para seleção, ou preço da máquina; ao clicar no tipo → redireciona para criação de sessão e Pagamento
- **Pagamento:** criado ao escolher tipo na Home; exibe QR PIX (Mercado Pago), countdown; cupom aplica desconto e gera novo QR ou 100% → Sucesso
- **Pagamento:** exibe PIX (QR Code), countdown; "Inserir Cupom" aplica cupom (desconto %): novo QR com valor final ou 100% → Sucesso. Countdown de expiração, escuta SSE para PAID; em dev, botão “Simular pagamento”
- **Sucesso:** “Pagamento efetuado”; usuário fecha a porta; em dev, “Simular fechamento” → Progresso
- **Progresso:** escuta SSE; etapas Limpeza UV e Finalização; ao FINISHED → Final
- **Final:** feedback por emoção; redirecionamento automático para Home

### Integração com máquina (ESP32)

- Firmware chama `GET /api/machines/:id/next-command` (Bearer/Token) e `POST /api/machines/:id/events`; backend atualiza lastSeenAt e emite eventos no SSE

### UI

- Tema escuro neon (cyan/roxo), fontes Outfit e Source Sans 3, fundo com partículas e scanline, barra superior com data/hora e link FAQ
- Telas: Home, Instruções, Pagamento, Progresso, Final, FAQ, 404; padrões visuais: cards com hud-corner, glow, botões neon
