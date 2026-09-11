export interface SearchResult {
  provider: 'piped' | 'jamendo'
  provider_id: string
  title: string
  artist?: string | null
  album?: string | null
  duration?: number | null
  artwork_url?: string | null
  stream_url?: string | null
}

export interface Track {
  id: number
  provider: 'piped' | 'jamendo'
  provider_id: string
  title: string
  artist: string | null
  album: string | null
  duration: number | null
  artwork_url: string | null
  stream_url: string | null
  expires_at: string | null
}

export interface User {
  id: number
  name: string
  email: string
}

export interface Playlist {
  id: number
  name: string
  description: string | null
  tracks_count?: number
  tracks?: Track[]
  created_at?: string
  updated_at?: string
}

export interface SourceStatus {
  piped: { search_ok: boolean, instance: string | null }
  ytdlp: { installed: boolean }
  jamendo: { configured: boolean }
}

export interface ParsedTrack {
  title: string
  artist: string | null
  album: string | null
  provider_id?: string
  duration?: number | null
  artwork_url?: string | null
}

export interface ParsedPlaylist {
  name: string
  tracks: ParsedTrack[]
}

export interface ImportStats {
  total: number
  matched: number
  failed: number
  omitted: ParsedTrack[]
}

export interface ImportProgress {
  done: number
  total: number
  current: string
}
