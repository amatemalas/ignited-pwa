<script setup lang="ts">
import type { Playlist, Track } from '~/types'

const api = useApi()
const library = useLibrary()
const player = usePlayer()
const toast = useToast()
const route = useRoute()

const playlist = ref<Playlist | null>(null)
const loading = ref(true)
const notFound = ref(false)
const importOpen = ref(false)

const loadPlaylist = async () => {
  loading.value = true
  try {
    const data = await api.request<Playlist>(`/playlists/${route.params.id}`)
    playlist.value = data
    notFound.value = false
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadPlaylist()
  await library.fetchPlaylists()
})

const trackToResult = (track: Track) => ({
  provider: track.provider,
  provider_id: track.provider_id,
  title: track.title,
  artist: track.artist,
  album: track.album,
  duration: track.duration,
  artwork_url: track.artwork_url,
  stream_url: track.stream_url
})

const playAll = () => {
  const tracks = playlist.value?.tracks ?? []
  if (tracks.length) player.playShuffled(tracks)
}

const playTrack = (track: Track) => {
  try {
    library.playTrack(track)
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'Error', color: 'error' })
  }
}

const onPlayRow = (result: { provider: string, provider_id: string }) => {
  const track = playlist.value?.tracks?.find(
    t => t.provider === result.provider && t.provider_id === result.provider_id
  )
  if (track) playTrack(track)
}

const deleting = ref(false)
const deletePlaylist = async () => {
  if (!playlist.value) return
  deleting.value = true
  try {
    await api.request(`/playlists/${playlist.value.id}`, { method: 'DELETE' })
    await library.fetchPlaylists()
    await navigateTo('/library?tab=playlists')
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'Error', color: 'error' })
  } finally {
    deleting.value = false
  }
}

const trackQuery = ref('')
const filteredTracks = computed(() => {
  const q = trackQuery.value.trim().toLowerCase()
  const tracks = playlist.value?.tracks ?? []
  if (!q) return tracks
  return tracks.filter(t =>
    t.title.toLowerCase().includes(q)
    || (t.artist ?? '').toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="animate-fade-up">
    <div
      v-if="loading"
      class="space-y-2"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="h-14 animate-pulse rounded-xl bg-white/5"
      />
    </div>

    <p
      v-else-if="notFound"
      class="py-16 text-center text-zinc-500"
    >
      Playlist no encontrada.
    </p>

    <template v-else-if="playlist">
      <header class="flex items-end justify-between gap-4 pb-6">
        <div class="flex items-center gap-4">
          <div class="relative grid size-24 place-items-center overflow-hidden rounded-2xl grad-fill art-glow sm:size-28">
            <PlaylistCover :playlist="playlist" />
            <UIcon
              name="i-lucide-list-music"
              class="size-10 text-white sm:size-12"
            />
          </div>
          <div>
            <UButton
              icon="i-lucide-arrow-left"
              size="xs"
              color="neutral"
              variant="ghost"
              label="Biblioteca"
              to="/library"
            />
            <h1 class="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
              {{ playlist.name }}
            </h1>
            <p
              v-if="playlist.description"
              class="mt-1 max-w-md text-sm text-zinc-400"
            >
              {{ playlist.description }}
            </p>
            <p class="mt-1 text-xs text-zinc-500">
              {{ playlist.tracks?.length ?? 0 }} canciones
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-upload"
            color="neutral"
            variant="ghost"
            aria-label="Importar canciones"
            @click="importOpen = true"
          />
          <UButton
            icon="i-lucide-play"
            :label="playlist.tracks?.length ? 'Reproducir' : 'Vacía'"
            :disabled="!playlist.tracks?.length"
            @click="playAll"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            :loading="deleting"
            aria-label="Eliminar playlist"
            @click="deletePlaylist"
          />
        </div>
      </header>

      <div class="space-y-1">
        <div v-if="playlist.tracks?.length">
          <UInput
            v-model="trackQuery"
            size="sm"
            icon="i-lucide-search"
            placeholder="Buscar en la playlist…"
            class="mb-3 max-w-md"
            clearable
          />
        </div>

        <TrackRow
          v-for="track in filteredTracks"
          :key="track.id"
          :result="trackToResult(track)"
          :track-id="track.id"
          :playlist="playlist"
          @play="onPlayRow"
          @removed="loadPlaylist"
        />
      </div>

      <p
        v-if="playlist.tracks?.length && !filteredTracks.length"
        class="py-10 text-center text-sm text-zinc-600"
      >
        Sin coincidencias para “{{ trackQuery }}”.
      </p>

      <p
        v-if="!playlist.tracks?.length"
        class="py-10 text-center text-sm text-zinc-600"
      >
        Añade canciones desde la búsqueda con el botón <UIcon
          name="i-lucide-plus"
          class="inline size-4"
        />.
      </p>
    </template>

    <PlaylistImportModal
      v-model:open="importOpen"
      :fixed-playlist-id="playlist?.id ?? null"
      :fixed-playlist-name="playlist?.name"
      @done="loadPlaylist"
    />
  </div>
</template>
