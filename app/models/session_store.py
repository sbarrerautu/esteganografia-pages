import os
import threading
import time
import uuid
from typing import Dict

from PIL import Image

from app.services.validators import calculate_score
from app.services.zero_width_codec import encode_message

MAX_LEVEL = 5
SESSIONS: Dict[str, dict] = {}
LOCK = threading.Lock()


def _embed_message_rgb(path, message):
    binary = "".join(format(ord(c), "08b") for c in (message + "\x00"))
    width = max(16, ((len(binary) + 2) // 3) + 1)
    height = max(16, ((len(binary) + (width * 3) - 1) // (width * 3)) + 1)
    img = Image.new("RGB", (width, height), color=(120, 170, 210))
    pixels = list(img.getdata())
    bit_index = 0

    new_pixels = []
    for r, g, b in pixels:
        channels = [r, g, b]
        for idx in range(3):
            if bit_index < len(binary):
                channels[idx] = (channels[idx] & ~1) | int(binary[bit_index])
                bit_index += 1
        new_pixels.append(tuple(channels))

    img.putdata(new_pixels)
    img.save(path, format="PNG")


def _embed_message_red(path, message):
    binary = "".join(format(ord(c), "08b") for c in (message + "\x00"))
    width = max(32, len(binary) + 1)
    img = Image.new("RGB", (width, 1), color=(180, 80, 80))
    pixels = list(img.getdata())

    new_pixels = []
    for idx, (r, g, b) in enumerate(pixels):
        if idx < len(binary):
            r = (r & ~1) | int(binary[idx])
        new_pixels.append((r, g, b))

    img.putdata(new_pixels)
    img.save(path, format="PNG")


def ensure_challenge_images(static_root):
    challenge_dir = os.path.join(static_root, "challenges")
    os.makedirs(challenge_dir, exist_ok=True)

    level4 = os.path.join(challenge_dir, "level4.png")
    level5 = os.path.join(challenge_dir, "level5.png")

    if not os.path.exists(level4):
        _embed_message_rgb(level4, "pixel")
    if not os.path.exists(level5):
        _embed_message_red(level5, "rojo")


def get_levels():
    zw_payload = encode_message(
        "INTEGRIDAD",
        "este es un mensaje completamente normal que parece no tener nada oculto ",
    )
    return {
        1: {
            "id": 1,
            "title": "Nivel 1 - Espacios variables",
            "kind": "text",
            "theory": "La esteganografia con espacios variables oculta informacion usando grupos de espacios entre palabras. Cada cantidad de espacios representa una letra.",
            "question": "la informacion es poder",
            "instruction": "Descifra el mensaje usando cantidad de espacios: 1=A, 2=B, ..., 26=Z.",
            "payload_text": "la   informacion            es poder                      oculta     clave",
            "expected_answer": "CLAVE",
            "hint": "Cuenta solo grupos de espacios entre palabras.",
        },
        2: {
            "id": 2,
            "title": "Nivel 2 - Acrostico",
            "kind": "text",
            "theory": "El acrostico oculta un mensaje usando letras del texto. Puede resolverse por lineas, palabras o posiciones especificas.",
            "question": "Extrae la primera letra de cada linea.",
            "instruction": "Toma la primera letra de cada linea para revelar el mensaje.",
            "steps": [
                {
                    "text": "Siempre buscamos nuevas formas de aprender\nEstudiar con atención es clave para mejorar\nGanar experiencia requiere práctica constante\nUn buen analista observa cada detalle\nReconocer patrones es fundamental en seguridad\nOtro paso más te acerca a la solución",
                    "expected_answer": "SEGURO",
                },
                {
                    "text": "Dado que la informacion viene A nuestras vidas, Toda la info puede cambiar con el tiempo, Oculta detalles que pocos notan, Su pasado siempre deja pistas.",
                    "decoder": "indexed_letters",
                    "positions": [1, 2, 31, 41, 86],
                    "expected_answer": "DATOS",
                },
            ],
            "expected_answer": "DATOS",
            "hint": "Solo importa la primera letra de cada linea no vacia.",
        },
        3: {
            "id": 3,
            "title": "Nivel 3 - Unicode invisible",
            "kind": "text",
            "theory": "Los caracteres Unicode invisibles (zero-width) no se ven en pantalla, pero pueden representar bits 0/1 para ocultar mensajes.",
            "question": "",
            "instruction": "Instrucciones:\n\nSe te mostrará un texto que parece normal, pero contiene información oculta.\n\nTu objetivo es:\n- Detectar que hay algo escondido\n- Analizar el contenido del texto\n- Encontrar el mensaje oculto",
            "payload_text": zw_payload,
            "expected_answer": "INTEGRIDAD",
            "hint": "Pista:\nNo todo lo que ves es todo lo que hay.\nEl mensaje no está en las palabras visibles.",
        },
        4: {
            "id": 4,
            "title": "Nivel 4 - Imagen LSB RGB",
            "kind": "image",
            "theory": "LSB en RGB modifica el bit menos significativo de los canales R, G y B para ocultar informacion de forma casi imperceptible.",
            "question": "Extrae bits LSB de canales RGB.",
            "instruction": "Sube una imagen y extrae LSB de los canales RGB para obtener el mensaje.",
            "challenge_image": "/static/challenges/level4.png",
            "expected_answer": "pixel",
            "hint": "Empieza leyendo bit menos significativo de R, G y B.",
        },
        5: {
            "id": 5,
            "title": "Nivel 5 - Imagen LSB Avanzado",
            "kind": "image",
            "theory": "En este nivel avanzado se usa solo el canal rojo. Se extrae el bit R&1 de cada pixel para reconstruir el mensaje.",
            "question": "Extrae solo LSB del canal rojo.",
            "instruction": "Sube una imagen y decodifica solo desde el canal rojo.",
            "challenge_image": "/static/challenges/level5.png",
            "expected_answer": "rojo",
            "hint": "En este nivel solo usa LSB del canal R.",
        },
    }


def _blank_session(nickname):
    now = time.time()
    return {
        "nickname": nickname,
        "start_time": now,
        "current_level": 1,
        "correct_count": 0,
        "answers": {},
        "level_start_times": {"1": now},
        "level_elapsed": {},
        "level_steps": {"2": 1},
        "completed": False,
        "final_exam": {
            "submitted": False,
            "answers": {},
            "score": 0,
        },
    }


def create_session(nickname):
    session_id = str(uuid.uuid4())
    with LOCK:
        SESSIONS[session_id] = _blank_session(nickname)
    return session_id


def get_session_data(session_id):
    if not session_id:
        return None
    with LOCK:
        return SESSIONS.get(session_id)


def can_access_level(session_data, level_id):
    if level_id < 1 or level_id > MAX_LEVEL:
        return False
    return level_id <= session_data["current_level"]


def _ensure_level_timer(session_data, level_id):
    key = str(level_id)
    if key not in session_data["level_start_times"]:
        session_data["level_start_times"][key] = time.time()


def save_attempt(
    session_data,
    level_id,
    user_answer,
    is_correct,
    decoded_message=None,
    answer_key=None,
    complete_level=True,
):
    now = time.time()
    level_key = str(level_id)
    answer_slot = answer_key if answer_key else level_key
    _ensure_level_timer(session_data, level_id)

    session_data["answers"][answer_slot] = {
        "submitted": user_answer,
        "decoded_message": decoded_message,
        "correct": is_correct,
        "timestamp": now,
    }

    if not is_correct:
        return

    if not complete_level:
        return

    if level_key not in session_data["level_elapsed"]:
        elapsed = now - session_data["level_start_times"][level_key]
        session_data["level_elapsed"][level_key] = round(elapsed, 2)
        session_data["correct_count"] += 1

    if session_data["current_level"] <= level_id and level_id < MAX_LEVEL:
        next_level = level_id + 1
        session_data["current_level"] = max(session_data["current_level"], next_level)
        session_data["level_start_times"][str(next_level)] = now

    session_data["completed"] = session_data["correct_count"] >= MAX_LEVEL


def get_state_payload(session_data):
    return {
        "nickname": session_data["nickname"],
        "start_time": session_data["start_time"],
        "current_level": session_data["current_level"],
        "level_steps": session_data.get("level_steps", {}),
        "correct_count": session_data["correct_count"],
        "completed": session_data["completed"],
    }


def get_result_payload(session_data):
    total_time = round(time.time() - session_data["start_time"], 2)
    correct = session_data["correct_count"]
    return {
        "nickname": session_data["nickname"],
        "total_time": total_time,
        "score": calculate_score(correct, total_time),
        "correct_answers": correct,
        "per_level_time": session_data["level_elapsed"],
    }
