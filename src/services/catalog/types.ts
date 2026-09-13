import type { Category } from '../../types/Category'
import type { Project } from '../../types/Project'
export interface CatalogReader {
  getProjectById(id: number): Promise<Project | null>
  listCategories(): Promise<Category[]>
  listProjects(): Promise<Project[]>
  getProjectBySlug(slug: string): Promise<Project | null>
}
