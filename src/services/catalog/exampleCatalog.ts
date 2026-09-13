import { categories } from '../../data/categories'
import { projects } from '../../data/projects'
import { isProjectStatus } from '../../constants/projectStatuses'

import type { Category } from '../../types/Category'
import type { Project, ProjectRecord } from '../../types/Project'

// Return detached records so UI edits cannot mutate the example data source.
function resolveProject(project: ProjectRecord, categories: Map<number, Category>): Project {
  const resolved = project.categoryIds.map((id) => categories.get(id))
  if (resolved.some((category) => !category))
    throw new Error(`Unknown category for project ${project.id}`)
  if (!isProjectStatus(project.status)) throw new Error(`Invalid status for project ${project.id}`)

  return {
    ...project,
    categoryIds: [...project.categoryIds],
    categories: resolved.map((category) => ({ ...category! })),
    version: 1,
    media: [],
    gallery: [...project.gallery],
    applicationImages: [...project.applicationImages],
  }
}

async function listProjects(): Promise<Project[]> {
  const categories = new Map((await listCategories()).map((category) => [category.id, category]))
  return projects.map((project) => resolveProject(project, categories))
}

async function getProjectBySlug(slug: string): Promise<Project | null> {
  const project = projects.find((item) => item.slug === slug)
  if (!project) return null
  const categories = new Map((await listCategories()).map((category) => [category.id, category]))
  return resolveProject(project, categories)
}

async function listCategories(): Promise<Category[]> {
  const ids = new Set<number>()
  const slugs = new Set<string>()
  for (const category of categories) {
    if (ids.has(category.id) || slugs.has(category.slug)) {
      throw new Error('Duplicate category ID or slug')
    }
    ids.add(category.id)
    slugs.add(category.slug)
  }
  return categories.map((category) => ({ ...category }))
}

export const exampleCatalog = {
  getProjectById: getExampleProjectById,
  listCategories,
  listProjects,
  getProjectBySlug,
}

export async function getExampleProjectById(id: number) {
  const project = projects.find((item) => item.id === id)
  return project ? getProjectBySlug(project.slug) : null
}
