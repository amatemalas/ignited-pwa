<script setup lang="ts">
import type { Playlist, SearchResult } from '~/types'

const props = defineProps<{
  result: SearchResult
  trackId?: number
  playlist?: Playlist | null
}>()

const emit = defineEmits<{ play: [result: SearchResult], removed: [] }>()

const player = usePlayer()
const library = useLibrary()
const toast = useToast()

const busy = ref(false)

const isCurrentTrack = computed(() => {
  const track = player.current.value
  return track && track.provider_id === props.result.provider_id && track.provider === props.result.provider
})

const isPlaying = computed(() => isCurrentTrack.value && player.isPlaying.value)

const onPlay = () => {
  emit('play', props.result)
}

const remove = async () => {
  if (!props.playlist) return
  busy.value = true
  try {
    const trackId = props.trackId ?? (await library.importTrack(props.result)).id
    await library.removeFromPlaylist(props.playlist.id, trackId)
    toast.add({ title: 'Eliminada de la playlist' })
    emit('removed')
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'Error', color: 'error' })
  } finally {
    busy.value = false
  }
}

const addTo = async (playlist: Playlist) => {
  busy.value = true
  try {
    await library.addToPlaylist(playlist.id, props.result)
    toast.add({ title: `Añadida a “${playlist.name}”` })
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'Error', color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div
    class="group grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-3 py-2.5 transition"
    :class="isCurrentTrack ? 'glass' : 'hover:bg-white/5'"
    data-track-row
    @dblclick="onPlay"
  >
    <div class="relative grid size-10 place-items-center overflow-hidden rounded-lg">
      <img
        v-if="result.artwork_url"
        :src="result.artwork_url"
        :alt="result.title"
        class="size-full object-cover"
        loading="lazy"
      >
      <div
        v-else
        class="grid size-10 place-items-center bg-night-800"
      >
        <UIcon
          name="i-lucide-music"
          class="size-5 text-zinc-500"
        />
      </div>

      <button
        type="button"
        class="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition group-hover:opacity-100"
        :class="isCurrentTrack ? 'opacity-100' : ''"
        @click="onPlay"
      >
        <UIcon
          :name="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'"
          class="size-4 text-white"
        />
      </button>
    </div>

    <div class="min-w-0">
      <p
        class="truncate text-sm font-semibold"
        :class="isCurrentTrack ? 'text-brand-300' : 'text-zinc-200'"
      >
        {{ result.title }}
      </p>
      <p class="flex items-center gap-1.5 truncate text-xs text-zinc-500">
        <span class="truncate">{{ result.artist ?? 'Desconocido' }}</span>
        <span class="inline-flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-px text-[10px] uppercase tracking-wide text-zinc-500">
          {{ result.provider }}
        </span>
      </p>
    </div>

    <div class="flex items-center gap-1">
      <UDropdownMenu
        v-if="library.playlists.value.length"
        :items="[{
          label: 'Añadir a',
          type: 'label'
        }, ...library.playlists.value.map((p: Playlist) => ({
          label: p.name,
          onSelect: () => addTo(p)
        }))]"
      >
        <UButton
          icon="i-lucide-plus"
          size="sm"
          color="neutral"
          variant="ghost"
          :loading="busy"
          aria-label="Añadir a playlist"
        />
      </UDropdownMenu>
      <UButton
        v-if="playlist"
        icon="i-lucide-trash-2"
        size="sm"
        color="neutral"
        variant="ghost"
        :loading="busy"
        aria-label="Quitar de la playlist"
        @click="remove"
      />
      <span class="w-10 text-right tabular-nums text-xs text-zinc-500">
        {{ formatDuration(result.duration) }}
      </span>
    </div>
  </div>
</template>
