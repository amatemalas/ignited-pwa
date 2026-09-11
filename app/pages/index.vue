<script setup lang="ts">
import type { SearchResult, SourceStatus } from '~/types'

const api = useApi()
const library = useLibrary()
const toast = useToast()
const config = useRuntimeConfig()

const allowYouTube = config.public.allowYouTube

const query = ref('')
const results = ref<SearchResult[]>([])
const searching = ref(false)
const hasSearched = ref(false)
const status = ref<SourceStatus | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  fetchStatus()
})

const fetchStatus = async () => {
  try {
    status.value = await api.request<SourceStatus>('/status')
  } catch {
    status.value = null
  }
}

const doSearch = async () => {
  const q = query.value.trim()
  if (!q) return

  searching.value = true
  hasSearched.value = true
  try {
    const data = await api.request<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}&limit=20`)
    const all = data.results
    results.value = allowYouTube ? all : all.filter(r => r.provider !== 'piped')
    if (results.value.length === 0) {
      toast.add({ title: 'Sin resultados', description: 'Prueba con otro término de búsqueda.', color: 'neutral' })
    }
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'Error', color: 'error' })
    results.value = []
  } finally {
    searching.value = false
  }
}

const onInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (query.value.trim()) doSearch()
  }, 450)
}

const playResult = async (result: SearchResult) => {
  try {
    await library.playResult(result)
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'No se pudo reproducir esta canción.', color: 'error' })
  }
}

const playAll = async () => {
  if (!results.value.length) return
  try {
    await library.playResults(results.value, 0)
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'Error', color: 'error' })
  }
}
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="animate-fade-up">
      <h1 class="text-4xl font-black tracking-tight sm:text-5xl">
        Tu música,
        <span class="grad-text">sin suscripciones</span>.
      </h1>
      <p class="mt-2 max-w-lg text-zinc-400">
        Busca en todo el catálogo abierto: {{ allowYouTube ? 'YouTube Music y el catálogo Creative Commons de Jamendo.' : 'el catálogo Creative Commons de Jamendo.' }}
      </p>

      <div class="relative mt-6 max-w-2xl">
        <UInput
          v-model="query"
          size="xl"
          icon="i-lucide-search"
          placeholder="Busca canciones, artistas, álbumes…"
          class="w-full"
          @input="onInput"
          @keydown.enter="doSearch"
        />
        <UButton
          v-if="searching"
          class="mt-4"
          color="neutral"
          variant="ghost"
          loading
          label="Buscando…"
        />
      </div>

      <!-- Source status -->
      <div class="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
        <span
          v-if="allowYouTube"
          class="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1"
        >
          <span
            class="size-1.5 rounded-full"
            :class="status?.piped.search_ok ? 'bg-emerald-400' : 'bg-ember-500'"
          />
          Piped
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
          <span
            class="size-1.5 rounded-full"
            :class="status?.jamendo.configured ? 'bg-emerald-400' : 'bg-zinc-600'"
          />
          Jamendo
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
          <span
            class="size-1.5 rounded-full"
            :class="status?.ytdlp.installed ? 'bg-emerald-400' : 'bg-ember-500'"
          />
          yt-dlp
        </span>
      </div>
    </section>

    <!-- Results -->
    <section
      v-if="hasSearched"
      class="mt-8 animate-fade-up"
    >
      <div class="mb-3 flex items-center justify-between">
        <p class="text-sm font-semibold text-zinc-300">
          {{ results.length }} resultados para “{{ query }}”
        </p>
        <UButton
          v-if="results.length"
          icon="i-lucide-play"
          size="sm"
          :label="`Reproducir todos (${results.length})`"
          @click="playAll"
        />
      </div>

      <div
        v-if="searching"
        class="space-y-2"
      >
        <div
          v-for="i in 6"
          :key="i"
          class="h-14 animate-pulse rounded-xl bg-white/5"
        />
      </div>

      <template v-else>
        <div class="space-y-1">
          <TrackRow
            v-for="result in results"
            :key="`${result.provider}:${result.provider_id}`"
            :result="result"
            @play="playResult"
          />
        </div>

        <p
          v-if="!searching && !results.length"
          class="mt-10 text-center text-sm text-zinc-600"
        >
          Nada por aquí todavía.
        </p>
      </template>
    </section>
  </div>
</template>
