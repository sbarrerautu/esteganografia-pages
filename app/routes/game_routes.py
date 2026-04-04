import os
import re
import tempfile

from flask import Blueprint, jsonify, render_template, request, session
from werkzeug.utils import secure_filename

from app.models.session_store import (
    can_access_level,
    create_session,
    get_levels,
    get_result_payload,
    get_session_data,
    get_state_payload,
    save_attempt,
)
from app.services.decoders import (
    decode_acrostic,
    decode_lsb,
    decode_lsb_red,
    decode_spaces,
)
from app.services.validators import validate_answer
from app.services.zero_width_codec import (
    debug_codepoints,
    debug_zero_width,
    decode_with_details,
    decode_message,
    encode_message,
    has_invisible,
    validate_encoded_text,
)

game_bp = Blueprint("game", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp"}
ALLOWED_MIME = {
    "image/png",
    "image/x-png",
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/bmp",
}
LEVELS = get_levels()


def _decode_indexed_letters(text, positions):
    lines = text.strip().split("\n")

    if len(lines) == 1:
        letters_only = "".join(ch for ch in lines[0] if ch.isalpha())
        output = []
        for pos in positions:
            if 1 <= pos <= len(letters_only):
                output.append(letters_only[pos - 1])
        return "".join(output)

    output = []
    for idx, line in enumerate(lines):
        if idx >= len(positions):
            break
        letters_only = "".join(
            ch for ch in line if ch.isalpha()
        )
        pos = positions[idx]
        if pos < 1 or pos > len(letters_only):
            continue
        output.append(letters_only[pos - 1])
    return "".join(output)


def _error_response(status_code, code, message):
    return (
        jsonify({"ok": False, "error": {"code": code, "message": message}}),
        status_code,
    )


def _success_response(payload=None):
    data = {"ok": True}
    if payload:
        data.update(payload)
    return jsonify(data)


def _sanitize_nickname(value):
    if not value:
        return ""
    cleaned = re.sub(r"[^a-zA-Z0-9_\- ]", "", value).strip()
    return cleaned[:24]


def _sanitize_answer(value):
    if not value:
        return ""
    return value.strip()[:200]


def _get_active_session():
    session_id = session.get("session_id")
    data = get_session_data(session_id)
    return session_id, data


def _public_level(level):
    base = {
        "id": level["id"],
        "title": level["title"],
        "kind": level["kind"],
        "question": level["question"],
        "instruction": level["instruction"],
        "hint": level["hint"],
    }
    if level["kind"] == "text":
        if "payload_text" in level:
            base["payload_text"] = level["payload_text"]
    else:
        base["challenge_image"] = level["challenge_image"]
    return base


def _allowed_image(file_storage):
    if not file_storage or not file_storage.filename:
        return False
    ext = (
        file_storage.filename.rsplit(".", 1)[-1].lower()
        if "." in file_storage.filename
        else ""
    )
    mime = (file_storage.mimetype or "").lower()
    # Some browsers send variant MIME values. We allow common image MIME values
    # and still enforce extension + decoding step for safety.
    mime_ok = mime in ALLOWED_MIME or mime.startswith("image/")
    return ext in ALLOWED_EXTENSIONS and mime_ok


@game_bp.get("/")
def index_page():
    return render_template("index.html")


@game_bp.get("/game")
def game_page():
    return render_template("game.html")


@game_bp.get("/intro")
def intro_page():
    return render_template("intro.html")


@game_bp.get("/nivel2-intro")
def level2_intro_page():
    _, session_data = _get_active_session()
    if not session_data:
        return render_template("index.html")
    if session_data["current_level"] < 2:
        return render_template("game.html")
    return render_template("level2_intro.html")


@game_bp.get("/nivel3-intro")
def level3_intro_page():
    _, session_data = _get_active_session()
    if not session_data:
        return render_template("index.html")
    if session_data["current_level"] < 3:
        return render_template("game.html")
    return render_template("level3_intro.html")


@game_bp.get("/resultado")
def result_page():
    return render_template("result.html")


@game_bp.post("/start")
def start_session():
    data = request.get_json(silent=True) or {}
    nickname = _sanitize_nickname(data.get("nickname", ""))
    if not nickname:
        return _error_response(400, "invalid_nickname", "Debes ingresar un nickname valido.")

    session_id = create_session(nickname)
    session["session_id"] = session_id

    return _success_response(
        {
            "message": "Sesion iniciada.",
            "nickname": nickname,
            "current_level": 1,
            "max_level": 5,
        }
    )


@game_bp.get("/state")
def state():
    _, session_data = _get_active_session()
    if not session_data:
        return _error_response(401, "missing_session", "No hay una sesion activa.")
    return _success_response({"state": get_state_payload(session_data)})


@game_bp.get("/level/<int:level_id>")
def get_level(level_id):
    _, session_data = _get_active_session()
    if not session_data:
        return _error_response(401, "missing_session", "No hay una sesion activa.")

    level = LEVELS.get(level_id)
    if not level:
        return _error_response(404, "level_not_found", "Nivel no encontrado.")

    if not can_access_level(session_data, level_id):
        return _error_response(
            403,
            "level_locked",
            "No puedes saltar niveles. Completa el nivel actual primero.",
        )

    level_payload = _public_level(level)
    if level_id == 2 and "steps" in level:
        current_step = int(session_data.get("level_steps", {}).get("2", 1))
        total_steps = len(level["steps"])
        if current_step < 1 or current_step > total_steps:
            current_step = 1
        step_info = level["steps"][current_step - 1]
        level_payload["payload_text"] = step_info["text"]
        level_payload["current_step"] = current_step
        level_payload["total_steps"] = total_steps

    return _success_response(
        {
            "level": level_payload,
            "current_level": session_data["current_level"],
            "max_level": 5,
            "correct_count": session_data["correct_count"],
        }
    )


@game_bp.post("/answer")
def submit_answer():
    _, session_data = _get_active_session()
    if not session_data:
        return _error_response(401, "missing_session", "No hay una sesion activa.")

    data = request.get_json(silent=True) or {}
    level_id = int(data.get("level_id", 0))
    user_answer = _sanitize_answer(data.get("answer", ""))

    if level_id not in LEVELS:
        return _error_response(404, "level_not_found", "Nivel no encontrado.")

    if level_id > 3:
        return _error_response(
            400,
            "wrong_endpoint",
            "Este nivel requiere subida de imagen. Usa /upload-image.",
        )

    if not can_access_level(session_data, level_id):
        return _error_response(
            403, "level_locked", "No puedes responder este nivel todavia."
        )

    if not user_answer:
        return _error_response(400, "empty_answer", "La respuesta no puede estar vacia.")

    expected_answer = LEVELS[level_id]["expected_answer"]
    step_id = int(data.get("step_id", 1))

    if level_id == 1:
        level_payload = LEVELS[level_id]["payload_text"]
        expected_answer = LEVELS[level_id]["expected_answer"]
        correct_answer = decode_spaces(level_payload)
        answer_key = "1"
        complete_level = True
    elif level_id == 2:
        steps = LEVELS[2]["steps"]
        current_step = int(session_data.get("level_steps", {}).get("2", 1))
        if step_id != current_step:
            return _error_response(
                403,
                "step_locked",
                "No puedes saltar retos. Completa el reto actual primero.",
            )
        if step_id < 1 or step_id > len(steps):
            return _error_response(400, "invalid_step", "Reto no valido.")

        step_info = steps[step_id - 1]
        if step_info.get("decoder") == "indexed_letters":
            correct_answer = _decode_indexed_letters(
                step_info["text"], step_info.get("positions", [])
            )
        else:
            correct_answer = decode_acrostic(step_info["text"])
        expected_answer = step_info["expected_answer"]
        answer_key = f"2-{step_id}"
        complete_level = step_id == len(steps)
    else:
        level_payload = LEVELS[level_id]["payload_text"]
        expected_answer = LEVELS[level_id]["expected_answer"]
        correct_answer = decode_message(level_payload)
        answer_key = str(level_id)
        complete_level = True

    is_correct = validate_answer(user_answer, correct_answer)
    save_attempt(
        session_data,
        level_id,
        user_answer,
        is_correct,
        answer_key=answer_key,
        complete_level=complete_level,
    )

    if level_id == 2 and is_correct:
        steps = LEVELS[2]["steps"]
        current_step = int(session_data.get("level_steps", {}).get("2", 1))
        if current_step < len(steps):
            session_data["level_steps"]["2"] = current_step + 1

    return _success_response(
        {
            "level_id": level_id,
            "correct": is_correct,
            "result_label": "Correcto" if is_correct else "Incorrecto",
            "expected_answer": expected_answer if is_correct else None,
            "current_step": int(session_data.get("level_steps", {}).get("2", 1))
            if level_id == 2
            else 1,
            "total_steps": len(LEVELS[2]["steps"]) if level_id == 2 else 1,
            "feedback": (
                "Respuesta correcta. Puedes avanzar al siguiente nivel."
                if is_correct
                else "Respuesta incorrecta. Intenta nuevamente."
            ),
            "current_level": session_data["current_level"],
            "correct_count": session_data["correct_count"],
            "completed": session_data["completed"],
        }
    )


@game_bp.post("/upload-image")
def upload_image():
    _, session_data = _get_active_session()
    if not session_data:
        return _error_response(401, "missing_session", "No hay una sesion activa.")

    level_id = int(request.form.get("level_id", 0))
    if level_id not in (4, 5):
        return _error_response(400, "invalid_level", "Este endpoint solo acepta niveles 4 y 5.")

    if not can_access_level(session_data, level_id):
        return _error_response(
            403, "level_locked", "No puedes responder este nivel todavia."
        )

    file = request.files.get("image")
    if not _allowed_image(file):
        return _error_response(
            400,
            "invalid_image",
            "Archivo invalido. Solo se permiten imagenes png, jpg, jpeg o bmp.",
        )

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1] or ".png"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name

        decoded = decode_lsb(temp_path) if level_id == 4 else decode_lsb_red(temp_path)
        expected = LEVELS[level_id]["expected_answer"]
        is_correct = validate_answer(decoded, expected)
        save_attempt(session_data, level_id, decoded, is_correct, decoded_message=decoded)
    except Exception:
        return _error_response(400, "decode_error", "No se pudo procesar la imagen.")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    return _success_response(
        {
            "level_id": level_id,
            "decoded_message": decoded,
            "correct": is_correct,
            "feedback": (
                "Imagen correcta. Mensaje decodificado con exito."
                if is_correct
                else "Mensaje decodificado, pero no coincide con la solucion esperada."
            ),
            "current_level": session_data["current_level"],
            "correct_count": session_data["correct_count"],
            "completed": session_data["completed"],
        }
    )


@game_bp.get("/result")
def result():
    _, session_data = _get_active_session()
    if not session_data:
        return _error_response(401, "missing_session", "No hay una sesion activa.")

    if not session_data["completed"]:
        return _error_response(
            403, "not_finished", "Debes completar los 5 niveles antes de ver el resultado."
        )

    return _success_response(get_result_payload(session_data))


@game_bp.post("/lab/encode-zero-width")
def lab_encode_zero_width():
    data = request.get_json(silent=True) or {}
    secret = data.get("secret", "")
    cover = data.get("cover", "")
    try:
        encoded = encode_message(secret, cover)
    except ValueError as exc:
        return _error_response(400, "invalid_secret", str(exc))
    return _success_response(
        {
            "encoded_text": encoded,
            "validation": validate_encoded_text(encoded),
            "bits": debug_zero_width(encoded),
        }
    )


@game_bp.post("/lab/decode-zero-width")
def lab_decode_zero_width():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    if not has_invisible(text):
        return _success_response(
            {
                "decoded_message": "",
                "validation": "INVALID: not enough data",
                "bits": "",
                "warning": "El texto puede haber perdido caracteres invisibles durante copiar/pegar.",
                "message": "No se detecto un mensaje oculto.",
                "invisible_count": 0,
                "binary": "",
                "steps": [],
            }
        )
    details = decode_with_details(text)
    decoded = details["decoded"]
    validation = validate_encoded_text(text)
    if validation == "VALID" and not details.get("terminated", False):
        validation = "INVALID: missing terminator"
        decoded = ""
    warning = (
        "El texto puede haber perdido caracteres invisibles durante copiar/pegar."
        if validation != "VALID"
        else ""
    )
    return _success_response(
        {
            "decoded_message": decoded,
            "validation": validation,
            "bits": details["binary"],
            "warning": warning,
            "invisible_count": len(details["binary"]),
            "binary": details["binary"],
            "steps": details["steps"],
            "terminated": details.get("terminated", False),
        }
    )


@game_bp.post("/lab/validate-zero-width")
def lab_validate_zero_width():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    return _success_response(
        {
            "validation": validate_encoded_text(text),
            "bits": debug_zero_width(text),
        }
    )


@game_bp.post("/lab/debug-zero-width")
def lab_debug_zero_width():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    codepoints = debug_codepoints(text)
    for cp in codepoints:
        print(cp)
    return _success_response(
        {
            "codepoints": codepoints,
            "bits": debug_zero_width(text),
            "validation": validate_encoded_text(text),
        }
    )
