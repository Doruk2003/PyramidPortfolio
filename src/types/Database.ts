// Schema contract for supabase/migrations/202609120001_portfolio.sql.
// Regenerate with the Supabase CLI after future schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type CategoryRow = { id: number; name: string; slug: string }
export type ProjectRow = {
  hero_media?: 'image' | 'youtube'
  youtube_video_id?: string | null
  id: number
  request_id: string
  created_by: string
  title: string
  slug: string
  version: number
  updated_at: string
  description: string
  location: string
  year: number
  status: string
  created_at: string
}
export type MediaRow = {
  title?: string
  description?: string
  id: number
  project_id: number
  kind: string
  position: number
  object_path: string
}
type Table<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] }
export interface Database {
  public: {
    Tables: {
      project_categories: Table<{ project_id: number; category_id: number }>
      media_cleanup: Table<{ object_path: string; queued_at: string }>
      categories: Table<CategoryRow>
      projects: Table<ProjectRow>
      project_media: Table<MediaRow>
    }
    Views: { [_ in never]: never }
    Functions: {
      save_portfolio_project_presentation: Database['public']['Functions']['save_portfolio_project']
      save_portfolio_project_video: Database['public']['Functions']['save_portfolio_project']
      save_portfolio_project_gallery: Database['public']['Functions']['save_portfolio_project']
      save_portfolio_project: {
        Args: {
          p_project_id: number | null
          p_expected_version: number | null
          p_request_id: string
          p_project: Json
          p_media: Json
        }
        Returns: number
      }
      delete_portfolio_project: {
        Args: { p_project_id: number; p_expected_version: number }
        Returns: boolean
      }
      create_portfolio_project: {
        Args: { p_request_id: string; p_project: Json; p_media: Json }
        Returns: number
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
