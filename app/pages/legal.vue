<script setup lang="ts">
const RESPONSIBLE = 'amatemalas'
const CONTACT_EMAIL = 'ignited@adrianmatemalas.me'
const SITE_URL = 'ignited.adrianmatemalas.me'
</script>

<template>
  <div class="animate-fade-up">
    <h1 class="text-3xl font-black tracking-tight sm:text-4xl">
      <span class="grad-text">Legal y privacidad</span>
    </h1>
    <p class="mt-2 text-sm text-zinc-400">
      Términos de uso, política de privacidad e información sobre las fuentes de contenido. Última revisión: septiembre de 2026.
    </p>

    <div class="mt-8 space-y-8">
      <!-- Términos de uso -->
      <section class="glass rounded-2xl p-6 sm:p-8">
        <h2 class="text-xl font-bold text-zinc-100">
          1. Términos de uso
        </h2>

        <div class="mt-4 space-y-4 text-sm leading-relaxed text-zinc-400">
          <p>
            <strong class="text-zinc-200">Servicio.</strong> Ignited es un reproductor de música de código abierto.
            Permite a las personas usuarias registradas buscar canciones en los catálogos disponibles, crear
            playlists, importar sus listas de YouTube Music y llevar un historial de reproducción.
          </p>

          <p>
            <strong class="text-zinc-200">Uso personal.</strong> El acceso y el uso del servicio se conceden para uso
            personal y no comercial. Queda prohibido reproducir, descargar, grabar, redistribuir o publicar las pistas
            o contenidos ofrecidos sin la autorización de sus titulares de derechos.
          </p>

          <p>
            <strong class="text-zinc-200">Contenido de terceros.</strong> Las canciones disponibles en el servicio
            pertenecen a sus respectivos autores y titulares de derechos. Ignited no es titular de ninguna de las obras
            reproducidas. Las pistas provienen de catálogos con licencias abiertas (como el catálogo Creative Commons
            de Jamendo) y, cuando la instancia lo permite, de streams temporales de YouTube gestionados por el propio
            operador de la instancia para cada usuario. Cualquier infracción en el uso o la distribución de esas obras
            es responsabilidad exclusiva de quien la realice.
          </p>

          <p>
            <strong class="text-zinc-200">Tu responsabilidad.</strong> Al usar el servicio te comprometes a no: (a)
            vulnerar los derechos de autor o los términos de servicio de las plataformas de origen; (b) automatizar el
            acceso, descargar en masa o eludir los mecanismos de protección del servicio; (c) usar el servicio para
            reventa, distribución o cualquier fin comercial no autorizado; (d) acosar, dañar o suplantar a otras
            personas usuarias; (e) intentar acceder a cuentas o datos ajenos.
          </p>

          <p>
            <strong class="text-zinc-200">Cuentas.</strong> Cada cuenta es personal e intransferible. El operador podrá
            suspender o cancelar cuentas que incumplan estos términos o que generen un uso abusivo del servicio.
          </p>

          <p>
            <strong class="text-zinc-200">Disponibilidad.</strong> El servicio se ofrece «tal cual». Este es un proyecto
            de código abierto y sin ánimo de lucro: no se garantiza disponibilidad, integridad ni que las pistas estén
            libres de errores. Podrá suspenderse, limitarse o eliminarse en cualquier momento.
          </p>

          <p>
            <strong class="text-zinc-200">Responsabilidad.</strong> En la medida máxima permitida por la ley, el
            operador no será responsable de los daños derivados de la interrupción del servicio, la pérdida de datos o
            el uso indebido del contenido por parte de terceros.
          </p>

          <p>
            <strong class="text-zinc-200">Derechos de autor / notificaciones.</strong> Si crees que el servicio aloja o
            facilita contenido que infringe tus derechos, puedes notificarlo a
            <a
              :href="`mailto:${CONTACT_EMAIL}`"
              class="text-brand-300 underline hover:text-brand-200"
            >{{ CONTACT_EMAIL }}</a>.
            Este es un proyecto self-hosted por cada operador: en cada instancia, es su operador quien controla las
            fuentes y debe atender las reclamaciones recibidas.
          </p>
        </div>
      </section>

      <!-- Política de privacidad -->
      <section class="glass rounded-2xl p-6 sm:p-8">
        <h2 class="text-xl font-bold text-zinc-100">
          2. Política de privacidad
        </h2>

        <div class="mt-4 space-y-4 text-sm leading-relaxed text-zinc-400">
          <p>
            <strong class="text-zinc-200">Responsable del tratamiento.</strong> En esta instancia, el responsable del
            tratamiento es <span class="text-zinc-200">{{ RESPONSIBLE }}</span> ({{ SITE_URL }}). Contacto:
            <a
              :href="`mailto:${CONTACT_EMAIL}`"
              class="text-brand-300 underline hover:text-brand-200"
            >{{ CONTACT_EMAIL }}</a>.
          </p>

          <p>
            <strong class="text-zinc-200">Datos que tratamos.</strong> Para el registro y el uso del servicio se
            tratan: nombre, dirección de correo electrónico y contraseña (almacenada únicamente con hash en el
            servidor), así como los datos que generas al usar la aplicación: playlists, canciones importadas e
            historial de reproducción. El token de sesión se guarda en el almacenamiento local de tu navegador
            (<code class="rounded bg-white/5 px-1 py-0.5 font-mono text-xs">localStorage</code>), no en cookies de
            seguimiento.
          </p>

          <p>
            <strong class="text-zinc-200">Finalidad y base legal.</strong> Los datos se usan exclusivamente para la
            prestación del servicio: autenticación, sincronización de biblioteca e historial. La base legal es la
            ejecución del contrato de servicio (art. 6.1.b RGPD). No se utilizan para publicidad ni se ceden a
            terceros con fines comerciales.
          </p>

          <p>
            <strong class="text-zinc-200">Retención.</strong> Los datos se conservan mientras la cuenta permanezca
            activa. Puedes solicitar el borrado de tu cuenta y de todos tus datos en cualquier momento; se eliminarán
            en un plazo razonable, salvo obligación legal de conservarlos.
          </p>

          <p>
            <strong class="text-zinc-200">Tus derechos.</strong> Conforme al RGPD puedes ejercer los derechos de
            acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a
            <a
              :href="`mailto:${CONTACT_EMAIL}`"
              class="text-brand-300 underline hover:text-brand-200"
            >{{ CONTACT_EMAIL }}</a>.
            También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es).
          </p>

          <p>
            <strong class="text-zinc-200">Seguridad.</strong> Las comunicaciones se cifran mediante HTTPS, las
            contraseñas se almacenan con hash y los tokens de sesión caducan. Eres responsable de mantener la
            confidencialidad de tus credenciales.
          </p>

          <p>
            <strong class="text-zinc-200">Datos de terceros.</strong> Al buscar o reproducir contenido de catálogos
            externos (p. ej. Jamendo o YouTube), pueden generarse peticiones a sus servidores; consulta las políticas
            de privacidad de cada plataforma para conocer su tratamiento de datos.
          </p>
        </div>
      </section>

      <!-- Fuentes -->
      <section class="glass rounded-2xl p-6 sm:p-8">
        <h2 class="text-xl font-bold text-zinc-100">
          3. Fuentes de contenido
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-zinc-400">
          <p>
            Ignited agrega música desde varias fuentes. Dependiendo de cómo cada operador configure su instancia:
          </p>
          <ul class="list-disc space-y-2 pl-5">
            <li>
              <strong class="text-zinc-200">Jamendo.</strong> Catálogo con licencias Creative Commons. Permiten la
              reproducción legal con los términos de cada licencia.
            </li>
            <li>
              <strong class="text-zinc-200">YouTube / Piped.</strong> Esta fuente solo aparece en instancias
              configuradas expresamente para ello. La reproducción se realiza mediante streams temporales y no se
              descarga ni se redistribuye contenido.
            </li>
          </ul>
        </div>
      </section>

      <!-- Licencia -->
      <section class="glass rounded-2xl p-6 sm:p-8">
        <h2 class="text-xl font-bold text-zinc-100">
          4. Licencia del proyecto
        </h2>
        <p class="mt-4 text-sm leading-relaxed text-zinc-400">
          El código fuente de Ignited se distribuye bajo la licencia MIT.
          Esto no altera los derechos de autor de las obras musicales reproducidas, que pertenecen a sus titulares.
        </p>
      </section>
    </div>
  </div>
</template>
