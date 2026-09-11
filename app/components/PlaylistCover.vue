<script setup lang="ts">
import type { Playlist } from '~/types'

const props = defineProps<{ playlist: Playlist }>()

const covers = computed(() => {
  const urls: string[] = []
  for (const track of props.playlist.tracks ?? []) {
    if (track.artwork_url && !urls.includes(track.artwork_url)) {
      urls.push(track.artwork_url)
      if (urls.length === 4) break
    }
  }
  return urls
})
</script>

<template>
  <div
    v-if="covers.length"
    class="absolute inset-0 grid grid-cols-2 grid-rows-2"
  >
    <img
      v-for="url in covers"
      :key="url"
      :src="url"
      alt=""
      loading="lazy"
      class="size-full object-cover"
    >
    <div
      v-for="n in 4 - covers.length"
      :key="`placeholder-${n}`"
      class="bg-black/40"
    />
  </div>
</template>
