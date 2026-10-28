-- ============================================================================
-- 004 — Links nos anexos da tarefa. Um anexo é um arquivo (content) OU um link
-- (url). Rode após 003.
-- ============================================================================

alter table controle_interno.task_files
  add column if not exists url text,
  alter column content drop not null;

alter table controle_interno.task_files
  add constraint task_files_kind_chk check ((content is null) <> (url is null));

create or replace function controle_interno.file_json(f controle_interno.task_files)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object('id', f.id, 'name', f.name, 'mime', f.mime, 'size', f.size,
    'url', f.url, 'uploaderId', f.uploader_id, 'createdAt', f.created_at))
$$;

create or replace function public.ci_add_link(p_task text, p_url text, p_title text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me controle_interno.app_users := controle_interno.me();
  t controle_interno.tasks;
  v_url text := trim(coalesce(p_url, ''));
  f controle_interno.task_files;
begin
  select * into t from controle_interno.tasks where id = p_task;
  if t.id is null then raise exception 'Tarefa não encontrada.'; end if;
  if v_url !~* '^https?://' then v_url := 'https://' || v_url; end if;
  if v_url !~* '^https?://[^\s/$.?#].[^\s]*$' then raise exception 'Informe um link válido.'; end if;
  insert into controle_interno.task_files (task_id, uploader_id, name, mime, size, url)
  values (t.id, me.id, coalesce(nullif(trim(p_title), ''), regexp_replace(v_url, '^https?://(www\.)?', '')),
          'text/uri-list', 0, v_url)
  returning * into f;
  perform controle_interno.log_activity(t.id, me.id, 'anexou o link ' || f.name);
  return controle_interno.file_json(f);
end $$;

-- Mesma saída de antes, agora com `url` nos anexos.
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
    'files', coalesce((select jsonb_agg(controle_interno.file_json(f) order by f.created_at)
      from controle_interno.task_files f where f.task_id = t.id), '[]'::jsonb),
    'activity', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'actorId', a.actor_id, 'action', a.action, 'createdAt', a.created_at) order by a.created_at desc)
      from controle_interno.task_activity a where a.task_id = t.id), '[]'::jsonb));
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
    raise exception 'Você não pode remover este anexo.' using errcode = '42501';
  end if;
  delete from controle_interno.task_files where id = p_id;
  perform controle_interno.log_activity(f.task_id, me.id,
    case when f.url is null then 'removeu o anexo ' else 'removeu o link ' end || f.name);
end $$;

revoke all on function public.ci_add_link(text, text, text) from public, anon;
revoke all on function controle_interno.file_json(controle_interno.task_files) from public, anon;
grant execute on function public.ci_add_link(text, text, text) to authenticated;
