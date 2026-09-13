// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const uid = '11111111-1111-4111-8111-111111111111'
const requestId = '22222222-2222-4222-8222-222222222222'
const path = `${uid}/${requestId}/main-0.jpg`
const media = [{ kind: 'main', position: 0, object_path: path }]
const project = {
  title: 'Test Pergola',
  slug: 'test-pergola',
  category_ids: [1],
  year: 2026,
  status: 'design',
}
let db: PGlite

async function create(fields = project, items = media, id = requestId) {
  return db.query<{ id: number }>(
    'select public.create_portfolio_project($1, $2::jsonb, $3::jsonb) as id',
    [id, JSON.stringify(fields), JSON.stringify(items)],
  )
}
async function object(name = path, size = 100, mimetype = 'image/jpeg') {
  await db.query(
    "insert into storage.objects (bucket_id, name, metadata) values ('project-media', $1, $2::jsonb)",
    [name, JSON.stringify({ size, mimetype })],
  )
}

beforeAll(async () => {
  db = new PGlite()
  // Supabase-owned schemas are represented only to test our migration, grants and policies.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, storage, public to anon, authenticated;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, metadata jsonb, unique(bucket_id, name));
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `)
  await db.exec(
    readFileSync(
      new URL('../supabase/migrations/202609120001_portfolio.sql', import.meta.url),
      'utf8',
    ),
  )
  // An already-published v1 project must keep its category, fields and media across the migration.
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid])
  await object()
  const legacy = await db.query<{ id: number }>(
    'select public.create_portfolio_project($1,$2::jsonb,$3::jsonb) as id',
    [requestId, JSON.stringify({ ...project, category_id: 6 }), JSON.stringify(media)],
  )
  await db.exec(
    readFileSync(
      new URL('../supabase/migrations/202609130001_admin_management.sql', import.meta.url),
      'utf8',
    ),
  )
  await db.exec(
    readFileSync(new URL('../supabase/video-kaynaklari-kurulumu.sql', import.meta.url), 'utf8'),
  )
  await db.exec(
    readFileSync(new URL('../supabase/proje-acilis-medya-kurulumu.sql', import.meta.url), 'utf8'),
  )
  expect(
    (await db.query('select project_id, category_id from public.project_categories')).rows,
  ).toEqual([{ project_id: legacy.rows[0]!.id, category_id: 6 }])
  expect((await db.query('select title, slug, version from public.projects')).rows).toEqual([
    { title: project.title, slug: project.slug, version: 1 },
  ])
  expect((await db.query('select object_path from public.project_media')).rows).toEqual([
    { object_path: path },
  ])
  await db.exec('delete from public.projects; delete from storage.objects;')
  await db.query("select set_config('request.jwt.claim.sub', '', false)")
}, 60000)
beforeEach(async () => {
  await db.exec('begin; set local role authenticated;')
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid])
})
afterEach(async () => {
  await db.exec('rollback')
})
afterAll(async () => {
  await db?.close()
})

describe('Portfolio migration / PostgreSQL permissions', () => {
  it('seeds the seven categories and grants public reading', async () => {
    await db.exec('set local role anon')
    const result = await db.query('select * from public.categories order by id')
    expect(result.rows).toHaveLength(7)
    expect((await db.query('select * from public.projects')).rows).toEqual([])
  })
  it('denies anonymous RPC execution', async () => {
    await db.exec('set local role anon')
    await expect(create()).rejects.toMatchObject({ code: '42501' })
  })
  it('denies direct table writes even to authenticated users', async () => {
    await expect(
      db.query("insert into public.categories (name, slug) values ('Bypass', 'bypass')"),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('denies storage uploads to anonymous users', async () => {
    await db.exec('set local role anon')
    await expect(object()).rejects.toMatchObject({ code: '42501' })
  })
  it('denies uploading into a different user folder', async () => {
    await expect(
      object(path.replace(uid, '33333333-3333-4333-8333-333333333333')),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('creates a project atomically and makes request retries idempotent', async () => {
    await object()
    const first = await create()
    const second = await create()
    expect(second.rows).toEqual(first.rows)
    expect((await db.query('select * from public.projects')).rows).toHaveLength(1)
    expect((await db.query('select * from public.project_media')).rows).toHaveLength(1)
  })
  it('rejects the same slug under a different request', async () => {
    await object()
    await create()
    const next = '44444444-4444-4444-8444-444444444444'
    const nextPath = path.replace(requestId, next)
    await object(nextPath)
    await expect(
      create(project, [{ ...media[0]!, object_path: nextPath }], next),
    ).rejects.toMatchObject({ code: '23505' })
  })
  it('rolls back the project if a media row is invalid', async () => {
    await object()
    await db.exec('savepoint before_create')
    await expect(create(project, [{ ...media[0]!, position: 1 }])).rejects.toMatchObject({
      code: '23514',
    })
    await db.exec('rollback to before_create')
    expect((await db.query('select * from public.projects')).rows).toHaveLength(0)
  })
  it('rejects missing uploads and a missing main image', async () => {
    await expect(create()).rejects.toMatchObject({ code: '22023' })
  })
  it('rejects a gallery-only request', async () => {
    await object()
    await expect(create(project, [{ ...media[0]!, kind: 'gallery' }])).rejects.toMatchObject({
      code: '22023',
    })
  })
  it.each([
    [{ ...project, year: 1999 }, '23514'],
    [{ ...project, status: 'unknown' }, '23514'],
    [{ ...project, category_ids: [999] }, '23503'],
    [{ ...project, slug: '../invalid' }, '23514'],
  ])('enforces database field constraints', async (fields, code) => {
    await object()
    await expect(create(fields)).rejects.toMatchObject({ code })
  })
  it('uses Storage size metadata to reject an oversized image', async () => {
    await object(path, 10485761)
    await expect(create()).rejects.toMatchObject({ code: '22023' })
  })
  it('rejects a media type that does not match the filename', async () => {
    await object(path, 100, 'image/png')
    await expect(create()).rejects.toMatchObject({ code: '22023' })
  })
  it('does not attach files from a different request', async () => {
    await object()
    await expect(
      create(project, media, '55555555-5555-4555-8555-555555555555'),
    ).rejects.toMatchObject({ code: '22023' })
  })
  it('allows cleanup of unregistered uploads but protects registered objects', async () => {
    await object()
    const unused = path.replace('main-0', 'gallery-0')
    await object(unused)
    await create()
    await db.query("delete from storage.objects where bucket_id = 'project-media'")
    const objects = await db.query<{ name: string }>('select name from storage.objects')
    expect(objects.rows).toEqual([{ name: path }])
  })
})

describe('Admin edits and multiple categories', () => {
  async function update(
    id: number,
    version = 1,
    fields = project,
    items = media,
    request = '66666666-6666-4666-8666-666666666666',
  ) {
    return db.query('select public.save_portfolio_project($1,$2,$3,$4::jsonb,$5::jsonb)', [
      id,
      version,
      request,
      JSON.stringify(fields),
      JSON.stringify(items),
    ])
  }
  it('assigns multiple categories without duplicating projects', async () => {
    await object()
    await create({ ...project, category_ids: [1, 4, 6] })
    expect(
      (await db.query('select category_id from public.project_categories order by category_id'))
        .rows,
    ).toEqual([{ category_id: 1 }, { category_id: 4 }, { category_id: 6 }])
    expect((await db.query('select id from public.projects')).rows).toHaveLength(1)
  })
  it.each([[[]], [[1, 1]], [[999]]])('rejects invalid category sets %j', async (category_ids) => {
    await object()
    await expect(create({ ...project, category_ids })).rejects.toHaveProperty('code')
  })
  it('updates metadata and categories while retaining existing uploaded media', async () => {
    await object()
    const id = (await create()).rows[0]!.id
    await update(id, 1, { ...project, title: 'Updated title', category_ids: [2, 6] })
    expect((await db.query('select title, version from public.projects')).rows).toEqual([
      { title: 'Updated title', version: 2 },
    ])
    expect((await db.query('select object_path from public.project_media')).rows).toEqual([
      { object_path: path },
    ])
    expect(
      (await db.query('select category_id from public.project_categories order by category_id'))
        .rows,
    ).toEqual([{ category_id: 2 }, { category_id: 6 }])
  })
  it('allows another admin to update an existing project using its media', async () => {
    await object()
    const id = (await create()).rows[0]!.id
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [
      '33333333-3333-4333-8333-333333333333',
    ])
    await update(id)
    expect((await db.query('select version from public.projects')).rows).toEqual([{ version: 2 }])
  })
  it('rejects stale updates rather than overwriting newer data', async () => {
    await object()
    const id = (await create()).rows[0]!.id
    await update(id)
    await expect(
      update(id, 1, project, media, '77777777-7777-4777-8777-777777777777'),
    ).rejects.toMatchObject({ code: '40001' })
  })
  it('protects the published slug', async () => {
    await object()
    const id = (await create()).rows[0]!.id
    await expect(update(id, 1, { ...project, slug: 'changed-address' })).rejects.toMatchObject({
      code: '22023',
    })
  })
  it('queues replaced media and keeps the new main image', async () => {
    await object()
    const id = (await create()).rows[0]!.id
    const next = '66666666-6666-4666-8666-666666666666',
      nextPath = path.replace(requestId, next)
    await object(nextPath)
    await update(id, 1, project, [{ ...media[0]!, object_path: nextPath }])
    expect((await db.query('select object_path from public.media_cleanup')).rows).toEqual([
      { object_path: path },
    ])
    expect((await db.query('select object_path from public.project_media')).rows).toEqual([
      { object_path: nextPath },
    ])
  })
  it('rejects stale deletes', async () => {
    await object()
    const id = (await create()).rows[0]!.id
    await update(id)
    await expect(
      db.query('select public.delete_portfolio_project($1,1)', [id]),
    ).rejects.toMatchObject({ code: '40001' })
  })
  it('deletes the project and its links atomically, queuing physical file cleanup', async () => {
    await object()
    const id = (await create()).rows[0]!.id
    await db.query('select public.delete_portfolio_project($1,1)', [id])
    expect((await db.query('select * from public.projects')).rows).toHaveLength(0)
    expect((await db.query('select * from public.project_categories')).rows).toHaveLength(0)
    expect((await db.query('select * from public.project_media')).rows).toHaveLength(0)
    expect((await db.query('select object_path from public.media_cleanup')).rows).toEqual([
      { object_path: path },
    ])
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(1)
    await db.query('select public.delete_portfolio_project($1,1)', [id])
  })
  it('denies anonymous access to edits and cleanup queue', async () => {
    await db.exec('set local role anon')
    await expect(update(1)).rejects.toMatchObject({ code: '42501' })
  })
})

describe('Gallery text persistence', () => {
  it('saves gallery order and text through the new endpoint', async () => {
    await object()
    const drawing = `${uid}/${requestId}/gallery-0.jpg`
    await object(drawing)
    await db.query(
      'select public.save_portfolio_project_gallery(null,null,$1,$2::jsonb,$3::jsonb)',
      [
        requestId,
        JSON.stringify(project),
        JSON.stringify([
          ...media,
          {
            kind: 'gallery',
            position: 0,
            object_path: drawing,
            title: ' Alternatif A ',
            description: 'Üstten görünüş',
          },
        ]),
      ],
    )
    expect(
      (
        await db.query(
          "select title, description, position from public.project_media where kind = 'gallery'",
        )
      ).rows,
    ).toEqual([{ title: 'Alternatif A', description: 'Üstten görünüş', position: 0 }])
  })
  it('rejects oversized text atomically', async () => {
    await object()
    await expect(
      db.query('select public.save_portfolio_project_gallery(null,null,$1,$2::jsonb,$3::jsonb)', [
        requestId,
        JSON.stringify(project),
        JSON.stringify([{ ...media[0], title: 'x'.repeat(121) }]),
      ]),
    ).rejects.toMatchObject({ code: '23514' })
  })
  it('denies anonymous access to the gallery endpoint', async () => {
    await db.exec('set local role anon')
    await expect(
      db.query('select public.save_portfolio_project_gallery(null,null,$1,$2::jsonb,$3::jsonb)', [
        requestId,
        JSON.stringify(project),
        JSON.stringify(media),
      ]),
    ).rejects.toMatchObject({ code: '42501' })
  })
})

describe('Video source persistence', () => {
  it('stores the YouTube ID without a Storage video', async () => {
    await object()
    await db.query('select public.save_portfolio_project_video(null,null,$1,$2::jsonb,$3::jsonb)', [
      requestId,
      JSON.stringify({ ...project, youtube_video_id: 'Abcdef_12-3' }),
      JSON.stringify(media),
    ])
    expect((await db.query('select youtube_video_id from public.projects')).rows).toEqual([
      { youtube_video_id: 'Abcdef_12-3' },
    ])
  })
  it('rejects simultaneous YouTube and Storage videos', async () => {
    await object()
    await expect(
      db.query('select public.save_portfolio_project_video(null,null,$1,$2::jsonb,$3::jsonb)', [
        requestId,
        JSON.stringify({ ...project, youtube_video_id: 'Abcdef_12-3' }),
        JSON.stringify([...media, { kind: 'video', position: 0, object_path: 'video.mp4' }]),
      ]),
    ).rejects.toMatchObject({ code: '22023' })
  })
  it('rejects invalid YouTube IDs', async () => {
    await object()
    await expect(
      db.query('select public.save_portfolio_project_video(null,null,$1,$2::jsonb,$3::jsonb)', [
        requestId,
        JSON.stringify({ ...project, youtube_video_id: 'https://evil.test' }),
        JSON.stringify(media),
      ]),
    ).rejects.toMatchObject({ code: '22023' })
  })
})

describe('Project opening media', () => {
  it('persists YouTube as the opening media and can switch back to an image', async () => {
    await object()
    const result = await db.query<{ id: number }>(
      'select public.save_portfolio_project_presentation(null,null,$1,$2::jsonb,$3::jsonb) as id',
      [
        requestId,
        JSON.stringify({ ...project, youtube_video_id: 'Abcdef_12-3', hero_media: 'youtube' }),
        JSON.stringify(media),
      ],
    )
    expect((await db.query('select hero_media from public.projects')).rows).toEqual([
      { hero_media: 'youtube' },
    ])
    await db.query(
      'select public.save_portfolio_project_presentation($1,1,$2,$3::jsonb,$4::jsonb)',
      [
        result.rows[0]!.id,
        '33333333-3333-4333-8333-333333333333',
        JSON.stringify({ ...project, youtube_video_id: 'Abcdef_12-3', hero_media: 'image' }),
        JSON.stringify(media),
      ],
    )
    expect(
      (await db.query('select hero_media, youtube_video_id from public.projects')).rows,
    ).toEqual([{ hero_media: 'image', youtube_video_id: 'Abcdef_12-3' }])
  })
  it('rejects a video opening without a YouTube ID', async () => {
    await object()
    await expect(
      db.query(
        'select public.save_portfolio_project_presentation(null,null,$1,$2::jsonb,$3::jsonb)',
        [requestId, JSON.stringify({ ...project, hero_media: 'youtube' }), JSON.stringify(media)],
      ),
    ).rejects.toMatchObject({ code: '22023' })
  })
})
