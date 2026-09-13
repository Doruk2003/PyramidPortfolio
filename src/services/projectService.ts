import { catalog } from './catalog'
export const listProjects = () => catalog.listProjects()
export const getProjectBySlug = (slug: string) => catalog.getProjectBySlug(slug)

export const getProjectById = (id: number) => catalog.getProjectById(id)
