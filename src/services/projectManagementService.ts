import { supabase } from '../lib/supabase'
import { remoteCatalog } from './catalog'
import { PROJECT_MEDIA_BUCKET } from './catalog/supabaseCatalog'
import { ProjectWriteError } from './projectWriteErrors'

export async function cleanupProjectMedia(): Promise<{ remaining: number }> {
  if (!supabase || !remoteCatalog) throw new ProjectWriteError('not_configured')
  const { data, error } = await supabase
    .from('media_cleanup')
    .select('*')
    .order('queued_at')
    .limit(100)
  if (error) throw error
  if (data.length) {
    const paths = data.map((item) => item.object_path)
    const result = await supabase.storage.from(PROJECT_MEDIA_BUCKET).remove(paths)
    if (result.error) throw result.error
    const removed = await supabase.from('media_cleanup').delete().in('object_path', paths)
    if (removed.error) throw removed.error
  }
  const count = await supabase.from('media_cleanup').select('*', { count: 'exact', head: true })
  if (count.error) throw count.error
  return { remaining: count.count ?? 0 }
}

export async function deleteProject(
  id: number,
  version: number,
): Promise<{ cleanupPending: boolean }> {
  if (!supabase || !remoteCatalog) throw new ProjectWriteError('not_configured')
  const { error } = await supabase.rpc('delete_portfolio_project', {
    p_project_id: id,
    p_expected_version: version,
  })
  if (error) {
    if (error.code === '40001') throw new ProjectWriteError('conflict')
    // Lost response may hide a committed deletion. Do not claim failure if it is gone.
    try {
      if (await remoteCatalog.getProjectById(id)) throw new ProjectWriteError('failed')
    } catch {
      throw new ProjectWriteError('outcome_unknown')
    }
  }
  try {
    return { cleanupPending: (await cleanupProjectMedia()).remaining > 0 }
  } catch {
    return { cleanupPending: true }
  }
}
