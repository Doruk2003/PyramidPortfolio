-- Supabase SQL Editor'da dosyanın tamamını çalıştırın. Proje medyasından bağımsızdır.
begin;
create table if not exists public.homepage_media (
  id integer primary key default 1 check (id = 1),
  mode text not null default 'image' check (mode in ('image', 'video')),
  poster_path text,
  video_path text,
  version integer not null default 1,
  request_id uuid,
  check (mode <> 'video' or video_path is not null)
);
insert into public.homepage_media (id) values (1) on conflict do nothing;
create table if not exists public.homepage_media_cleanup (
  object_path text primary key,
  queued_at timestamptz not null default now()
);
alter table public.homepage_media enable row level security;
alter table public.homepage_media_cleanup enable row level security;
revoke all on public.homepage_media, public.homepage_media_cleanup from public, anon, authenticated;
grant select on public.homepage_media to anon, authenticated;
grant select, delete on public.homepage_media_cleanup to authenticated;
drop policy if exists homepage_read on public.homepage_media;
create policy homepage_read on public.homepage_media for select using (true);
drop policy if exists homepage_cleanup_read on public.homepage_media_cleanup;
create policy homepage_cleanup_read on public.homepage_media_cleanup for select to authenticated using (auth.uid() is not null);
drop policy if exists homepage_cleanup_ack on public.homepage_media_cleanup;
create policy homepage_cleanup_ack on public.homepage_media_cleanup for delete to authenticated using (auth.uid() is not null);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homepage-media', 'homepage-media', true, 20971520, array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do nothing;
drop policy if exists homepage_upload on storage.objects;
create policy homepage_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'homepage-media' and split_part(name, '/', 1) = auth.uid()::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/(poster\.(jpg|png|webp)|video\.(mp4|webm))$'
);
drop policy if exists homepage_object_read on storage.objects;
create policy homepage_object_read on storage.objects for select to authenticated using (bucket_id = 'homepage-media');
drop policy if exists homepage_object_cleanup on storage.objects;
create policy homepage_object_cleanup on storage.objects for delete to authenticated using (
  bucket_id = 'homepage-media' and auth.uid() is not null
  and not exists (select 1 from public.homepage_media h where name = h.poster_path or name = h.video_path)
  and (split_part(name, '/', 1) = auth.uid()::text or exists (select 1 from public.homepage_media_cleanup q where q.object_path = name))
);
create or replace function public.save_homepage_media(
  p_version integer, p_request_id uuid, p_mode text, p_poster_path text, p_video_path text
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_current public.homepage_media%rowtype;
  v_path text;
  v_metadata jsonb;
  v_bytes bigint;
  v_mime text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_current from public.homepage_media where id = 1 for update;
  if not found then raise exception 'Homepage settings missing' using errcode = 'P0002'; end if;
  if p_request_id is null then raise exception 'Request ID required' using errcode = '22023'; end if;
  if v_current.request_id = p_request_id then return v_current.version; end if;
  if p_version is distinct from v_current.version then raise exception 'Reload settings' using errcode = '40001'; end if;
  if p_mode is null or p_mode not in ('image','video') or (p_mode = 'video' and p_video_path is null)
    or (p_mode = 'image' and p_video_path is not null)
    or (p_poster_path is not null and p_poster_path = p_video_path) then
    raise exception 'Invalid media selection' using errcode = '22023';
  end if;
  foreach v_path in array array[p_poster_path, p_video_path] loop
    if v_path is null then continue; end if;
    if not (v_path = coalesce(v_current.poster_path, '') or v_path = coalesce(v_current.video_path, '')
      or (split_part(v_path, '/', 1) = auth.uid()::text and split_part(v_path, '/', 2) = p_request_id::text)) then
      raise exception 'Invalid object ownership' using errcode = '22023';
    end if;
    select metadata into v_metadata from storage.objects where bucket_id = 'homepage-media' and name = v_path for update;
    if not found then raise exception 'Object missing' using errcode = '22023'; end if;
    v_bytes := (v_metadata->>'size')::bigint;
    v_mime := v_metadata->>'mimetype';
    if v_bytes is null or v_bytes <= 0 or v_mime is null then raise exception 'Invalid metadata' using errcode = '22023'; end if;
    if v_path = p_poster_path then
      if v_bytes > 10485760 or not ((v_mime='image/jpeg' and v_path ~ '\.jpg$') or (v_mime='image/png' and v_path ~ '\.png$') or (v_mime='image/webp' and v_path ~ '\.webp$')) then
        raise exception 'Invalid poster' using errcode = '22023';
      end if;
    else
      if v_bytes > 20971520 or not ((v_mime='video/mp4' and v_path ~ '\.mp4$') or (v_mime='video/webm' and v_path ~ '\.webm$')) then
        raise exception 'Invalid video' using errcode = '22023';
      end if;
    end if;
  end loop;
  insert into public.homepage_media_cleanup(object_path)
    select old_path from unnest(array[v_current.poster_path, v_current.video_path]) old_path
    where old_path is not null and old_path is distinct from p_poster_path and old_path is distinct from p_video_path
    on conflict do nothing;
  update public.homepage_media set mode = p_mode, poster_path = p_poster_path, video_path = p_video_path,
    request_id = p_request_id, version = version + 1 where id = 1;
  return v_current.version + 1;
end;
$$;
revoke all on function public.save_homepage_media(integer,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.save_homepage_media(integer,uuid,text,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
