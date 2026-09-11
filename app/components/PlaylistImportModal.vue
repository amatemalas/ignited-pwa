<script setup lang="ts">
import type { ImportStats, ParsedPlaylist } from '~/types'

const props = defineProps<{
  open: boolean
  fixedPlaylistId?: number | null
  fixedPlaylistName?: string
}>()

const emit = defineEmits<{ 'update:open': [value: boolean], 'done': [] }>()

const library = useLibrary()
const importer = usePlaylistImport()
const toast = useToast()

const sourceTab = ref<'link' | 'file' | 'paste'>('link')
const linkUrl = ref('')
const linkBusy = ref(false)
const linkError = ref<string | null>(null)
const fileName = ref('')
const fileContent = ref('')
const pasteText = ref('')
const parsed = ref<ParsedPlaylist[]>([])
const parseError = ref<string | null>(null)

const appendFixed = computed(() => props.fixedPlaylistId != null)
const mode = ref<'create' | 'append'>('create')
const newName = ref('Mis importaciones')
const appendId = ref<number | undefined>(props.fixedPlaylistId ?? undefined)

const importing = ref(false)
const cancelled = ref(false)
const progress = ref({ done: 0, total: 0, current: '' })
const stats = ref<ImportStats | null>(null)
const showOmitted = ref(false)

const totalTracks = computed(() => parsed.value.reduce((n, p) => n + p.tracks.length, 0))

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const reset = () => {
  sourceTab.value = 'link'
  linkUrl.value = ''
  linkBusy.value = false
  linkError.value = null
  fileName.value = ''
  fileContent.value = ''
  pasteText.value = ''
  parsed.value = []
  parseError.value = null
  mode.value = appendFixed.value ? 'append' : 'create'
  newName.value = 'Mis importaciones'
  appendId.value = props.fixedPlaylistId ?? undefined
  importing.value = false
  cancelled.value = false
  progress.value = { done: 0, total: 0, current: '' }
  stats.value = null
  showOmitted.value = false
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    reset()
  } else if (importing.value) {
    cancelled.value = true
  }
})

watch(() => props.fixedPlaylistId, (id) => {
  appendId.value = id ?? undefined
})

const fileNameBase = computed(() => {
  if (!fileName.value) return 'Mis importaciones'
  return fileName.value.replace(/\.[^.]*$/, '').trim() || 'Mis importaciones'
})

const parseCurrent = () => {
  parseError.value = null
  const text = sourceTab.value === 'file' ? fileContent.value : pasteText.value
  if (!text.trim()) {
    parsed.value = []
    return
  }
  try {
    parsed.value = importer.parsePlaylists(text, fileNameBase.value)
  } catch {
    parsed.value = []
    parseError.value = 'No se pudo leer el archivo. Asegúrate de que el CSV tenga el formato de YouTube Music.'
  }
}

const onFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  readFile(file)
}

const onDrop = (event: DragEvent) => {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  readFile(file)
}

const readFile = (file: File) => {
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    fileContent.value = String(reader.result ?? '')
    parseCurrent()
  }
  reader.onerror = () => {
    parseError.value = 'No se pudo leer el archivo.'
  }
  reader.readAsText(file)
}

const clearFile = () => {
  fileName.value = ''
  fileContent.value = ''
  parsed.value = []
  progress.value = { done: 0, total: 0, current: '' }
}

const onPasteInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(parseCurrent, 300)
}

const switchSource = (tab: 'link' | 'file' | 'paste') => {
  sourceTab.value = tab
  parsed.value = []
  parseError.value = null
  linkError.value = null
  if (tab === 'paste' && pasteText.value.trim()) parseCurrent()
}

const parseLink = async () => {
  const url = linkUrl.value.trim()
  if (!url || linkBusy.value) return
  linkBusy.value = true
  linkError.value = null
  try {
    parsed.value = [await importer.fetchPlaylistByUrl(url)]
    linkUrl.value = ''
  } catch (e) {
    parsed.value = []
    linkError.value = e instanceof Error ? e.message : 'No se pudo leer la playlist.'
    toast.add({ title: linkError.value, color: 'error' })
  } finally {
    linkBusy.value = false
  }
}

const canImport = computed(() => {
  if (!parsed.value.length || importing.value) return false
  if (mode.value === 'append' && !appendFixed.value) return appendId.value != null
  return true
})

const runImport = async () => {
  if (!canImport.value) return
  importing.value = true
  cancelled.value = false
  stats.value = null
  progress.value = { done: 0, total: totalTracks.value, current: '' }

  const totals: ImportStats = { total: 0, matched: 0, failed: 0, omitted: [] }
  let done = 0

  try {
    for (const playlist of parsed.value) {
      if (cancelled.value) break
      const options = mode.value === 'append' || appendFixed.value
        ? { targetPlaylistId: props.fixedPlaylistId ?? appendId.value ?? undefined }
        : { newPlaylistName: parsed.value.length === 1 ? newName.value.trim() || playlist.name : playlist.name }

      const result = await importer.importParsedPlaylist(playlist, {
        ...options,
        isCancelled: () => cancelled.value,
        onProgress: (p) => {
          progress.value = { done: done + p.done, total: totalTracks.value, current: p.current }
        }
      })

      done += result.total
      totals.total += result.total
      totals.matched += result.matched
      totals.failed += result.failed
      totals.omitted.push(...result.omitted)
    }

    stats.value = totals
    await library.fetchPlaylists()
    emit('done')

    if (totals.matched) {
      toast.add({ title: `Importadas ${totals.matched} de ${totals.total} canciones`, color: 'success' })
    } else if (!totals.failed) {
      toast.add({
        title: 'Sin coincidencias',
        description: 'No se encontraron resultados para ninguna canción. Reintenta con otra búsqueda manual.',
        color: 'neutral'
      })
    }
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'No se pudo importar la playlist.', color: 'error' })
  } finally {
    importing.value = false
  }
}

const onOpenChange = (value: boolean) => {
  if (!value && importing.value) cancelled.value = true
  emit('update:open', value)
}

const omittedCount = computed(() => (stats.value?.omitted.length ?? 0) - (stats.value?.failed ?? 0))
</script>

<template>
  <UModal
    :open="open"
    @update:open="onOpenChange"
  >
    <template #header>
      <h2 class="font-semibold text-zinc-100">
        Importar playlists de YouTube Music
      </h2>
    </template>

    <template #body>
      <p class="mb-4 text-sm text-zinc-500">
        Pega el enlace de una playlist pública, o exporta tus listas desde Google Takeout
        (<span class="text-zinc-300">YouTube Music → Tus listas</span>) y sube el CSV.
      </p>

      <div class="mb-4 grid w-fit grid-cols-3 gap-1 rounded-xl bg-night-800 p-1">
        <button
          type="button"
          class="rounded-lg px-4 py-1.5 text-sm font-semibold transition"
          :class="sourceTab === 'link' ? 'grad-fill text-white' : 'text-zinc-400 hover:text-white'"
          @click="switchSource('link')"
        >
          Enlace
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-1.5 text-sm font-semibold transition"
          :class="sourceTab === 'file' ? 'grad-fill text-white' : 'text-zinc-400 hover:text-white'"
          @click="switchSource('file')"
        >
          Archivo
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-1.5 text-sm font-semibold transition"
          :class="sourceTab === 'paste' ? 'grad-fill text-white' : 'text-zinc-400 hover:text-white'"
          @click="switchSource('paste')"
        >
          Pegar texto
        </button>
      </div>

      <div
        v-if="sourceTab === 'link'"
        class="space-y-3 mb-4"
      >
        <p class="text-sm text-zinc-500">
          Pega el enlace de una playlist pública de YouTube Music o YouTube y se importará automáticamente.
        </p>
        <UInput
          v-model="linkUrl"
          icon="i-lucide-link"
          size="lg"
          class="w-full"
          placeholder="https://music.youtube.com/playlist?list=…"
          aria-label="Enlace de la playlist"
          @keydown.enter="parseLink"
        />
        <UButton
          icon="i-lucide-sparkles"
          label="Analizar enlace"
          :loading="linkBusy"
          :disabled="!linkUrl.trim()"
          @click="parseLink"
        />
        <p
          v-if="linkError"
          class="text-xs text-red-400"
        >
          {{ linkError }}
        </p>
      </div>

      <template v-if="sourceTab === 'file'">
        <div
          class="rounded-xl border border-dashed border-white/10 p-5 text-center transition hover:border-brand-500/40"
          @dragover.prevent
          @drop.prevent="onDrop"
        >
          <label class="flex cursor-pointer flex-col items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
            <UIcon
              name="i-lucide-file-up"
              class="size-6"
            />
            <span>{{ fileName || 'Arrastra el CSV aquí o toca para elegirlo' }}</span>
            <span class="text-[11px] text-zinc-600">CSV con las columnas Name, Artist, Album (formato de Google Takeout)</span>
            <input
              type="file"
              accept=".csv,text/csv"
              class="hidden"
              @change="onFileChange"
            >
          </label>
          <UButton
            v-if="fileName"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            label="Quitar"
            class="mt-2"
            @click="clearFile"
          />
        </div>
      </template>

      <UTextarea
        v-else
        :model-value="pasteText"
        :rows="6"
        class="w-full"
        placeholder="Pega aquí el contenido del CSV…"
        @update:model-value="pasteText = String($event ?? '')"
        @input="onPasteInput"
      />

      <p
        v-if="parseError"
        class="mt-3 text-xs text-red-400"
      >
        {{ parseError }}
      </p>

      <div
        v-if="parsed.length"
        class="mt-4 space-y-2"
      >
        <div
          v-for="playlist in parsed"
          :key="playlist.name"
          class="glass flex items-center justify-between rounded-xl px-4 py-2.5"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-zinc-200">
              {{ playlist.name }}
            </p>
            <p class="text-xs text-zinc-500">
              {{ playlist.tracks.length }} canciones
            </p>
          </div>
          <UIcon
            name="i-lucide-music-2"
            class="size-4 shrink-0 text-zinc-600"
          />
        </div>
      </div>

      <div class="mt-5 space-y-4">
        <div
          v-if="!appendFixed"
          class="grid w-fit grid-cols-2 gap-1 rounded-xl bg-night-800 p-1"
        >
          <button
            type="button"
            class="rounded-lg px-4 py-1.5 text-sm font-semibold transition"
            :class="mode === 'create' ? 'grad-fill text-white' : 'text-zinc-400 hover:text-white'"
            @click="mode = 'create'"
          >
            Crear lista
          </button>
          <button
            type="button"
            class="rounded-lg px-4 py-1.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50"
            :class="mode === 'append' ? 'grad-fill text-white' : 'text-zinc-400 hover:text-white'"
            :disabled="!library.playlists.value.length"
            @click="mode = 'append'"
          >
            Añadir a lista
          </button>
        </div>

        <UForm
          v-if="mode === 'create'"
          :state="{ newName }"
        >
          <template v-if="appendFixed || parsed.length !== 1">
            <p class="text-sm text-zinc-500">
              Se importará a <span class="font-semibold text-brand-300">«{{ appendFixed ? fixedPlaylistName : parsed[0]?.name }}»</span>.
            </p>
            <p
              v-if="!appendFixed && parsed.length > 1"
              class="mt-1 text-xs text-zinc-600"
            >
              Se creará una playlist por cada lista detectada.
            </p>
          </template>
          <UFormField
            v-else
            label="Nombre de la nueva playlist"
            name="newName"
          >
            <UInput
              v-model="newName"
              class="w-full"
              :placeholder="parsed[0]?.name"
            />
          </UFormField>
        </UForm>

        <div
          v-else
          class="space-y-2"
        >
          <p class="text-sm text-zinc-500">
            Se añadirán a <span class="font-semibold text-brand-300">{{ appendFixed ? fixedPlaylistName : 'la lista elegida' }}</span>.
          </p>
          <USelect
            v-if="!appendFixed"
            v-model="appendId"
            :items="library.playlists.value.map(p => ({ label: p.name, value: p.id }))"
            placeholder="Elige una lista…"
            class="w-full"
          />
        </div>
      </div>

      <div
        v-if="importing"
        class="mt-5 space-y-2"
      >
        <div class="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            class="grad-fill h-full rounded-full transition-all duration-200"
            :style="{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }"
          />
        </div>
        <p class="truncate text-xs text-zinc-500">
          <span class="font-semibold text-zinc-300">{{ progress.done }}/{{ progress.total }}</span>
          {{ progress.current ? `· ${progress.current}` : '' }}
        </p>
      </div>

      <div
        v-if="stats"
        class="mt-5 space-y-3"
      >
        <div class="grid grid-cols-3 gap-2">
          <div class="glass rounded-xl p-3 text-center">
            <p class="text-lg font-black text-emerald-400">
              {{ stats.matched }}
            </p>
            <p class="text-[11px] text-zinc-500">
              Añadidas
            </p>
          </div>
          <div class="glass rounded-xl p-3 text-center">
            <p class="text-lg font-black text-amber-400">
              {{ omittedCount }}
            </p>
            <p class="text-[11px] text-zinc-500">
              Sin coincidencia
            </p>
          </div>
          <div class="glass rounded-xl p-3 text-center">
            <p class="text-lg font-black text-red-400">
              {{ stats.failed }}
            </p>
            <p class="text-[11px] text-zinc-500">
              Errores
            </p>
          </div>
        </div>

        <template v-if="stats.omitted.length">
          <button
            type="button"
            class="flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-white"
            @click="showOmitted = !showOmitted"
          >
            <UIcon
              :name="showOmitted ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="size-3.5"
            />
            Ver {{ stats.omitted.length }} canciones no importadas
          </button>
          <ul
            v-if="showOmitted"
            class="max-h-44 space-y-1 overflow-y-auto rounded-xl bg-white/5 p-3"
          >
            <li
              v-for="(track, i) in stats.omitted"
              :key="i"
              class="text-xs text-zinc-400"
            >
              <span class="font-medium text-zinc-300">{{ track.title }}</span>
              <span v-if="track.artist"> · {{ track.artist }}</span>
            </li>
          </ul>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-end gap-2">
        <UButton
          label="Cerrar"
          color="neutral"
          variant="ghost"
          :disabled="importing"
          @click="emit('update:open', false)"
        />
        <UButton
          v-if="parsed.length"
          icon="i-lucide-upload"
          :label="importing ? `Importando ${progress.done}/${progress.total}…` : `Importar ${totalTracks} canciones`"
          color="primary"
          :disabled="!canImport"
          :loading="importing"
          @click="runImport"
        />
      </div>
    </template>
  </UModal>
</template>
