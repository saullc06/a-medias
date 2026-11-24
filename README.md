# A Medias

Calculadora en español, inglés y francés para repartir gastos por personas, importes o raciones. GitHub guarda el código. Cloudflare Workers lo publica como una web. Puedes hacer la primera parte hoy y dejar la publicación para otro día.

## 1. Guardar el proyecto en GitHub

1. Descomprime el ZIP en tu ordenador. Entra en la carpeta que contiene este README, package.json, wrangler.jsonc y la carpeta src.
2. Entra en [GitHub](https://github.com/new). Pon **a-medias** como nombre, elige **Private** y pulsa **Create repository**. Deja desmarcadas las opciones de añadir un README, una licencia o un archivo gitignore.
3. En el repositorio vacío, pulsa **uploading an existing file**. Si ya ves una lista de archivos, pulsa **Add file → Upload files**.
4. Arrastra todos los archivos y la carpeta src desde dentro de la carpeta descomprimida. Conserva la estructura de carpetas. Pulsa **Commit changes**. Si pide una descripción, escribe «Primera versión».
5. Comprueba que ves **package.json** y **wrangler.jsonc** en la primera pantalla del repositorio y **index.html** dentro de **src**. Si solo ves un ZIP o una carpeta que contiene a su vez todo el proyecto, vuelve a subir su contenido a la raíz.

## 2. Probar en tu ordenador (opcional)

Instala [Node.js LTS](https://nodejs.org/) versión 22 o posterior. Abre una terminal dentro de la carpeta descomprimida. Ejecuta:

```sh
npm run dev
```

Abre http://127.0.0.1:5173 y pulsa **Probar con una cena**. El total debe ser **76,40 €**. El acceso local usa HTTP y solo escucha en tu ordenador. Pulsa Ctrl+C para cerrar. Puedes comprobar los cálculos y las rutas con `npm test`. Estos comandos funcionan sin instalar paquetes adicionales.

Para probar el ticket de ocho comensales, abre http://127.0.0.1:5173/?mesa=8#receipt. Verás una imagen y siete líneas precargadas por un total de 237,01 €. La lectura automática de tus propias fotos depende del navegador.

## 3. Preparar tu versión pública

El Worker de Cloudflare se publica en una dirección accesible por internet. La visibilidad privada del repositorio solo protege el código en GitHub. Para seguir probando en privado, puedes quedarte en el paso 2.

La página de información se edita en **src/info.html**. Antes de explotar la web comercialmente, completa los datos reales del titular y revisa el texto de privacidad según el uso que hagas del alojamiento y la publicidad. Busca el comentario **TITULAR** para encontrar el lugar reservado en el HTML. Las etiquetas de esa sección se muestran al quitar el comentario que las envuelve y sustituir los ejemplos. Todo lo que pongas ahí será visible en la web. El ZIP incluye un patrocinio desactivado y funciona sin claves privadas.

## 4. Publicar en Cloudflare Workers

1. Entra en el [panel de Cloudflare](https://dash.cloudflare.com/). Abre **Workers & Pages → Create application → GitHub**.
2. Conecta tu cuenta de GitHub, autoriza acceso al repositorio **a-medias** y selecciónalo.
3. Introduce estos valores si el panel te los solicita.

| Campo | Valor |
| --- | --- |
| Nombre del Worker | a-medias |
| Rama de producción | main (o la rama donde has subido los archivos) |
| Directorio raíz | La raíz del repositorio, valor predeterminado |
| Build command | npm run build |
| Deploy command | npx wrangler deploy |

4. Pulsa **Save and Deploy**. Espera a que el despliegue termine correctamente. Si es tu primer Worker, Cloudflare puede pedirte elegir un subdominio de cuenta.
5. Abre la dirección HTTPS que te proporciona Cloudflare, con el formato **a-medias.TU-SUBDOMINIO.workers.dev**. No necesitas comprar un dominio para esta primera publicación.
6. Pulsa **Probar con una cena**, edita un importe y comprueba que se actualiza el resumen. Abre la página de privacidad desde el pie. Prueba la web desde el móvil antes de difundir el enlace.

Los cambios que guardes en la rama conectada activan otro despliegue. **Si el build falla**, abre el registro de compilación. Si falta package.json, revisa el paso 1. Si falta dist/server/index.js, confirma que el comando de compilación es npm run build. Si el panel pide otro nombre para el Worker, cambia también el campo name de wrangler.jsonc para que coincidan.

## HTTPS y dominio propio

El servidor responde con una redirección 308 a las peticiones HTTP que le llegan y envía HSTS sobre HTTPS. Para comprobar la URL real después de publicar, abre una terminal y sustituye el dominio del ejemplo en ambos comandos:

```sh
curl -I http://a-medias.TU-SUBDOMINIO.workers.dev/informacion
curl -I https://a-medias.TU-SUBDOMINIO.workers.dev/informacion
```

Busca una redirección a la misma ruta por HTTPS en la primera respuesta y un 200 en la segunda. La red de Cloudflare también puede aplicar su propia redirección. Si más adelante conectas un dominio propio gestionado en Cloudflare, añádelo al Worker en **Settings → Domains & Routes**. Cuando su certificado esté activo, la opción **SSL/TLS → Edge Certificates → Always Use HTTPS** permite forzar HTTPS para toda esa zona.

## Qué archivo editar

| Archivo | Uso |
| --- | --- |
| src/index.html | Textos, formularios y preguntas frecuentes |
| src/app.css | Colores, tipografía, animaciones y diseño móvil |
| src/app.js | Reparto, edición, resumen compartible y copias de cuentas |
| src/languages.js y src/preferences.js | Traducciones, menú de idiomas y botón de tema |
| src/ticket-mesa-8.png | Imagen de muestra de la mesa de ocho |
| src/info.html | Titular, privacidad y cookies |
| sponsor.json | Anuncio de patrocinio directo |
| handler.js | Rutas, redirección y cabeceras de seguridad |
| build.mjs | Genera el Worker a partir del código fuente |
| wrangler.jsonc | Configuración de Cloudflare |

Cuando tengas un patrocinador, puedes sustituir el contenido de sponsor.json por un objeto como este, con los datos pactados:

```json
{
  "advertiser": "Nombre del anunciante",
  "message": "Texto acordado para la campaña",
  "url": "https://example.com/"
}
```

Guarda el cambio para desplegarlo. Para retirar la campaña, vuelve a escribir **null**. Este formato muestra texto y un enlace identificados como publicidad. No cuenta impresiones ni clics.

## Documentación oficial

- [Subir archivos a GitHub](https://docs.github.com/es/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [Conectar un repositorio a Cloudflare Workers](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Forzar HTTPS en un dominio de Cloudflare](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
