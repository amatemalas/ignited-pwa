import type { Track } from '~/types'

const queue = ref<Track[]>([])
const currentIndex = ref(-1)
const isShuffling = ref(false)
const repeatMode = ref<'off' | 'all' | 'one'>('off')
const shuffleOrder = ref<number[]>([])
const position = ref(0)
const runtime = ref(0)
const isPlaying = ref(false)
const isLoading = ref(false)
const volume = ref(import.meta.client ? Number(localStorage.getItem('ignited_volume') ?? '0.9') : 0.9)
let loadSeq = 0
let activeLoadSeq = -1
let loadingTrackId: number | null = null
let failedInARow = 0

function makeAudio(): HTMLAudioElement | null {
  if (!import.meta.client) return null

  const g = globalThis as typeof globalThis & { __ignited_audio__?: HTMLAudioElement }
  const prev = g.__ignited_audio__
  if (prev) {
    // Evita solapamientos (p. ej. tras reload por HMR): descarta el elemento anterior.
    prev.pause()
    prev.removeAttribute('src')
    prev.load()
  }

  const a = new Audio()
  a.preload = 'metadata'

  a.addEventListener('timeupdate', () => {
    position.value = a.currentTime || 0
  })
  a.addEventListener('durationchange', () => {
    runtime.value = a.duration || 0
  })
  a.addEventListener('play', () => {
    isPlaying.value = true
    loadingTrackId = null
    activeLoadSeq = -1
    failedInARow = 0
  })
  a.addEventListener('pause', () => {
    isPlaying.value = false
  })
  a.addEventListener('ended', () => {
    if (repeatMode.value === 'one' && a) {
      a.currentTime = 0
      position.value = 0
      void a.play().catch(() => {})
      return
    }
    next()
  })
  a.addEventListener('error', () => {
    isPlaying.value = false
    isLoading.value = false
    const trackId = loadingTrackId
    if (trackId !== null && activeLoadSeq === loadSeq) {
      loadingTrackId = null
      activeLoadSeq = -1
      const failed = queue.value[currentIndex.value]
      if (failed && failed.id === trackId) skipUnavailable(failed)
    }
  })

  g.__ignited_audio__ = a
  return a
}

const audio = makeAudio()

const current = computed(() => (currentIndex.value >= 0 ? queue.value[currentIndex.value] ?? null : null))

interface QueueEntry {
  track: Track
  index: number
}

const orderedQueue = computed<QueueEntry[]>(() => {
  if (isShuffling.value && shuffleOrder.value.length) {
    const entries: QueueEntry[] = []
    for (const index of shuffleOrder.value) {
      const track = queue.value[index]
      if (track) entries.push({ track, index })
    }
    return entries
  }
  return queue.value.map((track, index) => ({ track, index }))
})

const isCurrent = (track: Track) => current.value?.id === track.id

function isStreamFresh(track: Track): boolean {
  if (!track.stream_url) return false
  if (!track.expires_at) return true
  return new Date(track.expires_at).getTime() > Date.now()
}

async function ensureStream(track: Track): Promise<Track> {
  if (!track.id || isStreamFresh(track)) {
    return track
  }

  try {
    const data = await useApi().request<{ stream_url: string, expires_at: string | null }>(
      `/tracks/${track.id}/stream`
    )
    if (data?.stream_url) {
      track.stream_url = data.stream_url
      track.expires_at = data.expires_at
    }
  } catch {
    // Fallback: reproduce con la URL almacenada (mejor esfuerzo).
  }

  return track
}

function stopPlayback() {
  if (!audio) return
  loadingTrackId = null
  activeLoadSeq = -1
  failedInARow = 0
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  position.value = 0
  runtime.value = 0
  isPlaying.value = false
  isLoading.value = false
}

function skipUnavailable(track: Track) {
  failedInARow += 1

  if (import.meta.client) {
    useToast().add({
      title: 'Canción no disponible',
      description: `“${track.title}” se ha omitido.`,
      color: 'warning'
    })
  }

  if (failedInARow >= queue.value.length) {
    failedInARow = 0
    stopPlayback()
    if (import.meta.client) {
      useToast().add({
        title: 'Sin canciones disponibles',
        description: 'No hay canciones que se puedan reproducir en esta cola.',
        color: 'warning'
      })
    }
    return
  }

  next()
}

const loadTrack = async (track: Track) => {
  if (!audio) return

  const seq = ++loadSeq
  isLoading.value = true

  const fresh = await ensureStream(track)
  if (seq !== loadSeq) return

  isLoading.value = false
  if (!fresh.stream_url) {
    loadingTrackId = null
    isPlaying.value = false
    skipUnavailable(track)
    return
  }

  loadingTrackId = fresh.id
  activeLoadSeq = seq

  // Misma fuente ya cargada: no reiniciamos (evita el doble de reproducción).
  if (audio.src === fresh.stream_url) {
    if (audio.paused) {
      void audio.play().catch(() => {
        failCurrentLoad(fresh)
      })
    } else {
      isPlaying.value = true
    }
    return
  }

  audio.pause()
  position.value = 0
  runtime.value = 0
  audio.src = fresh.stream_url
  updateMediaSession(fresh)
  void audio.play().catch(() => {
    failCurrentLoad(fresh)
  })
}

function failCurrentLoad(track: Track) {
  if (loadingTrackId !== null && loadingTrackId === track.id) {
    loadingTrackId = null
    activeLoadSeq = -1
    isPlaying.value = false
    isLoading.value = false
    skipUnavailable(track)
  }
}

const toggle = () => {
  if (!audio || !current.value) return
  if (audio.paused) void audio.play()
  else audio.pause()
}

function play(track?: Track) {
  if (!audio) return
  if (!track) {
    if (current.value) toggle()
    return
  }

  if (isCurrent(track)) {
    toggle()
    return
  }

  queue.value = [track]
  currentIndex.value = 0
  if (isShuffling.value) rebuildShuffleOrder()
  void loadTrack(track)

  if (import.meta.client) {
    useApi().request('/history', { method: 'POST', body: { track_id: track.id } }).catch(() => {})
  }
}

function playList(tracks: Track[], startIndex: number) {
  if (!audio || tracks.length === 0) return
  queue.value = tracks
  currentIndex.value = startIndex
  if (isShuffling.value) rebuildShuffleOrder()
  const first = tracks[startIndex]
  if (first) {
    void loadTrack(first)
    if (import.meta.client) {
      useApi().request('/history', { method: 'POST', body: { track_id: first.id } }).catch(() => {})
    }
  }
}

function playShuffled(tracks: Track[]) {
  if (!audio || tracks.length === 0) return
  queue.value = tracks
  isShuffling.value = true
  shuffleOrder.value = shuffleArray(tracks.map((_, i) => i))
  currentIndex.value = shuffleOrder.value[0] ?? -1
  const first = tracks[currentIndex.value]
  if (first) {
    void loadTrack(first)
    if (import.meta.client) {
      useApi().request('/history', { method: 'POST', body: { track_id: first.id } }).catch(() => {})
    }
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

function rebuildShuffleOrder() {
  const n = queue.value.length
  if (n === 0) {
    shuffleOrder.value = []
    return
  }
  const rest = Array.from({ length: n }, (_, i) => i).filter(i => i !== currentIndex.value)
  const shuffled = shuffleArray(rest)
  shuffleOrder.value = currentIndex.value >= 0 ? [currentIndex.value, ...shuffled] : shuffled
}

function toggleShuffle() {
  isShuffling.value = !isShuffling.value
  if (isShuffling.value) rebuildShuffleOrder()
  else shuffleOrder.value = []
}

const repeatOrder = ['off', 'all', 'one'] as const

function cycleRepeat() {
  const idx = repeatOrder.indexOf(repeatMode.value)
  repeatMode.value = repeatOrder[(idx + 1) % repeatOrder.length] ?? 'off'
}

function nextTrackIndex(): number | null {
  if (queue.value.length === 0) return null

  if (isShuffling.value && shuffleOrder.value.length) {
    const pos = shuffleOrder.value.indexOf(currentIndex.value)
    if (pos >= 0 && pos < shuffleOrder.value.length - 1) {
      return shuffleOrder.value[pos + 1] ?? null
    }
    return repeatMode.value === 'all' ? (shuffleOrder.value[0] ?? null) : null
  }

  if (currentIndex.value < queue.value.length - 1) {
    return currentIndex.value + 1
  }
  return repeatMode.value === 'all' ? 0 : null
}

function next() {
  if (!audio || queue.value.length === 0) return
  const target = nextTrackIndex()
  if (target === null) {
    stopPlayback()
    return
  }
  currentIndex.value = target
  const nextTrack = queue.value[currentIndex.value]
  if (nextTrack) void loadTrack(nextTrack)
}

function previous() {
  if (!audio) return
  if (audio.currentTime > 4) {
    audio.currentTime = 0
    return
  }
  let prevIndex: number | null = null
  if (isShuffling.value && shuffleOrder.value.length) {
    const pos = shuffleOrder.value.indexOf(currentIndex.value)
    if (pos > 0) prevIndex = shuffleOrder.value[pos - 1] ?? null
    else prevIndex = shuffleOrder.value[shuffleOrder.value.length - 1] ?? null
  } else if (currentIndex.value > 0) {
    prevIndex = currentIndex.value - 1
  }
  if (prevIndex !== null) {
    currentIndex.value = prevIndex
    const prevTrack = queue.value[currentIndex.value]
    if (prevTrack) void loadTrack(prevTrack)
  } else {
    audio.currentTime = 0
  }
}

const seek = (seconds: number) => {
  if (!audio) return
  audio.currentTime = seconds
}

function playAt(index: number) {
  if (!audio || index < 0 || index >= queue.value.length) return
  currentIndex.value = index
  const track = queue.value[index]
  if (track) void loadTrack(track)
}

const setVolume = (v: number) => {
  volume.value = v
  if (audio) audio.volume = v
  if (import.meta.client) localStorage.setItem('ignited_volume', String(v))
}

const updateMediaSession = (track: Track) => {
  if (!import.meta.client || !('mediaSession' in navigator)) {
    return
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist ?? 'Desconocido',
    album: track.album ?? '',
    artwork: track.artwork_url
      ? [{ src: track.artwork_url, sizes: '512x512', type: 'image/jpeg' }]
      : []
  })

  navigator.mediaSession.setActionHandler('play', () => toggle())
  navigator.mediaSession.setActionHandler('pause', () => toggle())
  navigator.mediaSession.setActionHandler('nexttrack', () => next())
  navigator.mediaSession.setActionHandler('previoustrack', () => previous())
  navigator.mediaSession.setActionHandler('seekto', (details: { seekTime?: number }) => {
    if (details.seekTime !== undefined) seek(details.seekTime)
  })
}

if (audio && volume.value > 0) {
  audio.volume = volume.value
}

export function usePlayer() {
  return {
    queue: readonly(queue),
    orderedQueue: readonly(orderedQueue),
    currentIndex: readonly(currentIndex),
    isShuffling: readonly(isShuffling),
    repeatMode: readonly(repeatMode),
    current: readonly(current),
    position: readonly(position),
    duration: readonly(runtime),
    isPlaying: readonly(isPlaying),
    isLoading: readonly(isLoading),
    volume: readonly(volume),
    isCurrent,
    play,
    playList,
    playShuffled,
    playAt,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat
  }
}
