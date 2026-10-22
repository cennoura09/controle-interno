# Banco de dados

Modelo em PostgreSQL (compatível com Supabase). DDL em
[`../db/schema.sql`](../db/schema.sql); dados de exemplo em
[`../db/seed.sql`](../db/seed.sql). O banco é o lado servidor do contrato de
[MODELO-DE-DADOS.md](MODELO-DE-DADOS.md); a API expõe os
[endpoints da camada de dados](CAMADA-DE-DADOS.md).

## Convenção snake_case ↔ camelCase

As colunas usam `snake_case` (convenção PostgreSQL); a API devolve `camelCase`
(o que o front espera). Mapeamentos:

| Coluna | JSON |
|---|---|
| `assignee_id` | `assigneeId` |
| `created_by_id` | `createdById` |
| `due_date` | `dueDate` |
| `created_at` | `createdAt` |

## Tipos (enums)

`role`, `sector`, `task_status`, `task_priority`, `transaction_type`,
`transaction_source`, `channel_kind` — com os mesmos valores dos enums de
TypeScript (ver [MODELO-DE-DADOS.md](MODELO-DE-DADOS.md)).

## Tabelas

### `app_users`
`id` (text, PK), `name`, `role`, `sector`, `title`, `initials`, `created_at`.
Nome `app_users` evita colidir com `auth.users` do Supabase.

### `tasks`
`id` (PK), `title`, `description?`, `status` (default `todo`),
`priority` (default `media`), `sector`, `assignee_id` → `app_users(id)`,
`created_by_id` → `app_users(id)`, `due_date?`, `created_at` (date).
Índices: `assignee_id`, `sector`, `status`.

### `transactions`
`id` (PK), `date` (default hoje), `description`, `category`, `type`,
`amount` (`numeric(14,2)`, `>= 0`), `source` (default `manual`).
Índice: `date desc`.

### `marketing_channels`
`id` (PK), `channel`, `kind`, `invested`, `leads`, `sales`, `revenue`.

> `id` é `text` com default `gen_random_uuid()::text`, para casar com
> `id: string` do contrato e permitir o seed usar ids legíveis (`u-cfo`, `t-1`).

## Relacionamentos

```
app_users 1 ──< tasks.assignee_id      (responsável)
app_users 1 ──< tasks.created_by_id    (quem atribuiu)
transactions         (sem FK — ledger independente)
marketing_channels   (sem FK)
```

## Agregados não são tabelas

KPIs e séries (`/api/finance/kpis`, `/revenue-series`, `/api/marketing/kpis`,
`/funnel`, `/leads-trend`) são **calculados pela API** a partir das tabelas
(views ou agregação SQL) e devolvidos prontos como `FinanceKpis`,
`MarketingKpis`, `MonthlyPoint[]`, `FunnelStage[]`, `TrendPoint[]`.
No MVP (mock), são valores fixos em `src/data/*`.

## Aplicar no Supabase

1. SQL Editor → cole [`../db/schema.sql`](../db/schema.sql) → Run.
2. (Opcional) cole [`../db/seed.sql`](../db/seed.sql) para dados de exemplo
   (`truncate` + insert; idempotente).
3. Gere a API/edge functions com os [endpoints](CAMADA-DE-DADOS.md) ou use
   PostgREST do Supabase atrás de um backend-for-frontend que respeite as rotas.
4. No front: `VITE_DATA_SOURCE=rest` e `VITE_API_URL=<sua API>`.

Para Postgres puro: `psql "$DATABASE_URL" -f db/schema.sql` e depois `-f db/seed.sql`.

## Segurança (RLS) — pendente

O `schema.sql` traz o esqueleto comentado para habilitar Row Level Security. As
políticas devem espelhar [`src/lib/permissions.ts`](../src/lib/permissions.ts):

- Colaborador insere tarefa só para si; diretor para o próprio setor;
  CEO/Founder para todos.
- Lançamento financeiro só para setor Financeiro ou global.
- Criação de contas só para diretor ou global.

Ver [PERMISSOES.md](PERMISSOES.md) para a lógica completa a reproduzir no servidor.
