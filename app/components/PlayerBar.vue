<script setup lang="ts">
const player = usePlayer()

const playing = computed(() => player.current.value !== null)

const artwork = computed(() => player.current.value?.artwork_url ?? null)
const title = computed(() => player.current.value?.title ?? '')
const artist = computed(() => player.current.value?.artist ?? 'Desconocido')

const progress = computed({
  get: () => player.position.value,
  set: (v: number) => player.seek(v)
})

const volume = ref(player.volume.value)

watch(volume, v => player.setVolume(v))

const togglePlay = () => player.toggle()
</script>

<template>
  <footer
    v-if="playing"
    class="glass-strong fixed inset-x-0 bottom-0 z-40 border-t border-white/10 px-4 py-3"
  >
    <div class="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
      <!-- Track info -->
      <button
        type="button"
        class="group flex min-w-0 items-center gap-3 text-left"
        aria-label="Abrir vista completa"
        @click="navigateTo('/now-playing')"
      >
        <div class="relative shrink-0">
          <img
            v-if="artwork"
            :src="artwork"
            :alt="title"
            class="size-12 rounded-lg object-cover art-glow"
            loading="lazy"
          >
          <div
            v-else
            class="grid size-12 place-items-center rounded-lg grad-fill art-glow"
          >
            <UIcon
              name="i-lucide-music"
              class="size-6 text-white"
            />
          </div>
          <span
            v-if="player.isPlaying.value"
            class="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-ember-500"
          >
            <UIcon
              name="i-lucide-pause"
              class="size-2.5 text-white"
            />
          </span>
        </div>

        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-zinc-100 transition group-hover:text-brand-300">
            <span
              v-if="title.length > 34"
              class="animate-marquee inline-block whitespace-nowrap pr-8"
            >
              {{ title }} <span class="text-zinc-600">✦</span> {{ title }}
            </span>
            <span v-else>{{ title }}</span>
          </p>
          <p class="truncate text-xs text-zinc-500">
            {{ artist }}
          </p>
        </div>
      </button>

      <!-- Controls -->
      <div class="flex flex-col items-center gap-1.5">
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
            class="grid size-11 place-items-center rounded-full grad-fill text-white shadow-lg transition hover:scale-105 active:scale-95"
            aria-label="Reproducir / pausar"
            :disabled="player.isLoading.value"
            @click="togglePlay"
          >
            <UIcon
              v-if="player.isLoading.value"
              name="i-lucide-loader-2"
              class="size-5 animate-spin"
            />
            <UIcon
              v-else
              :name="player.isPlaying.value ? 'i-lucide-pause' : 'i-lucide-play'"
              class="size-5 translate-x-px"
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
            :aria-label="player.repeatMode.value === 'all' ? 'Repetir cola' : player.repeatMode.value === 'one' ? 'Repetir canción' : 'Activar repetición'"
            :aria-pressed="player.repeatMode.value !== 'off'"
            @click="player.cycleRepeat()"
          />
        </div>

        <div class="flex w-64 items-center gap-2 sm:w-96">
          <span class="w-10 shrink-0 text-right tabular-nums text-[10px] text-zinc-500">
            {{ formatDuration(player.position.value) }}
          </span>
          <USlider
            v-model="progress"
            :max="player.duration.value || 0"
            :disabled="!playing"
            class="flex-1"
            color="primary"
          />
          <span class="w-10 shrink-0 text-left tabular-nums text-[10px] text-zinc-500">
            {{ formatDuration(player.duration.value) }}
          </span>
        </div>
      </div>

      <!-- Volume -->
      <div class="hidden items-center justify-end gap-2 md:flex">
        <UIcon
          name="i-lucide-volume-2"
          class="size-4 text-zinc-500"
        />
        <USlider
          v-model="volume"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-28"
          color="primary"
        />
      </div>
    </div>
  </footer>
</template>
