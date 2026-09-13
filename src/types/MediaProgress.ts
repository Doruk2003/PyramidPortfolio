export interface MediaProgress {
  stage: 'preparing' | 'checking' | 'uploading' | 'saving' | 'verifying' | 'cleanup'
  completed: number
  total: number
  filename?: string
}
export type ReportMediaProgress = (progress: MediaProgress) => void
