-- Read-only verification after applying the migration in the same Supabase project.
select id, name, slug from public.categories order by id;
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('categories', 'projects', 'project_media');
select schemaname, tablename, policyname, roles, cmd from pg_policies
where (schemaname = 'public' and tablename in ('categories', 'projects', 'project_media'))
  or (schemaname = 'storage' and policyname like 'portfolio_media_%');
select
  has_function_privilege('anon', 'public.create_portfolio_project(uuid,jsonb,jsonb)', 'execute') as anon_can_create,
  has_function_privilege('authenticated', 'public.create_portfolio_project(uuid,jsonb,jsonb)', 'execute') as admin_can_create,
  has_table_privilege('authenticated', 'public.projects', 'insert') as direct_insert_allowed;
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'project-media';

-- Admin management migration verification (202609130001).
select count(*) as category_links from public.project_categories;
select id, version, updated_at from public.projects order by id;
select
  has_function_privilege('anon', 'public.save_portfolio_project(integer,integer,uuid,jsonb,jsonb)', 'execute') as anon_can_update,
  has_function_privilege('authenticated', 'public.save_portfolio_project(integer,integer,uuid,jsonb,jsonb)', 'execute') as admin_can_update,
  has_function_privilege('anon', 'public.delete_portfolio_project(integer,integer)', 'execute') as anon_can_delete,
  has_function_privilege('authenticated', 'public.delete_portfolio_project(integer,integer)', 'execute') as admin_can_delete;
