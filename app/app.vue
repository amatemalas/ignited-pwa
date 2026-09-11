<script setup lang="ts">
const auth = useAuth()
const library = useLibrary()
const route = useRoute()
const toast = useToast()

const isAuthed = computed(() => auth.isAuthed.value)

const nowPlayingFullscreen = computed(() => route.path === '/now-playing')

watch(isAuthed, async (authed) => {
  if (authed) await library.fetchPlaylists()
})

onMounted(async () => {
  await auth.init()
  if (auth.isAuthed.value) await library.fetchPlaylists()
})

const newPlaylistBusy = ref(false)

const createPlaylist = async () => {
  newPlaylistBusy.value = true
  try {
    const created = await library.createPlaylist(`Mi lista ${new Date().toLocaleDateString()}`)
    await navigateTo(`/playlists/${created.id}`)
  } catch (e) {
    toast.add({ title: e instanceof Error ? e.message : 'Error', color: 'error' })
  } finally {
    newPlaylistBusy.value = false
  }
}

const navItems = [
  { label: 'Buscar', icon: 'i-lucide-search', to: '/' },
  { label: 'Biblioteca', icon: 'i-lucide-library', to: '/library' },
  { label: 'Historial', icon: 'i-lucide-clock', to: '/library?tab=history' }
]
</script>

<template>
  <UApp>
    <div class="relative min-h-dvh text-zinc-100">
      <div
        class="bg-aurora fixed inset-0 -z-10"
        aria-hidden="true"
      />

      <!-- Sidebar (desktop) -->
      <aside
        v-if="!nowPlayingFullscreen"
        class="glass fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-white/10 lg:flex lg:flex-col"
      >
        <NuxtLink
          to="/"
          class="flex items-center gap-2 px-5 py-5"
        >
          <AppLogo with-text />
        </NuxtLink>

        <nav class="flex-1 space-y-0.5 px-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="route.path === item.to || (item.to === '/library' && route.path.startsWith('/playlists'))
              ? 'grad-fill text-white'
              : 'text-zinc-400 hover:bg-white/5 hover:text-white'"
          >
            <UIcon
              :name="item.icon"
              class="size-4"
            />
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="mt-4 border-t border-white/10 px-5 pt-4">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Playlists
            </p>
            <UButton
              icon="i-lucide-plus"
              size="xs"
              color="neutral"
              variant="ghost"
              :loading="newPlaylistBusy"
              aria-label="Crear playlist"
              @click="createPlaylist"
            />
          </div>

          <div
            v-if="library.playlists.value.length"
            class="max-h-56 space-y-0.5 overflow-y-auto pb-4"
          >
            <NuxtLink
              v-for="p in library.playlists.value"
              :key="p.id"
              :to="`/playlists/${p.id}`"
              class="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <span class="truncate">{{ p.name }}</span>
              <span class="ml-2 text-[10px] text-zinc-600">{{ p.tracks_count ?? 0 }}</span>
            </NuxtLink>
          </div>
          <p
            v-else
            class="pb-4 text-xs text-zinc-600"
          >
            Crea tu primera lista.
          </p>
        </div>

        <div class="flex items-center justify-between border-t border-white/10 px-5 py-3">
          <button
            type="button"
            class="text-xs text-zinc-500 transition hover:text-white"
            @click="auth.logout()"
          >
            Cerrar sesión
          </button>
          <span class="text-[10px] text-zinc-600">{{ auth.user.value?.name ?? '' }}</span>
        </div>
      </aside>

      <!-- Topbar (mobile) -->
      <header
        v-if="!nowPlayingFullscreen"
        class="glass sticky top-0 z-30 flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden"
      >
        <AppLogo with-text />
        <div class="flex items-center gap-1">
          <NuxtLink
            v-for="item in navItems.slice(0, 2)"
            :key="item.to"
            :to="item.to"
            class="grid size-9 place-items-center rounded-lg text-zinc-400 transition"
            :class="route.path === item.to ? 'grad-fill text-white' : ''"
          >
            <UIcon
              :name="item.icon"
              class="size-4"
            />
          </NuxtLink>
          <button
            type="button"
            class="grid size-9 place-items-center rounded-lg text-zinc-400"
            :class="route.path.startsWith('/playlists') ? 'grad-fill text-white' : ''"
            aria-label="Playlists"
            @click="navigateTo('/library?tab=playlists')"
          >
            <UIcon
              name="i-lucide-list-music"
              class="size-4"
            />
          </button>
        </div>
      </header>

      <main
        :class="nowPlayingFullscreen ? 'min-h-dvh p-0' : 'px-4 pb-32 pt-6 sm:px-6 lg:pl-68 lg:pt-8'"
      >
        <div
          :class="nowPlayingFullscreen ? 'h-full' : 'mx-auto max-w-5xl'"
        >
          <NuxtPage />
        </div>
      </main>

      <PlayerBar v-if="!nowPlayingFullscreen" />
      <AuthGate />
    </div>
  </UApp>
</template>
