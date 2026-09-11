<script setup lang="ts">
import type { Playlist, Track } from '~/types'

const api = useApi()
const library = useLibrary()
const toast = useToast()
const route = useRoute()

const tab = ref(route.query.tab === 'history' ? 'history' : 'playlists')
const history = ref<{ played_at: string, track: Track }[]>([])
const loadingHistory = ref(false)
const createOpen = ref(false)
const importOpen = ref(false)
const newName = ref('')
const newDescription = ref('')
const creating = ref(false)

onMounted(async () => {
  await library.fetchPlaylists()
  await loadCovers()
  await loadHistory()
})

const loadCovers = async () => {
  await Promise.allSettled(library.playlists.value.map(async (p) => {
    if (p.tracks?.length) return
    const data = await api.request<Playlist>(`/playlists/${p.id}`)
    p.tracks = data.tracks
  }))
}

const loadHistory = async () => {
  loadingHistory.value = true
  try {
    const data = await api.request<{ history: { played_at: string, track: Track }[] }>('/history')
    history.value = data.history
  } catch {
    history.value = []
  } finally {
    loadingHistory.value = false
  }
}

const playTrack = (result: { provider: string, provider_id: string }) => {
  const track = history.value.find(
    h => h.track.provider === result.provider && h.track.provider_id === result.provider_id
  )?.track
  if (!track) return
  try {
    library.playTrack(track)
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'Error', color: 'error' })
  }
}

const createPlaylist = async () => {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const created = await library.createPlaylist(newName.value.trim(), newDescription.value.trim() || undefined)
    createOpen.value = false
    newName.value = ''
    newDescription.value = ''
    await navigateTo(`/playlists/${created.id}`)
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'Error', color: 'error' })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="animate-fade-up">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl font-black tracking-tight">
        Tu biblioteca
      </h1>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-upload"
          label="Importar"
          color="neutral"
          variant="ghost"
          @click="importOpen = true"
        />
        <UButton
          icon="i-lucide-plus"
          label="Nueva playlist"
          @click="createOpen = true"
        />
      </div>
    </div>

    <div class="mt-5 grid w-fit grid-cols-2 gap-1 rounded-xl bg-night-800 p-1">
      <button
        type="button"
        class="rounded-lg px-4 py-1.5 text-sm font-semibold transition"
        :class="tab === 'playlists' ? 'grad-fill text-white' : 'text-zinc-400 hover:text-white'"
        @click="tab = 'playlists'"
      >
        Playlists
      </button>
      <button
        type="button"
        class="rounded-lg px-4 py-1.5 text-sm font-semibold transition"
        :class="tab === 'history' ? 'grad-fill text-white' : 'text-zinc-400 hover:text-white'"
        @click="tab = 'history'"
      >
        Historial
      </button>
    </div>

    <!-- Playlists -->
    <div
      v-if="tab === 'playlists'"
      class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <button
        v-for="p in library.playlists.value"
        :key="p.id"
        type="button"
        class="group glass text-left"
        @click="navigateTo(`/playlists/${p.id}`)"
      >
        <div class="relative flex aspect-video items-center justify-center overflow-hidden rounded-t-xl bg-night-800">
          <PlaylistCover :playlist="p" />
          <UIcon
            name="i-lucide-list-music"
            class="size-10 text-zinc-600 transition group-hover:text-brand-400"
          />
          <div class="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition group-hover:opacity-100">
            <UIcon
              name="i-lucide-play"
              class="size-8 text-white"
            />
          </div>
        </div>
        <div class="p-4">
          <p class="truncate font-semibold text-zinc-100">
            {{ p.name }}
          </p>
          <p class="mt-0.5 text-xs text-zinc-500">
            {{ p.tracks_count ?? 0 }} canciones
          </p>
        </div>
      </button>

      <button
        type="button"
        class="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-zinc-500 transition hover:border-brand-500/50 hover:text-brand-400"
        @click="createOpen = true"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-6"
        />
        <span class="text-sm">Nueva playlist</span>
      </button>
    </div>

    <!-- History -->
    <div
      v-else
      class="mt-6"
    >
      <div
        v-if="loadingHistory"
        class="space-y-2"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="h-14 animate-pulse rounded-xl bg-white/5"
        />
      </div>
      <div
        v-else-if="history.length"
        class="space-y-1"
      >
        <div
          v-for="h in history"
          :key="`${h.track.id}-${h.played_at}`"
        >
          <TrackRow
            :result="{
              provider: h.track.provider,
              provider_id: h.track.provider_id,
              title: h.track.title,
              artist: h.track.artist,
              album: h.track.album,
              duration: h.track.duration,
              artwork_url: h.track.artwork_url,
              stream_url: h.track.stream_url
            }"
            :track-id="h.track.id"
            @play="playTrack"
          />
          <p class="px-3 pb-1 text-[10px] text-zinc-600">
            Reproducida {{ new Date(h.played_at).toLocaleString() }}
          </p>
        </div>
      </div>
      <p
        v-else
        class="py-10 text-center text-sm text-zinc-600"
      >
        Todavía no has reproducido nada.
      </p>
    </div>

    <UModal v-model:open="createOpen">
      <template #header>
        <h2 class="font-semibold text-zinc-100">
          Nueva playlist
        </h2>
      </template>

      <template #body>
        <UForm
          :state="{ name: newName, description: newDescription }"
          @submit.prevent="createPlaylist"
        >
          <UFormField
            label="Nombre"
            name="name"
          >
            <UInput
              v-model="newName"
              class="w-full"
              placeholder="Ej. Roadtrip verano"
              autofocus
              required
            />
          </UFormField>
          <UFormField
            label="Descripción (opcional)"
            name="description"
            class="mt-3"
          >
            <UTextarea
              :model-value="newDescription ?? ''"
              :rows="2"
              class="w-full"
              placeholder="Un toquecito de contexto"
              @update:model-value="newDescription = String($event ?? '')"
            />
          </UFormField>
        </UForm>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            @click="createOpen = false"
          />
          <UButton
            label="Crear"
            :loading="creating"
            @click="createPlaylist"
          />
        </div>
      </template>
    </UModal>

    <PlaylistImportModal v-model:open="importOpen" />
  </div>
</template>
