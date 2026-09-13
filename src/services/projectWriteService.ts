import type { ReportMediaProgress } from '../types/MediaProgress'
import { supabase } from '../lib/supabase'
import { remoteCatalog } from './catalog'
import { createRemoteProjectWriter, createSupabaseWriteTransport } from './supabaseProjectWriter'
import { ProjectWriteError } from './projectWriteErrors'
export { ProjectWriteError } from './projectWriteErrors'
import type { CreateProjectInput, UpdateProjectInput } from '../types/ProjectForm'
import type { Project } from '../types/Project'

export interface ProjectWriter {
  update?(input: UpdateProjectInput, progress?: ReportMediaProgress): Promise<Project>
  create(input: CreateProjectInput, progress?: ReportMediaProgress): Promise<Project>
}

export function createProjectWriteService(writer: ProjectWriter | null = null) {
  return {
    isConfigured: writer !== null,
    async update(input: UpdateProjectInput, progress?: ReportMediaProgress): Promise<Project> {
      if (!writer?.update) throw new ProjectWriteError('not_configured')
      return writer.update(input, progress)
    },
    async create(input: CreateProjectInput, progress?: ReportMediaProgress): Promise<Project> {
      if (!writer) throw new ProjectWriteError('not_configured')
      return writer.create(input, progress)
    },
  }
}

export const projectWriteService = createProjectWriteService(
  supabase && remoteCatalog
    ? createRemoteProjectWriter(
        createSupabaseWriteTransport(supabase, {
          listCategories: remoteCatalog.listCategories,
          findByRequest: remoteCatalog.getProjectByRequest,
        }),
      )
    : null,
)
