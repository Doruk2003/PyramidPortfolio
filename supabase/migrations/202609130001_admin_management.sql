-- Apply after 202609120001_portfolio.sql. Existing projects and their categories are preserved.
begin;
create table public.project_categories (
  project_id integer not null references public.projects(id) on delete cascade,
  category_id integer not null references public.categories(id) on delete restrict,
  primary key (project_id, category_id)
);
create index project_categories_category_idx on public.project_categories(category_id, project_id);
insert into public.project_categories (project_id, category_id) select id, category_id from public.projects;
alter table public.projects drop column category_id;
alter table public.projects add column version integer not null default 1;
alter table public.projects add column updated_at timestamptz not null default now();
alter table public.project_categories enable row level security;
revoke all on public.project_categories from anon, authenticated;
grant select on public.project_categories to anon, authenticated;
create policy project_categories_read on public.project_categories for select to anon, authenticated using (true);

-- Metadata deletion never deletes the physical file. This queue is drained through Storage API.
create table public.media_cleanup (
  object_path text primary key,
  queued_at timestamptz not null default now()
);
alter table public.media_cleanup enable row level security;
revoke all on public.media_cleanup from anon, authenticated;
grant select, delete on public.media_cleanup to authenticated;
create policy cleanup_read on public.media_cleanup for select to authenticated using ((select auth.uid()) is not null);
create policy cleanup_ack on public.media_cleanup for delete to authenticated using ((select auth.uid()) is not null);
-- All Auth users are admins; any admin can complete queued cleanup for another admin's project.
drop policy portfolio_media_cleanup on storage.objects;
create policy portfolio_media_cleanup on storage.objects for delete to authenticated using (
  bucket_id = 'project-media' and (select auth.uid()) is not null
  and not exists (select 1 from public.project_media m where m.object_path = name)
  and (split_part(name, '/', 1) = (select auth.uid())::text
    or exists (select 1 from public.media_cleanup q where q.object_path = name))
);

-- Design gallery fields; no binary files are stored in these columns.
alter table public.project_media add column if not exists title text not null default '' check (char_length(title) <= 120);
alter table public.project_media add column if not exists description text not null default '' check (char_length(description) <= 1000);

create or replace function public.save_portfolio_project_gallery(
  p_project_id integer, p_expected_version integer, p_request_id uuid, p_project jsonb, p_media jsonb
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id integer;
  v_existing public.projects%rowtype;
  v_ids jsonb;
  v_item jsonb;
  v_path text;
  v_kind text;
  v_meta jsonb;
  v_bytes bigint;
  v_total bigint := 0;
  v_mime text;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_request_id is null or jsonb_typeof(p_project) is distinct from 'object'
    or jsonb_typeof(p_media) is distinct from 'array' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 0));
  if p_project_id is null then
    select id into v_id from public.projects where request_id = p_request_id and created_by = v_user;
    if found then return v_id; end if;
  else
    select * into v_existing from public.projects where id = p_project_id for update;
    if not found then raise exception 'Project no longer exists' using errcode = 'P0002'; end if;
    if v_existing.request_id = p_request_id then return p_project_id; end if;
    if p_expected_version is distinct from v_existing.version then
      raise exception 'Project changed; reload before saving' using errcode = '40001';
    end if;
    if p_project->>'slug' is distinct from v_existing.slug then
      raise exception 'Published project address cannot change' using errcode = '22023';
    end if;
  end if;
  v_ids := p_project->'category_ids';
  if jsonb_typeof(v_ids) is distinct from 'array' then
    raise exception 'Select categories' using errcode = '22023';
  end if;
  if jsonb_array_length(v_ids) = 0 or jsonb_array_length(v_ids) > 100
    or exists (select 1 from jsonb_array_elements(v_ids) c where jsonb_typeof(c) <> 'number' or c::text !~ '^[0-9]+$')
    or (select count(*) from jsonb_array_elements(v_ids)) <> (select count(distinct c) from jsonb_array_elements(v_ids) c) then
    raise exception 'Invalid categories' using errcode = '22023';
  end if;
  if jsonb_array_length(p_media) not between 1 and 26
      or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'main') <> 1
      or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'video') > 1
      or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'gallery') > 12
      or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'application') > 12 then
    raise exception 'Invalid media count' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_media) loop
    if (v_item ? 'title' and jsonb_typeof(v_item->'title') <> 'string')
      or (v_item ? 'description' and jsonb_typeof(v_item->'description') <> 'string') then
      raise exception 'Invalid gallery text' using errcode = '22023';
    end if;
    v_path := v_item->>'object_path';
    v_kind := v_item->>'kind';
    if v_path is null or v_kind is null or v_kind not in ('main', 'gallery', 'application', 'video')
        or not (
          (split_part(v_path, '/', 1) = v_user::text and split_part(v_path, '/', 2) = p_request_id::text)
          or exists (select 1 from public.project_media where project_id = p_project_id and object_path = v_path)
        ) then
      raise exception 'Invalid media path' using errcode = '22023';
    end if;
    -- Lock the actual object: do not trust size/MIME sent by the browser.
    select metadata into v_meta from storage.objects
      where bucket_id = 'project-media' and name = v_path for update;
    if not found then raise exception 'Media not uploaded' using errcode = '22023'; end if;
    v_bytes := (v_meta->>'size')::bigint;
    v_mime := v_meta->>'mimetype';
    if v_bytes is null or v_bytes <= 0 or v_mime is null then
      raise exception 'Invalid media metadata' using errcode = '22023';
    end if;
    if v_kind = 'video' then
      if v_bytes > 104857600 or not (
        (v_mime = 'video/mp4' and v_path ~ '\.mp4$') or
        (v_mime = 'video/webm' and v_path ~ '\.webm$')
      ) then raise exception 'Invalid video' using errcode = '22023'; end if;
    else
      if v_bytes > 10485760 or not (
        (v_mime = 'image/jpeg' and v_path ~ '\.jpg$') or
        (v_mime = 'image/png' and v_path ~ '\.png$') or
        (v_mime = 'image/webp' and v_path ~ '\.webp$')
      ) then raise exception 'Invalid image' using errcode = '22023'; end if;
    end if;
    v_total := v_total + v_bytes;
  end loop;
  if v_total > 157286400 then raise exception 'Media total exceeded' using errcode = '22023'; end if;

  if p_project_id is null then
    insert into public.projects (request_id, created_by, title, slug, description, location, year, status)
    values (p_request_id, v_user, btrim(p_project->>'title'), p_project->>'slug',
      btrim(coalesce(p_project->>'description', '')), btrim(coalesce(p_project->>'location', '')),
      (p_project->>'year')::integer, p_project->>'status') returning id into v_id;
  else
    v_id := p_project_id;
    insert into public.media_cleanup (object_path)
      select object_path from public.project_media where project_id = v_id
      and object_path not in (select m->>'object_path' from jsonb_array_elements(p_media) m)
      on conflict do nothing;
    update public.projects set title = btrim(p_project->>'title'), description = btrim(coalesce(p_project->>'description', '')),
      location = btrim(coalesce(p_project->>'location', '')), year = (p_project->>'year')::integer,
      status = p_project->>'status', request_id = p_request_id, version = version + 1, updated_at = now()
      where id = v_id;
    delete from public.project_categories where project_id = v_id;
    delete from public.project_media where project_id = v_id;
  end if;
  insert into public.project_categories (project_id, category_id)
    select v_id, c::text::integer from jsonb_array_elements(v_ids) c;
  insert into public.project_media (project_id, kind, position, object_path, title, description)
    select v_id, m->>'kind', (m->>'position')::integer, m->>'object_path', btrim(coalesce(m->>'title', '')), btrim(coalesce(m->>'description', '')) from jsonb_array_elements(p_media) m;
  return v_id;
end;
$$;
revoke all on function public.save_portfolio_project_gallery(integer,integer,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_portfolio_project_gallery(integer,integer,uuid,jsonb,jsonb) to authenticated;

-- Compatibility endpoint for callers without gallery metadata.
create or replace function public.save_portfolio_project(
  p_project_id integer, p_expected_version integer, p_request_id uuid, p_project jsonb, p_media jsonb
) returns integer language sql security invoker set search_path = '' as $$
  select public.save_portfolio_project_gallery(p_project_id, p_expected_version, p_request_id, p_project, p_media);
$$;
revoke all on function public.save_portfolio_project(integer,integer,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_portfolio_project(integer,integer,uuid,jsonb,jsonb) to authenticated;

-- Preserve the original creation endpoint while accepting multiple categories.
create or replace function public.create_portfolio_project(p_request_id uuid, p_project jsonb, p_media jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
begin
  return public.save_portfolio_project(null, null, p_request_id,
    case when p_project ? 'category_ids' then p_project
      else p_project || jsonb_build_object('category_ids', jsonb_build_array(p_project->'category_id')) end,
    p_media);
end;
$$;
revoke all on function public.create_portfolio_project(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.create_portfolio_project(uuid,jsonb,jsonb) to authenticated;

create function public.delete_portfolio_project(p_project_id integer, p_expected_version integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_version integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select version into v_version from public.projects where id = p_project_id for update;
  if not found then return false; end if;
  if p_expected_version is distinct from v_version then
    raise exception 'Project changed; reload before deleting' using errcode = '40001';
  end if;
  insert into public.media_cleanup (object_path)
    select object_path from public.project_media where project_id = p_project_id on conflict do nothing;
  delete from public.projects where id = p_project_id;
  return true;
end;
$$;
revoke all on function public.delete_portfolio_project(integer,integer) from public, anon, authenticated;
grant execute on function public.delete_portfolio_project(integer,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
