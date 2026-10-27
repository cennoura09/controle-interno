-- ============================================================================
-- Controle Interno (So Sales) — Supabase: schema, segurança e API (RPC)
-- ----------------------------------------------------------------------------
-- As tabelas ficam no schema `controle_interno`, SEM acesso direto pelos
-- papéis anon/authenticated (RLS ligado, nenhuma policy). Todo acesso do
-- front passa pelas funções `public.ci_*` (SECURITY DEFINER), que identificam
-- o usuário pela sessão do Supabase Auth (auth.uid()) e REVALIDAM as mesmas
-- regras de src/lib/permissions.ts no servidor.
-- ============================================================================

create schema if not exists controle_interno;
revoke all on schema controle_interno from public, anon, authenticated;

-- --- Tipos -----------------------------------------------------------------
create type controle_interno.role as enum ('Founder','CEO','CMO','CCO','CFO','COO','Colaborador');
create type controle_interno.sector as enum ('Marketing','Comercial','Financeiro','Operacional','Executivo');
create type controle_interno.task_status as enum ('todo','doing','done');
create type controle_interno.task_priority as enum ('baixa','media','alta','urgente');
create type controle_interno.transaction_type as enum ('receita','despesa');
create type controle_interno.transaction_source as enum ('gateway','manual');
create type controle_interno.channel_kind as enum ('organico','pago');

-- --- Tabelas ---------------------------------------------------------------
create table controle_interno.app_users (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  role           controle_interno.role not null,
  sector         controle_interno.sector not null,
  title          text not null,
  initials       text not null,
  email          text unique,
  auth_user_id   uuid unique references auth.users(id) on delete set null,
  is_super_admin boolean not null default false,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table controle_interno.tasks (
  id            text primary key default gen_random_uuid()::text,
  title         text not null,
  description   text,
  status        controle_interno.task_status not null default 'todo',
  priority      controle_interno.task_priority not null default 'media',
  sector        controle_interno.sector not null,
  assignee_id   text not null references controle_interno.app_users(id),
  created_by_id text not null references controle_interno.app_users(id),
  due_date      date,
  created_at    date not null default current_date
);
create index tasks_assignee_idx on controle_interno.tasks(assignee_id);
create index tasks_sector_idx   on controle_interno.tasks(sector);
create index tasks_status_idx   on controle_interno.tasks(status);
create index tasks_creator_idx  on controle_interno.tasks(created_by_id);

create table controle_interno.transactions (
  id          text primary key default gen_random_uuid()::text,
  date        date not null default current_date,
  description text not null,
  category    text not null,
  type        controle_interno.transaction_type not null,
  amount      numeric(14,2) not null check (amount >= 0),
  source      controle_interno.transaction_source not null default 'manual',
  created_by_id text references controle_interno.app_users(id)
);
create index transactions_date_idx on controle_interno.transactions(date desc);
create index transactions_creator_idx on controle_interno.transactions(created_by_id);

-- Performance por canal, por mês (month = 1º dia do mês).
create table controle_interno.marketing_channels (
  id       text primary key default gen_random_uuid()::text,
  month    date not null,
  channel  text not null,
  kind     controle_interno.channel_kind not null,
  invested numeric(14,2) not null default 0,
  leads    integer not null default 0,
  sales    integer not null default 0,
  revenue  numeric(14,2) not null default 0,
  unique (month, channel)
);

create table controle_interno.funnel_stages (
  month    date not null,
  position integer not null,
  stage    text not null,
  value    integer not null default 0,
  primary key (month, position)
);

create table controle_interno.leads_daily (
  day   date primary key,
  value integer not null default 0
);

-- Indicadores que ainda não vêm de integração (ex.: inadimplência do gateway).
create table controle_interno.settings (
  key   text primary key,
  value numeric not null
);

alter table controle_interno.app_users          enable row level security;
alter table controle_interno.tasks              enable row level security;
alter table controle_interno.transactions       enable row level security;
alter table controle_interno.marketing_channels enable row level security;
alter table controle_interno.funnel_stages      enable row level security;
alter table controle_interno.leads_daily        enable row level security;
alter table controle_interno.settings           enable row level security;

-- ============================================================================
-- Helpers internos (não expostos)
-- ============================================================================

-- Membro ativo vinculado à sessão atual. Erro se não houver.
create function controle_interno.me()
returns controle_interno.app_users
language plpgsql stable security definer set search_path = ''
as $$
declare u controle_interno.app_users;
begin
  select * into u from controle_interno.app_users
   where auth_user_id = auth.uid() and active;
  if u.id is null then
    raise exception 'Acesso negado: sua conta não tem acesso ao Controle Interno.'
      using errcode = '42501';
  end if;
  return u;
end $$;

create function controle_interno.is_global(u controle_interno.app_users)
returns boolean language sql immutable set search_path = ''
as $$ select u.is_super_admin or u.role in ('CEO','Founder') $$;

create function controle_interno.directed_sector(u controle_interno.app_users)
returns controle_interno.sector language sql immutable set search_path = ''
as $$
  select case u.role
    when 'CMO' then 'Marketing'::controle_interno.sector
    when 'CCO' then 'Comercial'::controle_interno.sector
    when 'CFO' then 'Financeiro'::controle_interno.sector
    when 'COO' then 'Operacional'::controle_interno.sector
  end
$$;

create function controle_interno.can_assign(me controle_interno.app_users, target controle_interno.app_users)
returns boolean language sql immutable set search_path = ''
as $$
  select controle_interno.is_global(me)
      or target.id = me.id
      or (controle_interno.directed_sector(me) is not null
          and target.sector = controle_interno.directed_sector(me))
$$;

create function controle_interno.user_json(u controle_interno.app_users)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_build_object(
    'id', u.id, 'name', u.name, 'role', u.role, 'sector', u.sector,
    'title', u.title, 'initials', u.initials, 'email', u.email,
    'isSuperAdmin', u.is_super_admin, 'active', u.active)
$$;

create function controle_interno.task_json(t controle_interno.tasks)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', t.id, 'title', t.title, 'description', t.description,
    'status', t.status, 'priority', t.priority, 'sector', t.sector,
    'assigneeId', t.assignee_id, 'createdById', t.created_by_id,
    'dueDate', t.due_date, 'createdAt', t.created_at))
$$;

create function controle_interno.tx_json(t controle_interno.transactions)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id, 'date', t.date, 'description', t.description,
    'category', t.category, 'type', t.type, 'amount', t.amount,
    'source', t.source)
$$;

create function controle_interno.initials(name text)
returns text language sql immutable set search_path = ''
as $$
  with p as (select regexp_split_to_array(trim(name), '\s+') a)
  select case
    when coalesce(array_length(a,1),0) = 0 or a[1] = '' then '?'
    when array_length(a,1) = 1 then upper(left(a[1], 2))
    else upper(left(a[1],1) || left(a[array_length(a,1)],1))
  end from p
$$;

create function controle_interno.delta(cur numeric, prev numeric)
returns numeric language sql immutable set search_path = ''
as $$ select case when coalesce(prev,0) = 0 then 0 else round((cur - prev) / prev, 4) end $$;

-- Cria um login no Supabase Auth (e-mail confirmado) e devolve o id.
create function controle_interno.create_auth_user(p_email text, p_password text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := gen_random_uuid();
begin
  if length(coalesce(p_password,'')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.';
  end if;
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'Já existe um login com o e-mail %.', p_email;
  end if;
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    lower(p_email), extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"],"app":"controle-interno"}'::jsonb,
    '{}'::jsonb, now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now(), now()
  );
  return uid;
end $$;
revoke all on function controle_interno.create_auth_user(text, text) from public, anon, authenticated;

-- ============================================================================
-- API pública (RPC) — chamada pelo front via supabase.rpc('ci_*')
-- ============================================================================

-- ---- Sessão / equipe ------------------------------------------------------
create function public.ci_me()
returns jsonb language sql stable security definer set search_path = ''
as $$ select controle_interno.user_json(controle_interno.me()) $$;

create function public.ci_list_users()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  return coalesce((
    select jsonb_agg(controle_interno.user_json(u) order by u.created_at, u.name)
      from controle_interno.app_users u
     where u.active or me.is_super_admin), '[]'::jsonb);
end $$;

create function public.ci_create_user(
  p_name text, p_role text, p_sector text, p_title text default null,
  p_email text default null, p_password text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me controle_interno.app_users := controle_interno.me();
  v_role controle_interno.role := p_role::controle_interno.role;
  v_sector controle_interno.sector;
  v_auth uuid;
  u controle_interno.app_users;
begin
  if trim(coalesce(p_name,'')) = '' then raise exception 'Informe o nome.'; end if;

  -- Setor automático para diretoria/executivo.
  v_sector := case v_role
    when 'CEO' then 'Executivo' when 'Founder' then 'Executivo'
    when 'CMO' then 'Marketing' when 'CCO' then 'Comercial'
    when 'CFO' then 'Financeiro' when 'COO' then 'Operacional'
    else p_sector::controle_interno.sector end;

  if controle_interno.is_global(me) then
    if v_role = 'Colaborador' and v_sector = 'Executivo' then
      raise exception 'Colaboradores pertencem a um setor operacional.';
    end if;
  elsif controle_interno.directed_sector(me) is not null then
    if v_role not in (me.role, 'Colaborador') or v_sector <> controle_interno.directed_sector(me) then
      raise exception 'Você só cria contas de % ou Colaborador no setor %.',
        me.role, controle_interno.directed_sector(me) using errcode = '42501';
    end if;
  else
    raise exception 'Apenas diretores e CEO/Founder criam contas.' using errcode = '42501';
  end if;

  if coalesce(trim(p_email),'') <> '' then
    v_auth := controle_interno.create_auth_user(trim(p_email), p_password);
  end if;

  insert into controle_interno.app_users (name, role, sector, title, initials, email, auth_user_id)
  values (trim(p_name), v_role, v_sector, coalesce(nullif(trim(p_title),''), v_role::text),
          controle_interno.initials(p_name), nullif(lower(trim(p_email)),''), v_auth)
  returning * into u;
  return controle_interno.user_json(u);
end $$;

-- Somente admin supremo: ativa/desativa membro.
create function public.ci_set_user_active(p_id text, p_active boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); u controle_interno.app_users;
begin
  if not me.is_super_admin then
    raise exception 'Apenas o admin supremo altera o status de contas.' using errcode = '42501';
  end if;
  if p_id = me.id then raise exception 'Você não pode desativar a própria conta.'; end if;
  update controle_interno.app_users set active = p_active where id = p_id returning * into u;
  if u.id is null then raise exception 'Membro não encontrado.'; end if;
  return controle_interno.user_json(u);
end $$;

-- Somente admin supremo: redefine (ou cria) o login de um membro.
create function public.ci_set_user_login(p_id text, p_email text, p_password text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); u controle_interno.app_users;
begin
  if not me.is_super_admin then
    raise exception 'Apenas o admin supremo gerencia logins.' using errcode = '42501';
  end if;
  select * into u from controle_interno.app_users where id = p_id;
  if u.id is null then raise exception 'Membro não encontrado.'; end if;
  if length(coalesce(p_password,'')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.';
  end if;
  if u.auth_user_id is not null then
    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           updated_at = now()
     where id = u.auth_user_id;
  else
    update controle_interno.app_users
       set auth_user_id = controle_interno.create_auth_user(trim(p_email), p_password),
           email = lower(trim(p_email))
     where id = p_id returning * into u;
  end if;
  return controle_interno.user_json(u);
end $$;

-- ---- Tarefas --------------------------------------------------------------
create function public.ci_list_tasks()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform controle_interno.me();
  return coalesce((
    select jsonb_agg(controle_interno.task_json(t) order by t.created_at desc, t.id desc)
      from controle_interno.tasks t), '[]'::jsonb);
end $$;

-- p_tasks: array de NewTask (camelCase). Uma tarefa por item.
create function public.ci_create_tasks(p_tasks jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me controle_interno.app_users := controle_interno.me();
  item jsonb;
  target controle_interno.app_users;
  creator text;
  t controle_interno.tasks;
  result jsonb := '[]'::jsonb;
begin
  for item in select * from jsonb_array_elements(p_tasks) loop
    if trim(coalesce(item->>'title','')) = '' then raise exception 'Informe o título.'; end if;
    select * into target from controle_interno.app_users
     where id = item->>'assigneeId' and active;
    if target.id is null then raise exception 'Responsável inválido.'; end if;
    if not controle_interno.can_assign(me, target) then
      raise exception 'Você não pode atribuir tarefas para %.', target.name using errcode = '42501';
    end if;
    -- O criador é sempre quem está logado (admin supremo pode registrar em nome de outro).
    creator := case when me.is_super_admin then coalesce(item->>'createdById', me.id) else me.id end;
    insert into controle_interno.tasks (title, description, priority, sector, assignee_id, created_by_id, due_date)
    values (trim(item->>'title'), nullif(trim(item->>'description'),''),
            coalesce(item->>'priority','media')::controle_interno.task_priority,
            coalesce(item->>'sector', target.sector::text)::controle_interno.sector,
            target.id, creator, nullif(item->>'dueDate','')::date)
    returning * into t;
    result := result || jsonb_build_array(controle_interno.task_json(t));
  end loop;
  return result;
end $$;

create function public.ci_update_task_status(p_id text, p_status text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); t controle_interno.tasks;
begin
  select * into t from controle_interno.tasks where id = p_id;
  if t.id is null then raise exception 'Tarefa % não encontrada.', p_id; end if;
  if not (controle_interno.is_global(me) or t.assignee_id = me.id or t.created_by_id = me.id
          or t.sector = controle_interno.directed_sector(me)) then
    raise exception 'Você não pode mover esta tarefa.' using errcode = '42501';
  end if;
  update controle_interno.tasks set status = p_status::controle_interno.task_status
   where id = p_id returning * into t;
  return controle_interno.task_json(t);
end $$;

create function public.ci_delete_task(p_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); t controle_interno.tasks;
begin
  select * into t from controle_interno.tasks where id = p_id;
  if t.id is null then raise exception 'Tarefa % não encontrada.', p_id; end if;
  if not (controle_interno.is_global(me) or t.created_by_id = me.id
          or t.sector = controle_interno.directed_sector(me)) then
    raise exception 'Você não pode excluir esta tarefa.' using errcode = '42501';
  end if;
  delete from controle_interno.tasks where id = p_id;
end $$;

-- ---- Financeiro -----------------------------------------------------------
create function public.ci_finance_kpis()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  m date := date_trunc('month', current_date)::date;
  p date := (date_trunc('month', current_date) - interval '1 month')::date;
  rc numeric; rp numeric; dc numeric; dp numeric; mrr numeric;
  sc numeric; sp numeric;
begin
  perform controle_interno.me();
  select coalesce(sum(amount) filter (where type='receita' and date >= m),0),
         coalesce(sum(amount) filter (where type='receita' and date >= p and date < m),0),
         coalesce(sum(amount) filter (where type='despesa' and date >= m),0),
         coalesce(sum(amount) filter (where type='despesa' and date >= p and date < m),0),
         coalesce(sum(amount) filter (where type='receita' and category ilike 'Receita recorrente%' and date >= m),0)
    into rc, rp, dc, dp, mrr
    from controle_interno.transactions where date >= p;
  -- Ticket médio = faturamento / vendas do mês (vendas vêm do marketing).
  select coalesce(sum(sales) filter (where month = m),0),
         coalesce(sum(sales) filter (where month = p),0)
    into sc, sp from controle_interno.marketing_channels where month in (m, p);
  return jsonb_build_object(
    'faturamento', rc, 'faturamentoDelta', controle_interno.delta(rc, rp),
    'despesas', dc, 'despesasDelta', controle_interno.delta(dc, dp),
    'lucroLiquido', rc - dc, 'lucroDelta', controle_interno.delta(rc - dc, rp - dp),
    'ticketMedio', case when sc > 0 then round(rc / sc, 2) else 0 end,
    'ticketDelta', controle_interno.delta(
        case when sc > 0 then rc / sc else 0 end,
        case when sp > 0 then rp / sp else 0 end),
    'mrr', mrr,
    'inadimplencia', coalesce((select value from controle_interno.settings where key = 'inadimplencia'), 0));
end $$;

create function public.ci_revenue_series()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform controle_interno.me();
  return (
    select jsonb_agg(jsonb_build_object(
             'month', (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from s.m)::int],
             'receita', s.receita, 'despesa', s.despesa)
           order by s.m)
      from (
        select g.m,
               coalesce(sum(t.amount) filter (where t.type='receita'),0) as receita,
               coalesce(sum(t.amount) filter (where t.type='despesa'),0) as despesa
          from generate_series(date_trunc('month', current_date) - interval '5 months',
                               date_trunc('month', current_date), interval '1 month') as g(m)
          left join controle_interno.transactions t
            on date_trunc('month', t.date) = g.m
         group by g.m
      ) s
  );
end $$;

create function public.ci_list_transactions()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform controle_interno.me();
  return coalesce((
    select jsonb_agg(controle_interno.tx_json(t) order by t.date desc, t.id desc)
      from controle_interno.transactions t), '[]'::jsonb);
end $$;

create function public.ci_create_transaction(
  p_description text, p_category text, p_type text, p_amount numeric,
  p_date date default null, p_source text default 'manual')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); t controle_interno.transactions;
begin
  if not (controle_interno.is_global(me) or me.sector = 'Financeiro') then
    raise exception 'Apenas o setor Financeiro e CEO/Founder lançam no financeiro.' using errcode = '42501';
  end if;
  if trim(coalesce(p_description,'')) = '' then raise exception 'Informe a descrição.'; end if;
  if coalesce(p_amount,0) <= 0 then raise exception 'Informe um valor maior que zero.'; end if;
  insert into controle_interno.transactions (date, description, category, type, amount, source, created_by_id)
  values (coalesce(p_date, current_date), trim(p_description),
          coalesce(nullif(trim(p_category),''), 'Outros'),
          p_type::controle_interno.transaction_type, p_amount,
          coalesce(p_source,'manual')::controle_interno.transaction_source, me.id)
  returning * into t;
  return controle_interno.tx_json(t);
end $$;

-- ---- Marketing ------------------------------------------------------------
create function public.ci_marketing_kpis()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  m date := date_trunc('month', current_date)::date;
  p date := (date_trunc('month', current_date) - interval '1 month')::date;
  lc numeric; lp numeric; ic numeric; ip numeric; sc numeric; sp numeric;
  pc numeric; pp numeric; -- receita de canais pagos
begin
  perform controle_interno.me();
  select coalesce(sum(leads) filter (where month=m),0), coalesce(sum(leads) filter (where month=p),0),
         coalesce(sum(invested) filter (where month=m),0), coalesce(sum(invested) filter (where month=p),0),
         coalesce(sum(sales) filter (where month=m),0), coalesce(sum(sales) filter (where month=p),0),
         coalesce(sum(revenue) filter (where month=m and kind='pago'),0),
         coalesce(sum(revenue) filter (where month=p and kind='pago'),0)
    into lc, lp, ic, ip, sc, sp, pc, pp
    from controle_interno.marketing_channels where month in (m, p);
  return jsonb_build_object(
    'leads', lc, 'leadsDelta', controle_interno.delta(lc, lp),
    'cpl', case when lc > 0 then round(ic / lc, 2) else 0 end,
    'cplDelta', controle_interno.delta(case when lc>0 then ic/lc else 0 end, case when lp>0 then ip/lp else 0 end),
    'investimento', ic, 'investimentoDelta', controle_interno.delta(ic, ip),
    'roas', case when ic > 0 then round(pc / ic, 2) else 0 end,
    'roasDelta', controle_interno.delta(case when ic>0 then pc/ic else 0 end, case when ip>0 then pp/ip else 0 end),
    'vendas', sc, 'vendasDelta', controle_interno.delta(sc, sp),
    'cac', case when sc > 0 then round(ic / sc, 2) else 0 end,
    'cacDelta', controle_interno.delta(case when sc>0 then ic/sc else 0 end, case when sp>0 then ip/sp else 0 end),
    'conversao', case when lc > 0 then round(sc / lc, 4) else 0 end,
    'conversaoDelta', round(case when lc>0 then sc/lc else 0 end - case when lp>0 then sp/lp else 0 end, 4));
end $$;

create function public.ci_list_channels()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform controle_interno.me();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id, 'channel', c.channel, 'kind', c.kind, 'invested', c.invested,
             'leads', c.leads, 'sales', c.sales, 'revenue', c.revenue)
           order by c.revenue desc)
      from controle_interno.marketing_channels c
     where c.month = date_trunc('month', current_date)::date), '[]'::jsonb);
end $$;

create function public.ci_funnel()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform controle_interno.me();
  return coalesce((
    select jsonb_agg(jsonb_build_object('stage', f.stage, 'value', f.value) order by f.position)
      from controle_interno.funnel_stages f
     where f.month = date_trunc('month', current_date)::date), '[]'::jsonb);
end $$;

create function public.ci_leads_trend()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform controle_interno.me();
  return coalesce((
    select jsonb_agg(jsonb_build_object('day', to_char(l.day, 'DD'), 'value', l.value) order by l.day)
      from controle_interno.leads_daily l
     where l.day >= date_trunc('month', current_date)::date), '[]'::jsonb);
end $$;

-- ---- Grants: só usuários autenticados chamam a API ------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where (n.nspname = 'public' and p.proname like 'ci\_%')
        or n.nspname = 'controle_interno'
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
  end loop;
  for f in
    select p.oid::regprocedure as sig from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'ci\_%'
  loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
