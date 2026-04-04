# Esteganografia Didactica (GitHub Pages)

Sitio estatico en HTML/CSS/JS para demostrar esteganografia textual con metodo de acrostico.

## Estructura

- `index.html`: interfaz principal.
- `styles.css`: estilos responsivos.
- `app.js`: logica del nivel y laboratorio.
- `.github/workflows/pages.yml`: despliegue automatico a GitHub Pages.

## Publicacion en GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube el contenido de esta carpeta (`steganografia-pages`) a la rama `main`.
3. En GitHub, entra a `Settings > Pages` y en `Source` selecciona `GitHub Actions`.
4. Haz push a `main` y espera a que termine el workflow `Deploy static site to Pages`.
5. Tu sitio quedara publicado en: `https://TU_USUARIO.github.io/TU_REPO/`

## Nota

Si quieres publicar en la raiz del dominio de usuario (`https://TU_USUARIO.github.io/`), el repo debe llamarse `TU_USUARIO.github.io`.
