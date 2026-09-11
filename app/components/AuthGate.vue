<script setup lang="ts">
const auth = useAuth()
const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const name = ref('')
const email = ref('')
const password = ref('')

const switchMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errorMessage.value = null
}

const submit = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    if (mode.value === 'login') await auth.login(email.value, password.value)
    else await auth.register(name.value, email.value, password.value)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Error inesperado.'
  } finally {
    loading.value = false
  }
}

const show = computed(() => auth.ready.value && !auth.isAuthed.value)
</script>

<template>
  <div
    v-if="show"
    class="auth-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
  >
    <div class="w-full max-w-sm animate-fade-up">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-4 grid size-16 place-items-center rounded-2xl grad-fill art-glow">
          <UIcon
            name="i-lucide-flame"
            class="size-9 text-white"
          />
        </div>
        <h1 class="text-3xl font-black tracking-tight">
          <span class="grad-text">Ignited</span>
        </h1>
        <p class="mt-1 text-sm text-zinc-400">
          Tu música, sin suscripciones.
        </p>
      </div>

      <UCard class="auth-card">
        <div class="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-night-800 p-1">
          <button
            type="button"
            class="rounded-lg py-2 text-sm font-semibold transition"
            :class="mode === 'login' ? 'grad-fill text-white' : 'text-zinc-400 hover:text-white'"
            @click="switchMode"
          >
            Entrar
          </button>
          <button
            type="button"
            class="rounded-lg py-2 text-sm font-semibold transition"
            :class="mode === 'register' ? 'grad-fill text-white' : 'text-zinc-400 hover:text-white'"
            @click="switchMode"
          >
            Crear cuenta
          </button>
        </div>

        <UForm
          :state="{ name, email, password }"
          @submit.prevent="submit"
        >
          <UFormField
            v-if="mode === 'register'"
            label="Nombre"
            name="name"
          >
            <UInput
              v-model="name"
              type="text"
              placeholder="Tu nombre"
              autocomplete="name"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Email"
            name="email"
            class="mt-3"
          >
            <UInput
              v-model="email"
              type="email"
              placeholder="tu@email.com"
              autocomplete="email"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Contraseña"
            name="password"
            class="mt-3"
          >
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>

          <p
            v-if="errorMessage"
            class="mt-3 text-sm text-ember-500"
          >
            {{ errorMessage }}
          </p>

          <UButton
            type="submit"
            block
            size="lg"
            class="mt-5"
            :loading="loading"
            :label="mode === 'login' ? 'Entrar' : 'Crear cuenta'"
          />
        </UForm>
      </UCard>

      <p class="mt-5 text-center text-xs text-zinc-500">
        Open-source • Laravel + Nuxt • Apache 2.0
      </p>
    </div>
  </div>
</template>
