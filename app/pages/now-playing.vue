<script setup lang="ts">
const player = usePlayer()

const track = computed(() => player.current.value)
const artwork = computed(() => track.value?.artwork_url ?? null)
const title = computed(() => track.value?.title ?? '')
const artist = computed(() => track.value?.artist ?? 'Desconocido')
const album = computed(() => track.value?.album ?? null)
const provider = computed(() => track.value?.provider ?? null)
const providerLabel = computed(() => (provider.value === 'jamendo' ? 'Jamendo' : 'Piped'))

const progress = computed({
  get: () => player.position.value,
  set: (v: number) => player.seek(v)
})

const volume = ref(player.volume.value)

watch(volume, v => player.setVolume(v))

const goBack = () => {
  const router = useRouter()
  if (window.history.length > 1) router.back()
  else navigateTo('/')
}

const repeatLabel = (mode: 'off' | 'all' | 'one') =>
  mode === 'all' ? 'Repetir cola' : mode === 'one' ? 'Repetir canción' : 'Activar repetición'

const queueQuery = ref('')
const filteredQueue = computed(() => {
  const q = queueQuery.value.trim().toLowerCase()
  const items = player.orderedQueue.value
  if (!q) return items
  return items.filter(({ track }) =>
    track.title.toLowerCase().includes(q)
    || (track.artist ?? '').toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="relative flex min-h-dvh flex-col overflow-x-clip">
    <!-- Fondo ambiental teñido por la portada actual -->
    <div
      v-if="artwork"
      class="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <img
        :src="artwork"
        alt=""
        class="h-full w-full scale-125 object-cover opacity-20 blur-3xl"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-night-950/70 via-night-950/55 to-night-950" />
    </div>

    <div class="mx-auto w-full max-w-7xl shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-chevron-down"
          size="sm"
          color="neutral"
          variant="ghost"
          aria-label="Minimizar"
          @click="goBack"
        />

        <p class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Reproduciendo
          <span
            v-if="track"
            class="flex h-3 items-end gap-[3px]"
            aria-hidden="true"
          >
            <span
              v-for="b in 3"
              :key="b"
              class="equalizer-bar w-[3px] rounded-full bg-brand-400"
              :class="{ 'opacity-30': !player.isPlaying.value }"
              :style="{
                height: `${[10, 14, 8][b - 1]}px`,
                animationDelay: `${(b - 1) * 0.16}s`,
                animationPlayState: player.isPlaying.value ? 'running' : 'paused'
              }"
            />
          </span>
        </p>

        <span
          v-if="providerLabel"
          class="ml-auto rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400"
        >
          {{ providerLabel }}
        </span>
      </div>
    </div>

    <div
      v-if="!track"
      class="flex flex-1 items-center justify-center"
    >
      <p class="flex items-center gap-2 text-sm text-zinc-600">
        <UIcon
          name="i-lucide-disc-3"
          class="size-4"
        />
        No hay ninguna canción en reproducción.
      </p>
    </div>

    <main
      v-else
      class="m-auto grid w-full grid-cols-1 gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-2 lg:px-24"
    >
      <!-- Escenario: la portada sobre el vinilo -->
      <div class="relative mb-8 animate-fade-up justify-self-center lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:mb-0 lg:self-center">
        <button
          :key="track.id"
          type="button"
          class="animate-disc-in group relative block transition active:scale-[0.99]"
          :aria-label="player.isPlaying.value ? 'Pausar' : 'Reproducir'"
          @click="player.toggle()"
        >
          <!-- Halo tonal detrás del escenario -->
          <span
            aria-hidden="true"
            class="pointer-events-none absolute left-1/2 top-1/2 size-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.32),rgba(255,109,46,0.12)_45%,transparent_68%)] blur-2xl"
          />

          <!-- Portada -->
          <img
            v-if="artwork"
            :src="artwork"
            :alt="title"
            class="art-glow relative aspect-square size-72 rounded-2xl object-cover shadow-2xl ring-1 ring-white/10 transition sm:size-80 lg:size-[24rem] xl:size-[40rem] group-hover:ring-brand-300/50 group-active:ring-brand-300"
          >
          <span
            v-else
            class="art-glow grad-fill relative grid aspect-square size-72 place-items-center rounded-2xl shadow-2xl sm:size-80 lg:size-[24rem] xl:size-[40rem]"
          >
            <UIcon
              name="i-lucide-music"
              class="size-20 text-white"
            />
          </span>
        </button>
      </div>

      <!-- Título e información -->
      <div
        :key="`info-${track.id}`"
        class="max-w-md animate-fade-up justify-self-center overflow-hidden text-center [animation-delay:70ms] lg:col-start-2 lg:row-start-1 lg:max-w-none lg:self-end lg:justify-self-stretch lg:text-left"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-300">
          Sonando ahora
        </p>
        <h1 class="mt-1 text-3xl font-black tracking-tight text-zinc-100 lg:text-5xl">
          <span
            v-if="title.length > 34"
            class="animate-marquee inline-block whitespace-nowrap pr-8"
          >
            {{ title }} <span class="text-zinc-600">✦</span> {{ title }}
          </span>
          <span v-else>{{ title }}</span>
        </h1>
        <p class="mt-1 truncate text-lg text-zinc-400">
          {{ artist }}
        </p>
        <p
          v-if="album"
          class="mt-0.5 truncate text-sm text-zinc-500"
        >
          {{ album }}
        </p>
        <div
          class="mx-auto mt-4 h-px w-14 rounded-full grad-fill opacity-80 lg:mx-0"
          aria-hidden="true"
        />
      </div>

      <!-- Controles -->
      <div class="flex w-full animate-fade-up flex-col items-center gap-1.5 justify-self-center [animation-delay:140ms] lg:col-start-2 lg:row-start-2 lg:items-start lg:justify-self-stretch lg:gap-4">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-shuffle"
            size="sm"
            color="neutral"
            variant="ghost"
            :class="player.isShuffling.value ? 'text-brand-300' : 'text-zinc-500 hover:text-zinc-300'"
            :aria-label="player.isShuffling.value ? 'Desactivar aleatorio' : 'Activar aleatorio'"
            :aria-pressed="player.isShuffling.value"
            @click="player.toggleShuffle()"
          />
          <UButton
            icon="i-lucide-skip-back"
            size="sm"
            color="neutral"
            variant="ghost"
            aria-label="Anterior"
            @click="player.previous()"
          />
          <button
            type="button"
            class="grid size-14 place-items-center rounded-full grad-fill text-white shadow-[0_14px_40px_-10px_rgba(139,92,246,0.7)] ring-1 ring-white/20 transition hover:scale-105 active:scale-95 lg:size-16"
            aria-label="Reproducir / pausar"
            :disabled="player.isLoading.value"
            @click="player.toggle()"
          >
            <UIcon
              v-if="player.isLoading.value"
              name="i-lucide-loader-2"
              class="size-6 animate-spin lg:size-7"
            />
            <UIcon
              v-else
              :name="player.isPlaying.value ? 'i-lucide-pause' : 'i-lucide-play'"
              class="size-6 translate-x-px lg:size-7"
            />
          </button>
          <UButton
            icon="i-lucide-skip-forward"
            size="sm"
            color="neutral"
            variant="ghost"
            aria-label="Siguiente"
            @click="player.next()"
          />
          <UButton
            :icon="player.repeatMode.value === 'one' ? 'i-lucide-repeat-1' : 'i-lucide-repeat'"
            size="sm"
            color="neutral"
            variant="ghost"
            class="relative"
            :class="player.repeatMode.value !== 'off' ? 'text-brand-300' : 'text-zinc-500 hover:text-zinc-300'"
            :aria-label="repeatLabel(player.repeatMode.value)"
            :aria-pressed="player.repeatMode.value !== 'off'"
            @click="player.cycleRepeat()"
          >
            <span
              v-if="player.repeatMode.value === 'all'"
              class="absolute bottom-0.5 right-1 text-[9px] font-bold leading-none"
              aria-hidden="true"
            >
              {{ player.queue.value.length || '' }}
            </span>
          </UButton>
        </div>

        <div class="flex w-full max-w-md items-center gap-2 lg:max-w-none">
          <span class="w-10 shrink-0 text-right tabular-nums text-[10px] text-zinc-500">
            {{ formatDuration(player.position.value) }}
          </span>
          <USlider
            v-model="progress"
            :max="player.duration.value || 0"
            class="flex-1"
            color="primary"
          />
          <span class="w-10 shrink-0 text-left tabular-nums text-[10px] text-zinc-500">
            {{ formatDuration(player.duration.value) }}
          </span>
        </div>

        <div class="flex items-center gap-2 lg:self-start">
          <UIcon
            name="i-lucide-volume-2"
            class="size-4 text-zinc-500"
          />
          <USlider
            v-model="volume"
            :min="0"
            :max="1"
            :step="0.01"
            class="w-36 lg:w-48"
            color="primary"
          />
        </div>
      </div>

      <!-- Cola -->
      <aside class="flex w-full animate-fade-up flex-col overflow-hidden rounded-2xl glass [animation-delay:210ms] lg:col-start-2 lg:row-start-3 lg:max-h-[min(40vh,460px)]">
        <div class="flex shrink-0 flex-col gap-2 border-b border-white/10 px-4 py-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              En cola
            </p>
            <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] tabular-nums text-zinc-400">
              {{ filteredQueue.length }}/{{ player.queue.value.length }}
            </span>
          </div>
          <UInput
            v-model="queueQuery"
            size="xs"
            icon="i-lucide-search"
            placeholder="Buscar en la cola…"
            class="w-full"
            clearable
          />
        </div>

        <div
          v-if="filteredQueue.length"
          class="flex-1 space-y-0.5 overflow-y-auto p-2"
        >
          <button
            v-for="entry in filteredQueue"
            :key="`${entry.index}-${entry.track.provider}-${entry.track.provider_id}`"
            type="button"
            class="relative flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition"
            :class="entry.index === player.currentIndex.value ? 'bg-white/5 ring-1 ring-brand-500/20' : 'hover:bg-white/5'"
            @click="player.playAt(entry.index)"
          >
            <span
              v-if="entry.index === player.currentIndex.value"
              class="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r-full grad-fill"
              aria-hidden="true"
            />
            <div class="relative size-10 shrink-0 overflow-hidden rounded-md">
              <img
                v-if="entry.track.artwork_url"
                :src="entry.track.artwork_url"
                :alt="entry.track.title"
                class="size-full object-cover"
                loading="lazy"
              >
              <div
                v-else
                class="grid size-full place-items-center bg-night-800"
              >
                <UIcon
                  name="i-lucide-music"
                  class="size-4 text-zinc-500"
                />
              </div>
              <span
                v-if="entry.index === player.currentIndex.value && player.isPlaying.value"
                class="absolute inset-0 grid place-items-center bg-black/40"
              >
                <span class="flex h-4 items-end gap-0.5">
                  <span
                    v-for="b in 3"
                    :key="b"
                    class="equalizer-bar flex-1 rounded-full bg-brand-300"
                    :style="{ height: `${[10, 16, 12][b - 1]}px`, animationDelay: `${(b - 1) * 0.18}s` }"
                  />
                </span>
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <p
                class="truncate text-sm font-semibold"
                :class="entry.index === player.currentIndex.value ? 'text-brand-300' : 'text-zinc-200'"
              >
                {{ entry.track.title }}
              </p>
              <p class="truncate text-xs text-zinc-500">
                {{ entry.track.artist ?? 'Desconocido' }}
              </p>
            </div>
            <span class="shrink-0 text-xs tabular-nums text-zinc-500">
              {{ formatDuration(entry.track.duration) }}
            </span>
          </button>
        </div>
        <p
          v-else
          class="px-4 py-10 text-center text-sm text-zinc-600"
        >
          {{ player.queue.value.length ? 'Sin coincidencias.' : 'La cola está vacía.' }}
        </p>
      </aside>
    </main>
  </div>
</template>
