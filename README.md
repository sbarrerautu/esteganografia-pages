# Aula Abierta · Laboratorio de Burp Suite

Plataforma de cursos ficticia con seis desafíos de seguridad web y tablero de banderas. No requiere paquetes externos, cuentas reales ni pagos.

## Iniciar

Instalá Node.js 24 (https://nodejs.org/). Abrí una terminal en esta carpeta y ejecutá:

```sh
npm start
```

Entrá a http://127.0.0.1:3000. En Windows también podés ejecutar `iniciar.cmd`. Detené el servidor con Ctrl+C. El servidor escucha solamente en tu equipo por defecto.

Cuenta de práctica: **alumno / burp123**. Usá solamente datos ficticios en el registro.

## El práctico

1. Abrí Burp Suite Community → proyecto temporal → configuración predeterminada.
2. En Proxy → Intercept → Open browser, abrí la dirección del campus.
3. Agregá ese origen al alcance en Target → Scope.
4. Navegá con Intercept desactivado y observá Proxy → HTTP history.
5. Enviá una petición a Repeater, modificá un dato y compará las respuestas.
6. Pegá las banderas `FLAG{…}` en Laboratorio. Cada una vale 100 puntos.

El tablero muestra seis hallazgos numerados, sin títulos reveladores ni pistas. Los mensajes de la interfaz no muestran banderas: buscá el encabezado `X-Lab-Flag` en las respuestas HTTP con Burp. No se incluyen banderas en el HTML ni en los cuerpos JSON. No necesitás el escáner de pago. Las banderas se generan en el servidor y son específicas de cada sesión. Conservá la cookie `sid` al usar Repeater. Una bandera de otro navegador no suma puntos.

El certificado 1001 es un dato de muestra del alumno, incluso si creás otro usuario.

El progreso se guarda en memoria del servidor por navegador; no se asocia a una cuenta. Las cuentas creadas, banderas e inscripciones se pierden cuando el proceso se reinicia. En un hosting que suspenda el servicio también puede reiniciarse el práctico. Mantener una sola instancia evita que las sesiones se dividan entre procesos.

## Agregar el video después

La sección **Clase introductoria → Cargar vista previa** permite elegir un MP4, WebM u Ogg (hasta 200 MB). Se guarda en IndexedDB, únicamente en ese navegador y origen; persiste al recargar mientras el navegador conserve sus datos. No sube el archivo al servidor ni lo comparte con otros alumnos.

Para compartir el video con todos:

1. Exportalo como MP4, preferiblemente H.264 con audio AAC.
2. Copialo a `public/video/intro.mp4` dentro del proyecto.
3. Reiniciá el servidor local o desplegá de nuevo en Render. El reproductor detecta ese archivo automáticamente.
4. Si usás Git para desplegar, el video está excluido por defecto por su tamaño: agregalo explícitamente con `git add -f public/video/intro.mp4`, respetando los límites del proveedor. Para un video grande conviene adaptar el reproductor a un alojamiento de video.

Una vista previa local tiene prioridad sobre el video compartido. Usá **Quitar** para volver a ver el compartido.

## Render

Se incluye `render.yaml`, pensado para usar esta carpeta como raíz de un repositorio independiente. Configuración equivalente en un nuevo Web Service:

- Runtime: Node.
- Node: 24.19.0.
- Build command: `node --check server.mjs`.
- Start command: `node server.mjs`.
- Variables: `HOST=0.0.0.0`, `COOKIE_SECURE=true`.
- Plan: Free. Health check: `/api/video`.

Si desplegás desde el repositorio original que contiene esta carpeta, usá Root Directory `burp-bazar`, o comandos `node --check burp-bazar/server.mjs` y `node burp-bazar/server.mjs` con raíz vacía. No reemplaces el servicio del taller de esteganografía.

El campus contiene vulnerabilidades intencionales: alojalo como servicio de laboratorio separado, sin secretos ni datos reales. La base SQLite es efímera y el servidor solo expone las rutas previstas; no publica el código fuente ni el solucionario.

Referencia del proveedor: https://render.com/docs/node-version y https://render.com/docs/web-services.

## Para quien organiza

El solucionario y las pruebas están en `docente/`, que no se sirve por HTTP. El ZIP para alumnos excluye esa carpeta. Si los alumnos reciben el código, pueden leer la implementación: para evaluar descubrimiento sin spoilers, compartí la URL del campus y la guía, no el código del servidor.

