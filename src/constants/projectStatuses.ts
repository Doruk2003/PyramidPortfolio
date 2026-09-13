export const PROJECT_STATUS_LABELS = {
  design: 'Tasarım',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
} as const

export type ProjectStatus = keyof typeof PROJECT_STATUS_LABELS

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as ProjectStatus, label }),
)

export const DEFAULT_PROJECT_STATUS: ProjectStatus = 'design'

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && Object.hasOwn(PROJECT_STATUS_LABELS, value)
}
