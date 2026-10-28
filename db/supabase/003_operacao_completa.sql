-- ============================================================================
-- 003 — Operação completa: detalhes de tarefa (checklist, comentários,
-- anexos, histórico, tags), notificações, presença, edição de marketing,
-- financeiro e perfil. Rode após 001/002.
-- ============================================================================

-- --- Tarefas: novas colunas ------------------------------------------------
alter table controle_interno.tasks
  add column if not exists tags text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz;

alter table controle_interno.app_users
  add column if not exists last_seen_at timestamptz;

-- Excluir tarefa remove tudo o que é dela.
create table controle_interno.task_checklist (
  id          text primary key default gen_random_uuid()::text,
  task_id     text not null references controle_interno.tasks(id) on delete cascade,
  text        text not null,
  done        boolean not null default false,
  due_date    date,
  assignee_id text references controle_interno.app_users(id) on delete set null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index task_checklist_task_idx on controle_interno.task_checklist(task_id);

create table controle_interno.task_comments (
  id         text primary key default gen_random_uuid()::text,
  task_id    text not null references controle_interno.tasks(id) on delete cascade,
  author_id  text not null references controle_interno.app_users(id),
  body       text not null,
  created_at timestamptz not null default now()
);
create index task_comments_task_idx on controle_interno.task_comments(task_id);

-- Anexos guardados no próprio banco (até 8 MB cada).
create table controle_interno.task_files (
  id          text primary key default gen_random_uuid()::text,
  task_id     text not null references controle_interno.tasks(id) on delete cascade,
  uploader_id text not null references controle_interno.app_users(id),
  name        text not null,
  mime        text not null default 'application/octet-stream',
  size        integer not null,
  content     bytea not null,
  created_at  timestamptz not null default now()
);
create index task_files_task_idx on controle_interno.task_files(task_id);

create table controle_interno.task_activity (
  id         bigserial primary key,
  task_id    text not null references controle_interno.tasks(id) on delete cascade,
  actor_id   text references controle_interno.app_users(id) on delete set null,
  action     text not null,
  created_at timestamptz not null default now()
);
create index task_activity_task_idx on controle_interno.task_activity(task_id, created_at desc);

create table controle_interno.notifications (
  id         bigserial primary key,
  user_id    text not null references controle_interno.app_users(id) on delete cascade,
  actor_id   text references controle_interno.app_users(id) on delete set null,
  task_id    text references controle_interno.tasks(id) on delete cascade,
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on controle_interno.notifications(user_id, created_at desc);

alter table controle_interno.task_checklist enable row level security;
alter table controle_interno.task_comments  enable row level security;
alter table controle_interno.task_files     enable row level security;
alter table controle_interno.task_activity  enable row level security;
alter table controle_interno.notifications  enable row level security;

-- ============================================================================
-- Helpers
-- ============================================================================

create or replace function controle_interno.status_label(s controle_interno.task_status)
returns text language sql immutable set search_path = ''
as $$ select case s when 'todo' then 'A fazer' when 'doing' then 'Em andamento' else 'Concluída' end $$;

create or replace function controle_interno.priority_label(p controle_interno.task_priority)
returns text language sql immutable set search_path = ''
as $$ select case p when 'baixa' then 'Baixa' when 'media' then 'Média' when 'alta' then 'Alta' else 'Urgente' end $$;

-- Pode editar/mover: global, responsável, criador ou diretor do setor.
create or replace function controle_interno.can_edit_task(me controle_interno.app_users, t controle_interno.tasks)
returns boolean language sql immutable set search_path = ''
as $$
  select controle_interno.is_global(me) or t.assignee_id = me.id or t.created_by_id = me.id
      or t.sector = controle_interno.directed_sector(me)
$$;

create or replace function controle_interno.log_activity(p_task text, p_actor text, p_action text)
returns void language sql security definer set search_path = ''
as $$ insert into controle_interno.task_activity (task_id, actor_id, action) values (p_task, p_actor, p_action) $$;

create or replace function controle_interno.notify(p_user text, p_actor text, p_task text, p_body text)
returns void language sql security definer set search_path = ''
as $$
  insert into controle_interno.notifications (user_id, actor_id, task_id, body)
  select p_user, p_actor, p_task, p_body where p_user is not null and p_user is distinct from p_actor
$$;

create or replace function controle_interno.user_json(u controle_interno.app_users)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_build_object(
    'id', u.id, 'name', u.name, 'role', u.role, 'sector', u.sector,
    'title', u.title, 'initials', u.initials, 'email', u.email,
    'isSuperAdmin', u.is_super_admin, 'active', u.active,
    'lastSeenAt', u.last_seen_at)
$$;

create or replace function controle_interno.task_json(t controle_interno.tasks)
returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', t.id, 'title', t.title, 'description', t.description,
    'status', t.status, 'priority', t.priority, 'sector', t.sector,
    'assigneeId', t.assignee_id, 'createdById', t.created_by_id,
    'dueDate', t.due_date, 'createdAt', t.created_at,
    'updatedAt', t.updated_at, 'completedAt', t.completed_at,
    'tags', to_jsonb(t.tags),
    'checklistTotal', (select count(*) from controle_interno.task_checklist c where c.task_id = t.id),
    'checklistDone', (select count(*) from controle_interno.task_checklist c where c.task_id = t.id and c.done),
    'commentCount', (select count(*) from controle_interno.task_comments c where c.task_id = t.id),
    'fileCount', (select count(*) from controle_interno.task_files f where f.task_id = t.id)))
$$;

-- Muda o status registrando histórico e avisando os envolvidos.
create or replace function controle_interno.apply_status(
  me controle_interno.app_users, t controle_interno.tasks, p_status controle_interno.task_status)
returns controle_interno.tasks
language plpgsql security definer set search_path = ''
as $$
declare r controle_interno.tasks;
begin
  if t.status = p_status then return t; end if;
  update controle_interno.tasks
     set status = p_status, updated_at = now(),
         completed_at = case when p_status = 'done' then now() else null end
   where id = t.id returning * into r;
  perform controle_interno.log_activity(t.id, me.id, 'moveu para ' || controle_interno.status_label(p_status));
  perform controle_interno.notify(t.assignee_id, me.id, t.id,
    me.name || ' moveu "' || t.title || '" para ' || controle_interno.status_label(p_status));
  if t.created_by_id <> t.assignee_id then
    perform controle_interno.notify(t.created_by_id, me.id, t.id,
      me.name || ' moveu "' || t.title || '" para ' || controle_interno.status_label(p_status));
  end if;
  return r;
end $$;

-- ============================================================================
-- Sessão / presença
-- ============================================================================

create or replace function public.ci_me()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  update controle_interno.app_users set last_seen_at = now() where id = me.id returning * into me;
  return controle_interno.user_json(me);
end $$;

create or replace function public.ci_heartbeat()
returns void language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  update controle_interno.app_users set last_seen_at = now() where id = me.id;
end $$;

create or replace function public.ci_update_profile(p_name text, p_title text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  if trim(coalesce(p_name,'')) = '' then raise exception 'Informe o nome.'; end if;
  update controle_interno.app_users
     set name = trim(p_name), title = coalesce(nullif(trim(p_title),''), title),
         initials = controle_interno.initials(p_name)
   where id = me.id returning * into me;
  return controle_interno.user_json(me);
end $$;

-- CEO/Founder/admin: edita nome, cargo e setor de um membro.
create or replace function public.ci_update_user(p_id text, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); u controle_interno.app_users;
begin
  if not controle_interno.is_global(me) then
    raise exception 'Apenas CEO/Founder editam membros.' using errcode = '42501';
  end if;
  select * into u from controle_interno.app_users where id = p_id;
  if u.id is null then raise exception 'Membro não encontrado.'; end if;
  if u.is_super_admin and not me.is_super_admin then
    raise exception 'Apenas o admin supremo edita esta conta.' using errcode = '42501';
  end if;
  update controle_interno.app_users set
    name = coalesce(nullif(trim(p_patch->>'name'),''), name),
    initials = case when nullif(trim(p_patch->>'name'),'') is not null
                    then controle_interno.initials(p_patch->>'name') else initials end,
    title = coalesce(nullif(trim(p_patch->>'title'),''), title),
    role = coalesce((p_patch->>'role')::controle_interno.role, role),
    sector = coalesce((p_patch->>'sector')::controle_interno.sector, sector)
  where id = p_id returning * into u;
  return controle_interno.user_json(u);
end $$;

-- ============================================================================
-- Tarefas
-- ============================================================================

create or replace function public.ci_create_tasks(p_tasks jsonb)
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
    creator := case when me.is_super_admin then coalesce(item->>'createdById', me.id) else me.id end;
    insert into controle_interno.tasks (title, description, status, priority, sector, assignee_id, created_by_id, due_date, tags)
    values (trim(item->>'title'), nullif(trim(item->>'description'),''),
            coalesce(nullif(item->>'status',''),'todo')::controle_interno.task_status,
            coalesce(item->>'priority','media')::controle_interno.task_priority,
            coalesce(item->>'sector', target.sector::text)::controle_interno.sector,
            target.id, creator, nullif(item->>'dueDate','')::date,
            coalesce((select array_agg(distinct trim(x)) from jsonb_array_elements_text(coalesce(item->'tags','[]'::jsonb)) x where trim(x) <> ''), '{}'))
    returning * into t;
    perform controle_interno.log_activity(t.id, me.id, 'criou a tarefa');
    perform controle_interno.notify(target.id, me.id, t.id, me.name || ' atribuiu a você "' || t.title || '"');
    result := result || jsonb_build_array(controle_interno.task_json(t));
  end loop;
  return result;
end $$;

create or replace function public.ci_update_task_status(p_id text, p_status text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); t controle_interno.tasks;
begin
  select * into t from controle_interno.tasks where id = p_id;
  if t.id is null then raise exception 'Tarefa % não encontrada.', p_id; end if;
  if not controle_interno.can_edit_task(me, t) then
    raise exception 'Você não pode mover esta tarefa.' using errcode = '42501';
  end if;
  t := controle_interno.apply_status(me, t, p_status::controle_interno.task_status);
  return controle_interno.task_json(t);
end $$;

-- Edição parcial: title, description, priority, sector, assigneeId, dueDate, tags, status.
create or replace function public.ci_update_task(p_id text, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me controle_interno.app_users := controle_interno.me();
  t controle_interno.tasks;
  target controle_interno.app_users;
  v_sector controle_interno.sector;
  v_priority controle_interno.task_priority;
  v_due date;
begin
  select * into t from controle_interno.tasks where id = p_id;
  if t.id is null then raise exception 'Tarefa % não encontrada.', p_id; end if;
  if not controle_interno.can_edit_task(me, t) then
    raise exception 'Você não pode editar esta tarefa.' using errcode = '42501';
  end if;

  if p_patch ? 'title' and trim(coalesce(p_patch->>'title','')) <> t.title then
    if trim(coalesce(p_patch->>'title','')) = '' then raise exception 'Informe o título.'; end if;
    update controle_interno.tasks set title = trim(p_patch->>'title') where id = t.id;
    perform controle_interno.log_activity(t.id, me.id, 'renomeou a tarefa');
  end if;

  if p_patch ? 'description' and nullif(trim(coalesce(p_patch->>'description','')),'') is distinct from t.description then
    update controle_interno.tasks set description = nullif(trim(coalesce(p_patch->>'description','')),'') where id = t.id;
    perform controle_interno.log_activity(t.id, me.id, 'editou a descrição');
  end if;

  if p_patch ? 'priority' then
    v_priority := (p_patch->>'priority')::controle_interno.task_priority;
    if v_priority <> t.priority then
      update controle_interno.tasks set priority = v_priority where id = t.id;
      perform controle_interno.log_activity(t.id, me.id, 'alterou a prioridade para ' || controle_interno.priority_label(v_priority));
    end if;
  end if;

  if p_patch ? 'sector' then
    v_sector := (p_patch->>'sector')::controle_interno.sector;
    if v_sector <> t.sector then
      if not (controle_interno.is_global(me) or controle_interno.directed_sector(me) = v_sector) then
        raise exception 'Você não pode mover tarefas para o setor %.', v_sector using errcode = '42501';
      end if;
      update controle_interno.tasks set sector = v_sector where id = t.id;
      perform controle_interno.log_activity(t.id, me.id, 'alterou o setor para ' || v_sector);
    end if;
  end if;

  if p_patch ? 'assigneeId' and p_patch->>'assigneeId' <> t.assignee_id then
    select * into target from controle_interno.app_users where id = p_patch->>'assigneeId' and active;
    if target.id is null then raise exception 'Responsável inválido.'; end if;
    if not controle_interno.can_assign(me, target) then
      raise exception 'Você não pode atribuir tarefas para %.', target.name using errcode = '42501';
    end if;
    update controle_interno.tasks set assignee_id = target.id where id = t.id;
    perform controle_interno.log_activity(t.id, me.id, 'atribuiu a ' || target.name);
    perform controle_interno.notify(target.id, me.id, t.id, me.name || ' atribuiu a você "' || t.title || '"');
  end if;

  if p_patch ? 'dueDate' then
    v_due := nullif(p_patch->>'dueDate','')::date;
    if v_due is distinct from t.due_date then
      update controle_interno.tasks set due_date = v_due where id = t.id;
      perform controle_interno.log_activity(t.id, me.id,
        case when v_due is null then 'removeu o prazo' else 'alterou o prazo para ' || to_char(v_due, 'DD/MM/YYYY') end);
    end if;
  end if;

  if p_patch ? 'tags' then
    update controle_interno.tasks
       set tags = coalesce((select array_agg(distinct trim(x)) from jsonb_array_elements_text(p_patch->'tags') x where trim(x) <> ''), '{}')
     where id = t.id;
  end if;

  update controle_interno.tasks set updated_at = now() where id = t.id returning * into t;

  if p_patch ? 'status' then
    t := controle_interno.apply_status(me, t, (p_patch->>'status')::controle_interno.task_status);
  end if;
  return controle_interno.task_json(t);
end $$;

-- Detalhe completo da tarefa (abas do painel lateral).
create or replace function public.ci_task_detail(p_id text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare t controle_interno.tasks;
begin
  perform controle_interno.me();
  select * into t from controle_interno.tasks where id = p_id;
  if t.id is null then raise exception 'Tarefa não encontrada.'; end if;
  return jsonb_build_object(
    'task', controle_interno.task_json(t),
    'checklist', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', c.id, 'text', c.text, 'done', c.done, 'dueDate', c.due_date,
        'assigneeId', c.assignee_id)) order by c.position, c.created_at)
      from controle_interno.task_checklist c where c.task_id = t.id), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'authorId', c.author_id, 'body', c.body, 'createdAt', c.created_at) order by c.created_at)
      from controle_interno.task_comments c where c.task_id = t.id), '[]'::jsonb),
    'files', coalesce((select jsonb_agg(jsonb_build_object(
        'id', f.id, 'name', f.name, 'mime', f.mime, 'size', f.size,
        'uploaderId', f.uploader_id, 'createdAt', f.created_at) order by f.created_at)
      from controle_interno.task_files f where f.task_id = t.id), '[]'::jsonb),
    'activity', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'actorId', a.actor_id, 'action', a.action, 'createdAt', a.created_at) order by a.created_at desc)
      from controle_interno.task_activity a where a.task_id = t.id), '[]'::jsonb));
end $$;

-- ---- Checklist ------------------------------------------------------------
create or replace function controle_interno.editable_task(p_task text)
returns controle_interno.tasks language plpgsql stable security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); t controle_interno.tasks;
begin
  select * into t from controle_interno.tasks where id = p_task;
  if t.id is null then raise exception 'Tarefa não encontrada.'; end if;
  if not controle_interno.can_edit_task(me, t) then
    raise exception 'Você não pode editar esta tarefa.' using errcode = '42501';
  end if;
  return t;
end $$;

create or replace function public.ci_add_checklist_item(p_task text, p_text text, p_due date default null, p_assignee text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); t controle_interno.tasks; c controle_interno.task_checklist;
begin
  t := controle_interno.editable_task(p_task);
  if trim(coalesce(p_text,'')) = '' then raise exception 'Descreva o item.'; end if;
  insert into controle_interno.task_checklist (task_id, text, due_date, assignee_id, position)
  values (t.id, trim(p_text), p_due, nullif(p_assignee,''),
          coalesce((select max(position) + 1 from controle_interno.task_checklist where task_id = t.id), 0))
  returning * into c;
  perform controle_interno.log_activity(t.id, me.id, 'adicionou "' || c.text || '" ao checklist');
  return jsonb_strip_nulls(jsonb_build_object('id', c.id, 'text', c.text, 'done', c.done,
    'dueDate', c.due_date, 'assigneeId', c.assignee_id));
end $$;

create or replace function public.ci_update_checklist_item(p_id text, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); c controle_interno.task_checklist;
begin
  select * into c from controle_interno.task_checklist where id = p_id;
  if c.id is null then raise exception 'Item não encontrado.'; end if;
  perform controle_interno.editable_task(c.task_id);
  update controle_interno.task_checklist set
    text = coalesce(nullif(trim(p_patch->>'text'),''), text),
    done = coalesce((p_patch->>'done')::boolean, done),
    due_date = case when p_patch ? 'dueDate' then nullif(p_patch->>'dueDate','')::date else due_date end,
    assignee_id = case when p_patch ? 'assigneeId' then nullif(p_patch->>'assigneeId','') else assignee_id end
  where id = p_id returning * into c;
  if p_patch ? 'done' then
    perform controle_interno.log_activity(c.task_id, me.id,
      case when c.done then 'concluiu "' else 'reabriu "' end || c.text || '"');
  end if;
  return jsonb_strip_nulls(jsonb_build_object('id', c.id, 'text', c.text, 'done', c.done,
    'dueDate', c.due_date, 'assigneeId', c.assignee_id));
end $$;

create or replace function public.ci_delete_checklist_item(p_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare c controle_interno.task_checklist;
begin
  select * into c from controle_interno.task_checklist where id = p_id;
  if c.id is null then return; end if;
  perform controle_interno.editable_task(c.task_id);
  delete from controle_interno.task_checklist where id = p_id;
end $$;

-- ---- Comentários (qualquer membro pode comentar) ---------------------------
create or replace function public.ci_add_comment(p_task text, p_body text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); t controle_interno.tasks; c controle_interno.task_comments;
begin
  select * into t from controle_interno.tasks where id = p_task;
  if t.id is null then raise exception 'Tarefa não encontrada.'; end if;
  if trim(coalesce(p_body,'')) = '' then raise exception 'Escreva um comentário.'; end if;
  insert into controle_interno.task_comments (task_id, author_id, body)
  values (t.id, me.id, trim(p_body)) returning * into c;
  perform controle_interno.log_activity(t.id, me.id, 'comentou');
  perform controle_interno.notify(t.assignee_id, me.id, t.id, me.name || ' comentou em "' || t.title || '"');
  if t.created_by_id <> t.assignee_id then
    perform controle_interno.notify(t.created_by_id, me.id, t.id, me.name || ' comentou em "' || t.title || '"');
  end if;
  return jsonb_build_object('id', c.id, 'authorId', c.author_id, 'body', c.body, 'createdAt', c.created_at);
end $$;

create or replace function public.ci_delete_comment(p_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); c controle_interno.task_comments;
begin
  select * into c from controle_interno.task_comments where id = p_id;
  if c.id is null then return; end if;
  if not (c.author_id = me.id or controle_interno.is_global(me)) then
    raise exception 'Você só exclui os próprios comentários.' using errcode = '42501';
  end if;
  delete from controle_interno.task_comments where id = p_id;
end $$;

-- ---- Anexos ---------------------------------------------------------------
create or replace function public.ci_upload_file(p_task text, p_name text, p_mime text, p_base64 text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me controle_interno.app_users := controle_interno.me();
  t controle_interno.tasks;
  v_content bytea := decode(p_base64, 'base64');
  f controle_interno.task_files;
begin
  select * into t from controle_interno.tasks where id = p_task;
  if t.id is null then raise exception 'Tarefa não encontrada.'; end if;
  if length(v_content) > 8 * 1024 * 1024 then raise exception 'O arquivo passa de 8 MB.'; end if;
  insert into controle_interno.task_files (task_id, uploader_id, name, mime, size, content)
  values (t.id, me.id, coalesce(nullif(trim(p_name),''), 'arquivo'),
          coalesce(nullif(p_mime,''), 'application/octet-stream'), length(v_content), v_content)
  returning * into f;
  perform controle_interno.log_activity(t.id, me.id, 'anexou ' || f.name);
  return jsonb_build_object('id', f.id, 'name', f.name, 'mime', f.mime, 'size', f.size,
    'uploaderId', f.uploader_id, 'createdAt', f.created_at);
end $$;

create or replace function public.ci_get_file(p_id text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare f controle_interno.task_files;
begin
  perform controle_interno.me();
  select * into f from controle_interno.task_files where id = p_id;
  if f.id is null then raise exception 'Arquivo não encontrado.'; end if;
  return jsonb_build_object('name', f.name, 'mime', f.mime, 'base64', encode(f.content, 'base64'));
end $$;

create or replace function public.ci_delete_file(p_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); f controle_interno.task_files; t controle_interno.tasks;
begin
  select * into f from controle_interno.task_files where id = p_id;
  if f.id is null then return; end if;
  select * into t from controle_interno.tasks where id = f.task_id;
  if not (f.uploader_id = me.id or controle_interno.can_edit_task(me, t)) then
    raise exception 'Você não pode remover este arquivo.' using errcode = '42501';
  end if;
  delete from controle_interno.task_files where id = p_id;
  perform controle_interno.log_activity(f.task_id, me.id, 'removeu o anexo ' || f.name);
end $$;

-- ---- Atividade recente (Visão geral) ---------------------------------------
create or replace function public.ci_recent_activity(p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform controle_interno.me();
  return coalesce((
    select jsonb_agg(x order by (x->>'createdAt') desc) from (
      select jsonb_build_object('id', a.id, 'taskId', a.task_id, 'taskTitle', t.title,
               'actorId', a.actor_id, 'action', a.action, 'createdAt', a.created_at) x
        from controle_interno.task_activity a
        join controle_interno.tasks t on t.id = a.task_id
       order by a.created_at desc
       limit least(greatest(p_limit, 1), 100)) s), '[]'::jsonb);
end $$;

-- ---- Notificações ---------------------------------------------------------
create or replace function public.ci_notifications()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  return coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', n.id, 'actorId', n.actor_id,
             'taskId', n.task_id, 'body', n.body, 'read', n.read_at is not null,
             'createdAt', n.created_at)) order by n.created_at desc)
      from (select * from controle_interno.notifications where user_id = me.id
             order by created_at desc limit 40) n), '[]'::jsonb);
end $$;

create or replace function public.ci_mark_notifications_read(p_ids bigint[] default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  update controle_interno.notifications set read_at = now()
   where user_id = me.id and read_at is null and (p_ids is null or id = any(p_ids));
end $$;

-- ============================================================================
-- Financeiro
-- ============================================================================
create or replace function public.ci_delete_transaction(p_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  if not (controle_interno.is_global(me) or me.sector = 'Financeiro') then
    raise exception 'Apenas o setor Financeiro e CEO/Founder alteram o financeiro.' using errcode = '42501';
  end if;
  delete from controle_interno.transactions where id = p_id;
end $$;

create or replace function public.ci_get_settings()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform controle_interno.me();
  return coalesce((select jsonb_object_agg(key, value) from controle_interno.settings), '{}'::jsonb);
end $$;

create or replace function public.ci_set_setting(p_key text, p_value numeric)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  if not (controle_interno.is_global(me) or me.sector = 'Financeiro') then
    raise exception 'Sem permissão para alterar indicadores.' using errcode = '42501';
  end if;
  if p_key not in ('inadimplencia') then raise exception 'Indicador desconhecido.'; end if;
  insert into controle_interno.settings (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value;
  return public.ci_get_settings();
end $$;

-- ============================================================================
-- Marketing (lançamento manual do mês corrente)
-- ============================================================================
create or replace function controle_interno.assert_marketing(me controle_interno.app_users)
returns void language plpgsql immutable set search_path = ''
as $$
begin
  if not (controle_interno.is_global(me) or me.sector = 'Marketing') then
    raise exception 'Apenas o setor de Marketing e CEO/Founder lançam dados de marketing.' using errcode = '42501';
  end if;
end $$;

create or replace function public.ci_upsert_channel(p_channel jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); c controle_interno.marketing_channels;
begin
  perform controle_interno.assert_marketing(me);
  if trim(coalesce(p_channel->>'channel','')) = '' then raise exception 'Informe o canal.'; end if;
  if exists (select 1 from controle_interno.marketing_channels
              where month = date_trunc('month', current_date)::date
                and lower(channel) = lower(trim(p_channel->>'channel'))
                and id is distinct from nullif(p_channel->>'id','')) then
    raise exception 'O canal % já foi lançado neste mês.', trim(p_channel->>'channel');
  end if;
  insert into controle_interno.marketing_channels as m (id, month, channel, kind, invested, leads, sales, revenue)
  values (coalesce(nullif(p_channel->>'id',''), gen_random_uuid()::text),
          date_trunc('month', current_date)::date, trim(p_channel->>'channel'),
          coalesce(p_channel->>'kind','pago')::controle_interno.channel_kind,
          coalesce((p_channel->>'invested')::numeric, 0), coalesce((p_channel->>'leads')::integer, 0),
          coalesce((p_channel->>'sales')::integer, 0), coalesce((p_channel->>'revenue')::numeric, 0))
  on conflict (id) do update set channel = excluded.channel, kind = excluded.kind,
    invested = excluded.invested, leads = excluded.leads, sales = excluded.sales, revenue = excluded.revenue
  returning * into c;
  return jsonb_build_object('id', c.id, 'channel', c.channel, 'kind', c.kind, 'invested', c.invested,
    'leads', c.leads, 'sales', c.sales, 'revenue', c.revenue);
end $$;

create or replace function public.ci_delete_channel(p_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  perform controle_interno.assert_marketing(me);
  delete from controle_interno.marketing_channels where id = p_id;
end $$;

-- p_stages: [{stage, value}] na ordem do funil.
create or replace function public.ci_set_funnel(p_stages jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me(); m date := date_trunc('month', current_date)::date;
begin
  perform controle_interno.assert_marketing(me);
  delete from controle_interno.funnel_stages where month = m;
  insert into controle_interno.funnel_stages (month, position, stage, value)
  select m, ord::integer, trim(e->>'stage'), coalesce((e->>'value')::integer, 0)
    from jsonb_array_elements(p_stages) with ordinality as x(e, ord)
   where trim(coalesce(e->>'stage','')) <> '';
  return public.ci_funnel();
end $$;

create or replace function public.ci_set_leads_day(p_day date, p_value integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me controle_interno.app_users := controle_interno.me();
begin
  perform controle_interno.assert_marketing(me);
  insert into controle_interno.leads_daily (day, value) values (p_day, greatest(p_value, 0))
  on conflict (day) do update set value = excluded.value;
  return public.ci_leads_trend();
end $$;

-- ---- Grants ---------------------------------------------------------------
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
