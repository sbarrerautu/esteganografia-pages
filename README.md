# Ciberobservatorio · Grupo 4

Sitio académico en español sobre ciberdelito, ciberdefensa y privacidad internacional. Diseño de periódico en azul, negro y blanco, adaptable a móvil. HTML, CSS y JavaScript; sin dependencias de instalación ni backend.

## Abrir y revisar

Con Node.js instalado, abrir una terminal en esta carpeta:

```sh
npm start
```

Abrir http://127.0.0.1:4173. Detener con Ctrl+C.

```sh
npm run check
npm run build
```

El resultado publicable queda en `dist/`. Los enlaces usan rutas hash: funcionan sin reglas de reescritura. La búsqueda y las actividades funcionan en el navegador. Las fuentes externas requieren conexión. Las tipografías se solicitan a Google Fonts; si no hay conexión se usan Georgia y Arial. No se agregan analítica ni cuentas de usuario.

## Publicar en Render

1. Crear un repositorio de GitHub para este proyecto y subir **el contenido de esta carpeta** a su raíz, con `package.json` y `render.yaml` al mismo nivel. No subir el ZIP como único archivo.
2. En Render, elegir **New → Static Site** y conectar ese repositorio.
3. Branch: la rama que contenga el proyecto (habitualmente `main`).
4. **Build Command:** `npm run build`
5. **Publish Directory:** `dist`
6. Elegir **Deploy Static Site**. Render entrega el enlace público.

También se puede usar **New → Blueprint**: `render.yaml` incluye la configuración del sitio estático y cabeceras básicas. No necesita base de datos, variables de entorno ni un servicio web de pago.

Si se integra en un repositorio con otros proyectos, configurar **Root Directory** con la ruta de esta carpeta, o ajustar el Blueprint. No reemplazar el `render.yaml` de otro proyecto sin revisar su contenido.

Referencia oficial de configuración: https://render.com/docs/blueprint-spec

## Agregar el video del grupo

1. Copiar el MP4 a `public/assets/practica.mp4`.
2. En `public/config.js` cambiar `src: ''` por `src: 'assets/practica.mp4'`.
3. Opcional: añadir subtítulos WebVTT y completar `captions: 'assets/subtitulos.vtt'`.
4. Ejecutar el build o subir los cambios al repositorio conectado con Render.

El reproductor aparece tanto en la portada como en Aula práctica. Mientras no se configura, se muestra un espacio reservado claramente identificado. No hay un video de demostración fingido. También admite una URL HTTPS de un MP4 publicado con permiso; no una página de YouTube o un enlace de visualización de Drive. Para videos grandes, conviene usar alojamiento de medios y el enlace directo al archivo.

## Editar contenido

- `public/data.js`: fichas legales, fuentes, casos documentados y escenarios hipotéticos.
- `public/app.js`: páginas, navegación, filtros y comparación.
- `public/styles.css`: diseño, móvil e impresión.
- `public/config.js`: video.
- `public/law-documents.js`: documentos normativos completos para imprimir o descargar desde el editor oficial.

Cada ficha tiene resumen, puntos clave, referencia de artículos, ejemplo, límites y fuente oficial. Las relaciones se revisan con `npm run check`. La tabla comparada se encuentra en `app.js`: actualizarla si cambia el alcance resumido de una norma.

## Imprimir las leyes

En cada ficha, el bloque **Imprimir o guardar la ley completa** abre el documento normativo oficial en otra pestaña, en PDF cuando hay un enlace directo. Allí se imprime o se guarda con los controles del visor o con Ctrl+P. No se ofrece imprimir la ficha resumida. Los documentos originales o ediciones históricas se identifican como tales. El Decreto 44/018 es reservado y no tiene una opción falsa de impresión.

## Criterios del contenido

Revisión: 30/10/2026. Se usó el plan PDF aportado para la secuencia de exposición de 60 minutos. La carpeta de Drive del curso y la subcarpeta Punto 4 están enlazadas en Fuentes; en esta última se observaron los PDF del GDPR y la Directiva 95/46/CE. Los textos legales se enlazan a fuentes oficiales; no se descargaron ni redistribuyeron todos los PDF de Drive.

La portada es una selección editorial de comunicados de 2025–2026, no noticias que se actualicen automáticamente. Cada caso distingue fecha del comunicado, mecanismo conocido, información afectada y decisión oficial o posible marco de análisis. No se asegura el estado procesal posterior de una sanción.

Se aclara la distinción entre grooming (art. 277 bis) y difusión íntima (Ley 19.580, art. 92), el carácter reservado del Decreto 44/018, el período 2020–2025 del Decreto 371/020, la evolución institucional de Cibercrimen y el alcance federal de la Privacy Act estadounidense. La Ley 18.331 es contexto complementario. Los resúmenes no reemplazan los textos oficiales ni sus modificaciones.

## Entrega y estado

Publicado en https://ciberobservatorio-grupo4.onrender.com/index.html desde la rama `codex/ciberobservatorio` del repositorio conectado. Los cambios que se suben a esa rama se despliegan automáticamente en el sitio estático de Render.
