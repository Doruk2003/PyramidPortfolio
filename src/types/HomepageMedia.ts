export type HomepageMediaRow = {
  id: number
  mode: 'image' | 'video'
  poster_path: string | null
  video_path: string | null
  version: number
  request_id: string | null
}
export interface HomepageMedia extends HomepageMediaRow {
  posterUrl: string
  videoUrl: string | null
}
export interface HomepageMediaInput {
  mode: 'image' | 'video'
  version: number
  posterPath: string | null
  videoPath: string | null
  posterFile: File | null
  videoFile: File | null
}
