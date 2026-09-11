import type { ImportProgress, ImportStats, ParsedPlaylist, ParsedTrack, SearchResult, SourceStatus } from '~/types'

const CONCURRENCY = 4
const MIN_SCORE = 2.5
const DEFAULT_NAME = 'Playlist importada'
const MAX_PLAYLIST_TRACKS = 1000

interface PipedPlaylistResponse {
  name?: string
  nextpage?: string | null
  relatedStreams?: Array<{
    type?: string
    title?: string | null
    url?: string | null
    thumbnail?: string | null
    uploaderName?: string | null
    duration?: number | null
  }>
}

interface InvidiousThumbnail {
  quality?: string
  url?: string
}

interface InvidiousPlaylistResponse {
  title?: string
  videos?: Array<{
    title?: string | null
    videoId?: string
    author?: string | null
    lengthSeconds?: number | null
    videoThumbnails?: InvidiousThumbnail[]
  }>
  continuation?: string | null
}

const INVIDIOUS_FALLBACKS = [
  'https://inv.nadeko.net',
  'https://invidious.f5.si'
]

const TITLE_HEADER_WORDS = new Set([
  'name', 'title', 'track', 'song', 'sid', 'titel', 'titre',
  'nombre', 'tema', 'cancion', 'canción'
])

const HEADER_TITLE_KEYS = ['name', 'title', 'track', 'song', 'cancion', 'canción']
const HEADER_ARTIST_KEYS = ['artist', 'artista', 'author', 'autor']
const HEADER_ALBUM_KEYS = ['album', 'álbum']
const HEADER_PLAYLIST_KEYS = ['playlist', 'playlist name', 'list', 'collection title', 'nombre de playlist']

const ALL_HEADER_KEYS = new Set([
  ...HEADER_TITLE_KEYS,
  ...HEADER_ARTIST_KEYS,
  ...HEADER_ALBUM_KEYS,
  ...HEADER_PLAYLIST_KEYS
])

const STOP_WORDS = new Set([
  'official', 'video', 'audio', 'lyrics', 'lyric', 'mv', 'hd', 'hq',
  '4k', 'remaster', 'remastered', 'videoclip', 'clip'
])

interface ColumnMap {
  title: number
  artist?: number
  album?: number
  playlist?: number
}

function normHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function csvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some(cell => cell.trim())) rows.push(row)
      row = []
    } else {
      field += c
    }
  }

  row.push(field)
  if (row.some(cell => cell.trim())) rows.push(row)
  return rows
}

function firstKey(map: Map<string, number>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = map.get(key)
    if (value !== undefined) return value
  }
  return undefined
}

function detectColumns(row: string[]): ColumnMap | null {
  if (!ALL_HEADER_KEYS.has(normHeader(row[0] ?? ''))) return null

  const map = new Map<string, number>()
  row.forEach((cell, i) => {
    const key = normHeader(cell)
    if (key) map.set(key, i)
  })

  const title = firstKey(map, HEADER_TITLE_KEYS)
  if (title === undefined) return null

  const cols: ColumnMap = { title }
  const artist = firstKey(map, HEADER_ARTIST_KEYS)
  if (artist !== undefined) cols.artist = artist
  const album = firstKey(map, HEADER_ALBUM_KEYS)
  if (album !== undefined) cols.album = album
  const playlist = firstKey(map, HEADER_PLAYLIST_KEYS)
  if (playlist !== undefined) cols.playlist = playlist
  return cols
}

function dedupeTrack(track: ParsedTrack): string {
  return `${track.title.toLowerCase()}|${(track.artist ?? '').toLowerCase()}`
}

function dedupeGroups(groups: Map<string, ParsedTrack[]>): ParsedPlaylist[] {
  const playlists: ParsedPlaylist[] = []
  for (const [name, tracks] of groups) {
    const seen = new Set<string>()
    const unique: ParsedTrack[] = []
    for (const track of tracks) {
      const key = dedupeTrack(track)
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(track)
    }
    if (unique.length) playlists.push({ name, tracks: unique })
  }
  return playlists
}

function parsePlaylists(text: string, name = DEFAULT_NAME): ParsedPlaylist[] {
  const rows = csvRows(text)
  if (!rows.length) return []

  let cols: ColumnMap | null = null
  let start = 0
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const row = rows[i]
    if (!row) continue
    const detected = detectColumns(row)
    if (detected) {
      cols = detected
      start = i + 1
      break
    }
  }

  const groups = new Map<string, ParsedTrack[]>()

  if (cols) {
    for (let i = start; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      const title = (row[cols.title] ?? '').trim()
      if (!title) continue

      const artistCell = cols.artist !== undefined ? (row[cols.artist] ?? '').trim() : ''
      const albumCell = cols.album !== undefined ? (row[cols.album] ?? '').trim() : ''
      if (TITLE_HEADER_WORDS.has(normHeader(title)) && !artistCell && !albumCell) continue

      const track: ParsedTrack = { title, artist: artistCell || null, album: albumCell || null }
      let groupName = name
      if (cols.playlist !== undefined) {
        const playlistCell = (row[cols.playlist] ?? '').trim()
        if (playlistCell) groupName = playlistCell
      }

      const list = groups.get(groupName) ?? []
      list.push(track)
      groups.set(groupName, list)
    }
  } else {
    let i = 0
    if (rows[0]?.[0] && TITLE_HEADER_WORDS.has(normHeader(rows[0][0].trim()))) i = 1

    for (; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[0]?.trim()) continue

      let title = row[0].trim()
      let artist = (row[1] ?? '').trim()
      if (!artist && title.includes(' - ')) {
        const parts = title.split(' - ')
        artist = parts.shift()!.trim()
        title = parts.join(' - ').trim()
      }
      if (TITLE_HEADER_WORDS.has(normHeader(title)) && !artist) continue

      const track: ParsedTrack = {
        title,
        artist: artist || null,
        album: (row[2] ?? '').trim() || null
      }
      const list = groups.get(name) ?? []
      list.push(track)
      groups.set(name, list)
    }
  }

  return dedupeGroups(groups)
}

function normForScore(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactTokens(s: string): string[] {
  return normForScore(s)
    .split(' ')
    .filter(Boolean)
    .filter(token => !STOP_WORDS.has(token))
}

function compactString(s: string): string {
  return compactTokens(s).join(' ')
}

function scoreResult(result: SearchResult, track: ParsedTrack): number {
  const queryTitle = compactString(track.title)
  const resultTitle = compactString(result.title ?? '')
  const queryArtist = compactString(track.artist ?? '')
  const resultArtist = compactString(result.artist ?? '')

  if (!queryTitle || !resultTitle) return -Infinity

  let score = 0

  if (resultTitle === queryTitle) {
    score += 4
  } else {
    const query = compactTokens(track.title)
    const rt = compactTokens(result.title ?? '')
    const hits = query.filter(token => rt.includes(token)).length
    score += (hits / Math.max(1, query.length, rt.length)) * 3
  }

  if (queryArtist) {
    if (resultArtist === queryArtist) {
      score += 2
    } else {
      const query = compactTokens(track.artist ?? '')
      const rt = compactTokens(result.artist ?? '')
      const hits = query.filter(token => rt.includes(token)).length
      score += (hits / Math.max(1, query.length, rt.length)) * 1.5
    }
  }

  if (track.album && normForScore(track.album) === normForScore(result.album ?? '')) score += 1
  if (result.provider === 'piped') score += 0.5

  return score
}

function pickBestResult(track: ParsedTrack, results: SearchResult[]): SearchResult | null {
  let best: SearchResult | null = null
  let bestScore = -Infinity
  for (const result of results) {
    const s = scoreResult(result, track)
    if (s > bestScore) {
      bestScore = s
      best = result
    }
  }
  return bestScore >= MIN_SCORE ? best : null
}

function extractPlaylistId(url: string): string | null {
  const trimmed = url.trim()
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed
  const match = trimmed.match(/[?&]list=([A-Za-z0-9_-]{10,})/)
  return match ? (match[1] ?? null) : null
}

function streamVideoId(url: string): string | null {
  const match = url.match(/[?&]v=([A-Za-z0-9_-]{11})/)
  return match ? (match[1] ?? null) : null
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let index = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++
      const item = items[current]
      if (item) await fn(item)
    }
  })
  await Promise.all(workers)
}

export function usePlaylistImport() {
  const api = useApi()
  const library = useLibrary()

  async function searchTrack(track: ParsedTrack): Promise<SearchResult | null> {
    const query = [track.artist, track.title].filter(Boolean).join(' ')
    const data = await api.request<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}&limit=20`)
    return pickBestResult(track, data.results ?? [])
  }

  function absoluteUrl(url: string | null | undefined, base: string): string | null {
    if (!url) return null
    if (/^https?:\/\//i.test(url)) return url
    try {
      return new URL(url, base).href
    } catch {
      return null
    }
  }

  async function fetchPipedPlaylist(id: string, instance: string): Promise<ParsedPlaylist | null> {
    const tracks: ParsedTrack[] = []
    const seen = new Set<string>()
    let name: string | undefined
    let nextpage: string | undefined

    while (tracks.length < MAX_PLAYLIST_TRACKS) {
      const params = new URLSearchParams()
      if (nextpage) params.set('nextpage', nextpage)
      const query = params.toString() ? `?${params.toString()}` : ''

      const res = await fetch(`${instance}/playlists/${encodeURIComponent(id)}${query}`, {
        headers: { Accept: 'application/json' }
      })
      if (!res.ok) return null

      const data = await res.json() as PipedPlaylistResponse
      if (!name && data.name) name = data.name
      for (const stream of data.relatedStreams ?? []) {
        if (stream.type !== 'stream') continue
        const videoId = streamVideoId(stream.url ?? '')
        if (!videoId || seen.has(videoId)) continue
        seen.add(videoId)
        tracks.push({
          title: (stream.title ?? '').trim() || 'Desconocido',
          artist: stream.uploaderName ?? null,
          album: null,
          provider_id: videoId,
          duration: stream.duration ?? null,
          artwork_url: absoluteUrl(stream.thumbnail, instance)
        })
      }

      nextpage = data.nextpage ?? undefined
      if (!nextpage) break
    }

    return tracks.length ? { name: name ?? 'Playlist importada', tracks } : null
  }

  async function fetchInvidiousPlaylist(id: string, base: string): Promise<ParsedPlaylist | null> {
    const tracks: ParsedTrack[] = []
    const seen = new Set<string>()
    let name: string | undefined
    let continuation: string | undefined

    while (tracks.length < MAX_PLAYLIST_TRACKS) {
      const params = new URLSearchParams()
      if (continuation) params.set('continuation', continuation)
      const query = params.toString() ? `?${params.toString()}` : ''

      const res = await fetch(`${base}/api/v1/playlists/${encodeURIComponent(id)}${query}`, {
        headers: { Accept: 'application/json' }
      })
      if (!res.ok) return null

      const data = await res.json() as InvidiousPlaylistResponse
      if (!name && data.title) name = data.title
      for (const video of data.videos ?? []) {
        const videoId = video.videoId ?? ''
        if (!videoId || seen.has(videoId)) continue
        seen.add(videoId)
        tracks.push({
          title: (video.title ?? '').trim() || 'Desconocido',
          artist: video.author ?? null,
          album: null,
          provider_id: videoId,
          duration: video.lengthSeconds ?? null,
          artwork_url: thumbnailUrl(video.videoThumbnails, base)
        })
      }

      continuation = data.continuation ?? undefined
      if (!continuation) break
    }

    return tracks.length ? { name: name ?? 'Playlist importada', tracks } : null
  }

  async function invidiousCandidates(): Promise<string[]> {
    const candidates = [...INVIDIOUS_FALLBACKS]
    try {
      const res = await fetch('https://api.invidious.io/instances.json?sort_by=health', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000)
      })
      if (res.ok) {
        const data = await res.json() as unknown
        if (Array.isArray(data)) {
          for (const entry of data) {
            const base = entry?.[1]?.uri
            if (typeof base === 'string' && base.startsWith('https://') && !candidates.includes(base)) {
              candidates.push(base)
            }
          }
        }
      }
    } catch {
      // La lista de instancias no está disponible; usar las predeterminadas.
    }
    return candidates.slice(0, 6)
  }

  async function fetchPlaylistByUrl(url: string): Promise<ParsedPlaylist> {
    const id = extractPlaylistId(url)
    if (!id) {
      throw new Error('El enlace no parece ser de una playlist pública de YouTube.')
    }

    const failures: string[] = []

    try {
      const status = await api.request<SourceStatus>('/status')
      const instance = (status.piped?.instance ?? '').replace(/\/+$/, '')
      if (instance) {
        try {
          const piped = await fetchPipedPlaylist(id, instance)
          if (piped) return piped
          failures.push(`${instance} no devolvió canciones`)
        } catch {
          failures.push(`${instance} no es accesible desde el navegador`)
        }
      }
    } catch {
      failures.push('no se pudo consultar el estado del servidor')
    }

    for (const base of await invidiousCandidates()) {
      try {
        const invidious = await fetchInvidiousPlaylist(id, base)
        if (invidious) return invidious
        failures.push(`${base} no devolvió canciones`)
      } catch {
        failures.push(`${base} no es accesible desde el navegador`)
      }
    }

    throw new Error(
      `No se pudo leer la playlist desde ninguna fuente. Verifica que sea pública o prueba con el CSV. (${failures.join(' | ')})`
    )
  }

  function thumbnailUrl(thumbnails: InvidiousThumbnail[] | undefined, base: string): string | null {
    const preferred = ['maxres', 'sd', 'hq', 'mq', 'default']
    for (const quality of preferred) {
      const found = thumbnails?.find(t => t.quality === quality)?.url
      if (found) return absoluteUrl(found, base)
    }
    const first = thumbnails?.[0]?.url
    return first ? absoluteUrl(first, base) : null
  }

  function toSearchResult(track: ParsedTrack): SearchResult | null {
    if (!track.provider_id) return null
    return {
      provider: 'piped',
      provider_id: track.provider_id,
      title: track.title,
      artist: track.artist ?? undefined,
      album: track.album ?? undefined,
      duration: track.duration ?? undefined,
      artwork_url: track.artwork_url ?? null,
      stream_url: null
    }
  }

  async function importParsedPlaylist(
    playlist: ParsedPlaylist,
    options: {
      targetPlaylistId?: number
      newPlaylistName?: string
      isCancelled?: () => boolean
      onProgress?: (progress: ImportProgress) => void
    } = {}
  ): Promise<ImportStats> {
    const stats: ImportStats = { total: playlist.tracks.length, matched: 0, failed: 0, omitted: [] }

    let playlistId = options.targetPlaylistId
    if (!playlistId) {
      const created = await library.createPlaylist(options.newPlaylistName ?? playlist.name)
      playlistId = created.id
    }

    const state = { done: 0, current: '' }

    await mapPool(playlist.tracks, CONCURRENCY, async (track) => {
      if (options.isCancelled?.()) return
      state.current = track.title
      const lastOmitted = stats.omitted.length
      try {
        const result = toSearchResult(track) ?? await searchTrack(track)
        if (result) {
          await library.addToPlaylist(playlistId!, result)
          stats.matched++
        } else {
          stats.omitted.push(track)
        }
      } catch {
        stats.failed++
        if (stats.omitted.length === lastOmitted) stats.omitted.push(track)
      } finally {
        state.done++
        options.onProgress?.({ done: state.done, total: playlist.tracks.length, current: state.current })
      }
    })

    return stats
  }

  return { parsePlaylists, fetchPlaylistByUrl, importParsedPlaylist }
}
