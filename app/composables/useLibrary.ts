import type { Playlist, SearchResult, Track } from '~/types'

const playlists = ref<Playlist[]>([])

export function useLibrary() {
  const api = useApi()
  const player = usePlayer()

  async function fetchPlaylists() {
    const data = await api.request<{ playlists: Playlist[] }>('/playlists')
    playlists.value = data.playlists
  }

  async function createPlaylist(name: string, description?: string) {
    const created = await api.request<Playlist>('/playlists', {
      method: 'POST',
      body: { name, description: description || undefined }
    })
    await fetchPlaylists()
    return created
  }

  async function importTrack(result: SearchResult): Promise<Track> {
    return api.request<Track>('/tracks', {
      method: 'POST',
      body: {
        provider: result.provider,
        provider_id: result.provider_id,
        title: result.title,
        artist: result.artist ?? undefined,
        album: result.album ?? undefined,
        duration: result.duration ?? undefined,
        artwork_url: result.artwork_url ?? undefined,
        stream_url: result.stream_url ?? undefined
      }
    })
  }

  async function playResult(result: SearchResult) {
    const track = await importTrack(result)
    player.play(track)
  }

  function playTrack(track: Track) {
    player.play(track)
  }

  async function playResults(results: SearchResult[], startIndex: number) {
    const tracks = await Promise.all(results.map(r => importTrack(r)))
    player.playList(tracks, startIndex)
  }

  async function addToPlaylist(playlistId: number, result: SearchResult) {
    const track = await importTrack(result)
    await api.request(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: { track_id: track.id }
    })
  }

  async function removeFromPlaylist(playlistId: number, trackId: number) {
    await api.request(`/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' })
  }

  return {
    playlists,
    fetchPlaylists,
    createPlaylist,
    importTrack,
    playResult,
    playTrack,
    playResults,
    addToPlaylist,
    removeFromPlaylist
  }
}
