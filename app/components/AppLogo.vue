<script setup lang="ts">
defineProps<{ withText?: boolean }>()
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <span class="grid size-7 place-items-center rounded-lg grad-fill">
      <UIcon
        name="i-lucide-flame"
        class="size-4 text-white"
      />
    </span>
    <span
      v-if="withText"
      class="text-base font-black tracking-tight"
    >
      <span class="grad-text">Ignited</span>
    </span>
  </span>
</template>
