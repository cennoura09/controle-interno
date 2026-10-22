-- ============================================================================
-- Controle Interno (So Sales) — schema do banco de dados
-- ----------------------------------------------------------------------------
-- PostgreSQL (compatível com Supabase). Este é o contrato que o back-end expõe
-- para o front via src/services/rest.ts. As colunas usam snake_case; a API
-- deve devolvê-las em camelCase para casar com src/lib/types.ts
-- (ex.: assignee_id -> assigneeId, created_at -> createdAt).
--
-- KPIs e agregados (finance/kpis, revenue-series, marketing/kpis, funnel,
-- leads-trend) NÃO são tabelas: a API os calcula a partir destas tabelas
-- (via views ou agregação) e os devolve prontos.
-- ============================================================================

-- --- Tipos (enums) ---------------------------------------------------------
create type role              as enum ('Founder','CEO','CMO','CCO','CFO','COO','Colaborador');
create type sector            as enum ('Marketing','Comercial','Financeiro','Operacional','Executivo');
create type task_status       as enum ('todo','doing','done');
create type task_priority     as enum ('baixa','media','alta','urgente');
create type transaction_type  as enum ('receita','despesa');
create type transaction_source as enum ('gateway','manual');
create type channel_kind      as enum ('organico','pago');

-- --- Usuários / equipe -----------------------------------------------------
create table app_users (
  id        text primary key default gen_random_uuid()::text,
  name      text   not null,
  role      role   not null,
  sector    sector not null,
  title     text   not null,
  initials  text   not null,
  created_at timestamptz not null default now()
);

-- --- Tarefas ---------------------------------------------------------------
create table tasks (
  id            text primary key default gen_random_uuid()::text,
  title         text          not null,
  description   text,
  status        task_status   not null default 'todo',
  priority      task_priority not null default 'media',
  sector        sector        not null,
  assignee_id   text          not null references app_users(id),
  created_by_id text          not null references app_users(id),
  due_date      date,
  created_at    date          not null default current_date
);

create index tasks_assignee_idx on tasks(assignee_id);
create index tasks_sector_idx   on tasks(sector);
create index tasks_status_idx   on tasks(status);

-- --- Financeiro: transações ------------------------------------------------
create table transactions (
  id          text primary key default gen_random_uuid()::text,
  date        date               not null default current_date,
  description text               not null,
  category    text               not null,
  type        transaction_type   not null,
  amount      numeric(14,2)      not null check (amount >= 0),
  source      transaction_source not null default 'manual'
);

create index transactions_date_idx on transactions(date desc);

-- --- Marketing: performance por canal --------------------------------------
create table marketing_channels (
  id        text primary key default gen_random_uuid()::text,
  channel   text         not null,
  kind      channel_kind not null,
  invested  numeric(14,2) not null default 0,
  leads     integer       not null default 0,
  sales     integer       not null default 0,
  revenue   numeric(14,2) not null default 0
);

-- ============================================================================
-- Segurança (Supabase/RLS) — ESQUELETO
-- ----------------------------------------------------------------------------
-- As permissões em src/lib/permissions.ts refletem o que a UI mostra, mas
-- precisam ser impostas no servidor. Com Supabase, habilite RLS e crie
-- políticas equivalentes (um Colaborador só insere tarefa para si; diretor
-- para o próprio setor; CEO/Founder para todos; lançamento financeiro só
-- para Financeiro/global; criação de contas só para diretor/global).
-- ============================================================================
-- alter table app_users          enable row level security;
-- alter table tasks              enable row level security;
-- alter table transactions       enable row level security;
-- alter table marketing_channels enable row level security;
