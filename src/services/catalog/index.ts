import { supabase } from '../../lib/supabase'
import { exampleCatalog } from './exampleCatalog'
import { createSupabaseCatalog } from './supabaseCatalog'
import type { CatalogReader } from './types'

// Cut over explicitly only after the database migration has been applied.
export const dataSource = import.meta.env.VITE_DATA_SOURCE?.trim() || 'example'
const unavailable = async (): Promise<never> => {
  throw new Error('Catalog is not configured')
}
const unavailableCatalog: CatalogReader = {
  getProjectById: unavailable,
  listCategories: unavailable,
  listProjects: unavailable,
  getProjectBySlug: unavailable,
}
export const remoteCatalog =
  dataSource === 'supabase' && supabase ? createSupabaseCatalog(supabase) : null
export const catalog: CatalogReader =
  dataSource === 'example' ? exampleCatalog : (remoteCatalog ?? unavailableCatalog)
