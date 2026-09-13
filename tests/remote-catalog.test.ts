import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  createSupabaseCatalog,
  mapProject,
  type ProjectWithRelations,
} from '../src/services/catalog/supabaseCatalog'
import type { Database } from '../src/types/Database'

function row(id = 1): ProjectWithRelations {
  return {
    id,
    request_id: 'request',
    created_by: 'user',
    title: 'Test',
    slug: `test-${id}`,
    version: 1,
    updated_at: '',
    description: '',
    location: '',
    year: 2026,
    status: 'design',
    created_at: '',
    categories: [{ category: { id: 1, name: 'Pergola', slug: 'pergola' } }],
    media: [
      { id: 1, project_id: id, kind: 'main', position: 0, object_path: 'user/request/main-0.jpg' },
      { id: 2, project_id: id, kind: 'gallery', position: 1, object_path: 'second.jpg' },
      { id: 3, project_id: id, kind: 'gallery', position: 0, object_path: 'first.jpg' },
    ],
  }
}
function fixture(fetch: typeof globalThis.fetch) {
  const client = createClient<Database>('https://portfolio.example.test', 'test-key', {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return createSupabaseCatalog(client)
}

describe('Supabase catalog reads', () => {
  it('maps relations and sorts media without exposing storage paths as application fields', () => {
    const source = row()
    const mapped = mapProject(source, (path) => `https://cdn.example.test/${path}`)
    expect(mapped.gallery).toEqual([
      'https://cdn.example.test/first.jpg',
      'https://cdn.example.test/second.jpg',
    ])
    expect(mapped.categoryIds).toEqual([1])
    expect(mapped).not.toHaveProperty('request_id')
    expect(source.media[1]!.position).toBe(1)
  })
  it('rejects missing main media and invalid statuses', () => {
    expect(() => mapProject({ ...row(), media: [] }, (path) => path)).toThrow()
    expect(() => mapProject({ ...row(), status: 'invalid' }, (path) => path)).toThrow()
  })
  it('reads subsequent pages instead of silently accepting the first page only', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input))
      const cursor = url.searchParams.get('id')
      const rows =
        cursor === null ? Array.from({ length: 100 }, (_, index) => row(101 - index)) : [row(1)]
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    const catalog = fixture(fetch)
    expect(await catalog.listProjects()).toHaveLength(101)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('returns null for an absent slug', async () => {
    const catalog = fixture(vi.fn().mockResolvedValue(new Response('[]', { status: 200 })))
    expect(await catalog.getProjectBySlug('missing')).toBeNull()
  })
  it('propagates missing-table errors instead of returning example records', async () => {
    const catalog = fixture(
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'PGRST205', message: 'Table not found' }), {
          status: 404,
        }),
      ),
    )
    await expect(catalog.listProjects()).rejects.toMatchObject({ code: 'PGRST205' })
  })
})
