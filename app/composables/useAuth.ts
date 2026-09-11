import type { User } from '~/types'

const token = ref<string | null>(null)
const user = ref<User | null>(null)
const ready = ref(false)

export function useAuth() {
  const api = useApi()

  const isAuthed = computed(() => Boolean(token.value))

  function clearSession() {
    token.value = null
    user.value = null
    ready.value = true
    if (typeof window !== 'undefined') localStorage.removeItem('ignited_token')
  }

  async function init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('ignited:unauthorized', clearSession)
    }

    if (typeof window === 'undefined') {
      ready.value = true
      return
    }

    const stored = localStorage.getItem('ignited_token')

    if (!stored) {
      ready.value = true
      return
    }

    token.value = stored

    try {
      user.value = await api.request<User>('/me')
    } catch {
      clearSession()
    }

    ready.value = true
  }

  async function login(email: string, password: string) {
    const data = await api.request<{ user: User, token: string }>('/login', {
      method: 'POST',
      body: { email, password }
    })
    applySession(data.user, data.token)
  }

  async function register(name: string, email: string, password: string) {
    const data = await api.request<{ user: User, token: string }>('/register', {
      method: 'POST',
      body: { name, email, password, password_confirmation: password }
    })
    applySession(data.user, data.token)
  }

  async function logout() {
    try {
      if (token.value) await api.request('/logout', { method: 'POST' })
    } catch {
      // token caducado: cerramos sesión local igualmente
    }
    token.value = null
    user.value = null
    if (typeof window !== 'undefined') localStorage.removeItem('ignited_token')
  }

  function applySession(nextUser: User, nextToken: string) {
    user.value = nextUser
    token.value = nextToken
    if (typeof window !== 'undefined') localStorage.setItem('ignited_token', nextToken)
  }

  return {
    token: readonly(token),
    user: readonly(user),
    ready: readonly(ready),
    isAuthed,
    init,
    login,
    register,
    logout
  }
}
