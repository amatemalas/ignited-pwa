# Ignited

> Tu música, sin suscripciones.

**Ignited** es un reproductor de música web **open-source** construido con **Nuxt 4**. Busca en el catálogo
Creative Commons de **Jamendo** y, en instancias configuradas para ello, en **YouTube Music** (vía Piped + yt-dlp).
Incluye cuenta de usuario, playlists, importación de listas desde YouTube Music, historial de reproducción,
*Media Session API* (controles desde la pantalla de bloqueo) y funciona como **PWA** instalable.

- **Frontend:** este repositorio (Nuxt 4 + Vue 3 + TypeScript + Tailwind CSS v4 + Nuxt UI).
- **Backend:** API REST separada en **Laravel** (repositorio `ignited-api`).

## Características

- 🔍 Búsqueda unificada en catálogos abiertos (Jamendo / Creative Commons y, si está habilitado, YouTube Music).
- 👤 Registro, login y sesión persistente (token en `localStorage`).
- 💿 Playlists con carátula automática, creación, edición y eliminación de pistas.
- 📥 Importar playlists desde YouTube Music (enlace público o CSV de Google Takeout).
- 🕘 Historial de reproducción.
- 🎧 Media Session: controles desde la pantalla de bloqueo / barra del sistema.
- 📱 PWA instalable con soporte offline del shell (workbox, `installPrompt`, mascable + 192/512 icons).

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Nuxt 4 (Vue 3, TypeScript), modo SPA (`ssr: false`) |
| UI | Nuxt UI v4 + Tailwind CSS v4 |
| PWA | `@vite-pwa/nuxt` (manifest + workbox offline) |
| Datos | API REST (Laravel) vía `useApi()` |
| CI | GitHub Actions: lint/typecheck + deploy a Hostinger (FTP) |

## Estructura

```
app/
  components/    UI (PlayerBar, TrackRow, AuthGate, PlaylistImportModal, …)
  composables/   useApi, useAuth, useLibrary, usePlayer, usePlaylistImport
  pages/         index (búsqueda), library, playlists/[id], now-playing, legal
```

## Desarrollo local

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Configura la API en `.env` (copia de `.env.example`):

```bash
NUXT_PUBLIC_API_BASE_URL=http://ignited-api.test/api
NUXT_PUBLIC_ALLOW_YOUTUBE=true   # habilita resultados de YouTube/Piped
```

> `NUXT_PUBLIC_ALLOW_YOUTUBE` se incrusta en el build. Por defecto está **desactivado** (seguro): la instancia
> generada solo ofrece el catálogo Creative Commons de Jamendo. Actívalo solo si el operador asume los términos
> de servicio de las plataformas de origen.

## Build y despliegue (Hostinger, estático)

```bash
pnpm generate                  # genera .output/public (index.html + 404.html)
```

El hosting estático de Hostinger se configura con el `.htaccess` incluido en `public/`, que sirve el shell de la
app para rutas profundas (`ErrorDocument 404 /404.html`), de modo que funcione la navegación SPA.

El deploy se hace desde GitHub Actions (workflows `.github/workflows/deploy*.yml`), que ejecutan
`pnpm generate` y suben `.output/public/` por FTP, igual que el resto de proyectos del autor.

### Variables y secretos (GitHub)

| Nombre | Tipo | Descripción |
|---|---|---|
| `API_BASE_URL` | Variable | URL pública de la API, p. ej. `https://tu-api.com/api` |
| `ALLOW_YOUTUBE` | Variable | `true`/`false` para la rama objetivo |
| `FTP_HOST`, `FTP_USERNAME`, `FTP_PASSWORD` | Secret | Credenciales FTP de Hostinger (rama principal) |
| `FTP_HOST_DEV`, `FTP_USERNAME_DEV`, `FTP_PASSWORD_DEV` | Secret | Credenciales FTP del dev ring (rama `develop`) |

Ramas: `main` → producción, `develop` → dev ring.

## PWA

- Manifest con nombre, temas `#0c0c14` e iconos 192/512/mascable.
- Service worker con precaché del shell, actualización automática (`registerType: 'autoUpdate'`) y caché
  `CacheFirst` para carátulas (90 días).
- Instalable en Android/iOS/Desktop (aviso de instalación nativo).

## Legal

Antes de abrir una instancia al público revisa `app/pages/legal.vue` (términos de uso, privacidad RGPD y fuentes
de contenido) y adapta los datos de contacto y la URL de la instancia. Si expones YouTube públicamente, asume el
riesgo de los términos de servicio de la plataforma de origen; la opción más segura para una instancia abierta es
mantener solo catálogos Creative Commons.

## Licencia

[MIT](LICENSE) © 2026 amatemalas. Derivado del Nuxt UI Starter Template (MIT © Nuxt UI Templates).