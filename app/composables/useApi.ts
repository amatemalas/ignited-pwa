export function useApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiBase

  const getToken = () => import.meta.client ? localStorage.getItem('ignited_token') : null

  async function request<T = unknown>(
    path: string,
    options: { method?: string, body?: unknown, headers?: Record<string, string> } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    let res: Response

    try {
      res = await fetch(`${base}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
      })
    } catch {
      throw new Error('No se pudo conectar con el servidor.')
    }

    const text = await res.text()
    const data = text ? JSON.parse(text) : null

    if (!res.ok) {
      const message = data?.message ?? data?.email?.[0] ?? data?.password?.[0] ?? `Error ${res.status}`
      const err = new Error(message)
      if (res.status === 401) {
        (err as { code?: number }).code = 401
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ignited_token')
          window.dispatchEvent(new CustomEvent('ignited:unauthorized'))
        }
      }
      throw err
    }

    return data as T
  }

  return { base, request }
}
