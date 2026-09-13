export class ProjectWriteError extends Error {
  readonly code:
    | 'gallery_setup_required'
    | 'conflict'
    | 'not_found'
    | 'not_configured'
    | 'duplicate_slug'
    | 'failed'
    | 'outcome_unknown'
    | 'cleanup_failed'
  constructor(code: ProjectWriteError['code']) {
    super(code)
    this.name = 'ProjectWriteError'
    this.code = code
  }
}
