# StegChallenge

Aplicacion web para practicar esteganografia en 5 niveles progresivos (quiz + CTF) con Flask, HTML/CSS y JavaScript vanilla.

## Requisitos

- Python 3.10+

## Instalacion y ejecucion

```bash
pip install -r requirements.txt
python app.py
```

Luego abre `http://127.0.0.1:5000/`.

## Deploy gratis en Render

El proyecto ya incluye configuracion para Render en [`render.yaml`](render.yaml).

1. Sube este proyecto a un repositorio de GitHub.
2. Entra a [Render](https://render.com/) y conecta tu cuenta de GitHub.
3. Crea un nuevo **Blueprint** y selecciona el repo.
4. Render detectara `render.yaml` y creara el servicio web.
5. Espera a que termine el build y abre la URL publica que te entrega Render.

## Flujo del juego

1. Ingresa nickname.
2. Completa niveles 1 a 5 en orden.
3. Recibe feedback inmediato por respuesta.
4. Consulta resultado final con tiempo total, puntaje y respuestas correctas.
