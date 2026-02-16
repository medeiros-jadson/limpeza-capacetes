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
docker compose up -d --build
```

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

## Uso (desenvolvimento)

1. Acesse `http://localhost:3000`
2. Clique em **Iniciar limpeza** → Instruções → **Pagar com PIX**
3. Na tela de pagamento, use **[Dev] Simular pagamento** para seguir o fluxo sem PIX real
4. A tela de progresso avança conforme eventos enviados pelo ESP32 em `POST /api/machines/[id]/events`
5. Na tela final, envie o feedback

## ESP32

- **Comando (polling):** `GET /api/machines/[id]/next-command` com header `Authorization: Bearer <api_token>` ou `X-Machine-Token: <api_token>`
- **Eventos:** `POST /api/machines/[id]/events` com body `{ "event": "STARTED" | "PORTA_ABERTA" | ... }` e o mesmo token

O token da máquina está em `Machine.apiToken` (no seed: `dev-token-máquina-1`). No firmware, edite `firmware/config_wifi.h`: `MACHINE_ID` deve ser o UUID retornado ao rodar o seed (ou o id da máquina no banco); use o mesmo token em `MACHINE_TOKEN`.

## Variáveis de ambiente

| Variável         | Descrição                          |
|------------------|------------------------------------|
| `DATABASE_URL`   | URL do PostgreSQL                  |
| (futuro) `MP_*`  | Credenciais Mercado Pago para PIX  |

## Tablet / Kiosk

Para uso em tablet em modo kiosk (tela cheia, sem barra de endereço), use um navegador em modo kiosk (ex.: [Fully Kiosk Browser](https://www.fully-kiosk.com/)) e aponte para a URL da aplicação.

## Estrutura

- `app/` – Rotas e páginas (Next.js App Router)
- `app/api/` – Route Handlers (sessões, máquinas, webhook, SSE)
- `lib/entities/` – Entidades TypeORM (Machine, Session, Payment, Feedback)
- `lib/data-source.ts` – Configuração TypeORM
- `lib/events.ts` – Eventos em tempo real (SSE) por sessão
