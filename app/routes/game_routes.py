import os
import re
import tempfile
import base64
import time

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
from app.services.lsb_analyzer import analyze_lsb_image
from app.services.lsb_embedder import embed_message_in_image
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

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "gif", "webp", "tif", "tiff"}
ALLOWED_MIME = {
    "image/png",
    "image/x-png",
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/bmp",
}
LEVELS = get_levels()
FINAL_EXAM_QUESTIONS = [
    {
        "id": 1,
        "question": "Cual es la principal diferencia entre esteganografia y criptografia?",
        "type": "mcq",
        "options": {
            "A": "La esteganografia oculta la existencia del mensaje; la criptografia oculta su contenido.",
            "B": "La criptografia oculta la existencia del mensaje; la esteganografia lo comprime.",
            "C": "Son lo mismo.",
            "D": "Ninguna de las anteriores.",
        },
        "answer": "A",
        "explanation": "Esteganografia esconde que existe mensaje. Criptografia protege el contenido.",
    },
    {
        "id": 2,
        "question": "Que significa LSB?",
        "type": "mcq",
        "options": {
            "A": "Last Secure Byte",
            "B": "Least Significant Bit",
            "C": "Local Signal Buffer",
            "D": "Low Security Block",
        },
        "answer": "B",
        "explanation": "LSB significa Least Significant Bit.",
    },
    {
        "id": 3,
        "question": "Selecciona el formato recomendado para preservar datos ocultos en imagen:",
        "type": "mcq",
        "options": {
            "A": "JPG",
            "B": "PNG",
            "C": "GIF",
            "D": "WEBP",
        },
        "answer": "B",
        "explanation": "PNG evita compresion con perdida que puede romper bits ocultos.",
    },
    {
        "id": 4,
        "question": "Que sistema convierte binario en caracteres de texto?",
        "type": "mcq",
        "options": {
            "A": "ASCII",
            "B": "PNG",
            "C": "RGB",
            "D": "LSB",
        },
        "answer": "A",
        "explanation": "ASCII mapea valores numericos a caracteres.",
    },
    {
        "id": 5,
        "question": "Selecciona la tecnica que usa caracteres Unicode invisibles para ocultar datos:",
        "type": "mcq",
        "options": {
            "A": "ROT13",
            "B": "Base64",
            "C": "Zero-width",
            "D": "Hash SHA-256",
        },
        "answer": "C",
        "explanation": "Los caracteres de ancho cero permiten ocultar bits sin verse.",
    },
    {
        "id": 6,
        "question": "Por que PNG suele ser mejor que JPG para LSB?",
        "type": "mcq",
        "options": {
            "A": "Porque PNG tiene colores mas brillantes",
            "B": "Porque JPG es sin perdida",
            "C": "Porque PNG evita compresion con perdida que puede romper bits ocultos",
            "D": "Porque PNG solo tiene canal rojo",
        },
        "answer": "C",
        "explanation": "JPG usa compresion con perdida; PNG/BMP preservan mejor bits LSB.",
    },
    {
        "id": 7,
        "question": "En LSB, selecciona que bit se modifica normalmente:",
        "type": "mcq",
        "options": {
            "A": "El primer bit (MSB)",
            "B": "El bit del medio",
            "C": "El bit menos significativo (LSB)",
            "D": "Todos los bits",
        },
        "answer": "C",
        "explanation": "Se modifica el bit menos significativo para reducir cambios visibles.",
    },
    {
        "id": 8,
        "question": "Si un byte termina en ...10110101, selecciona cual es su LSB:",
        "type": "mcq",
        "options": {
            "A": "0",
            "B": "1",
            "C": "No tiene LSB",
            "D": "Depende del canal RGB",
        },
        "answer": "B",
        "explanation": "El LSB es el ultimo bit del byte.",
    },
    {
        "id": 9,
        "question": "Que canal RGB suele ser menos perceptible a cambios sutiles?",
        "type": "mcq",
        "options": {
            "A": "Rojo",
            "B": "Verde",
            "C": "Azul",
            "D": "Ninguno",
        },
        "answer": "C",
        "explanation": "A menudo el ojo humano percibe menos cambios en el canal azul.",
    },
    {
        "id": 10,
        "question": "Uso comun de esteganografia en ciberseguridad:",
        "type": "mcq",
        "options": {
            "A": "Ocultar datos para evadir inspeccion basica",
            "B": "Aumentar velocidad del procesador",
            "C": "Eliminar metadatos de imagen",
            "D": "Corregir errores de red",
        },
        "answer": "A",
        "explanation": "Puede usarse para ocultar informacion en contenido aparentemente normal.",
    },
]

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


def _normalize_exam_answer(value):
    if value is None:
        return ""
    text = str(value).strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def _exam_public_questions():
    public = []
    for q in FINAL_EXAM_QUESTIONS:
        item = {
            "id": q["id"],
            "question": q["question"],
            "type": q["type"],
        }
        if q["type"] == "mcq":
            item["options"] = q["options"]
        public.append(item)
    return public


def _public_level(level):
    base = {
        "id": level["id"],
        "title": level["title"],
        "kind": level["kind"],
        "theory": level.get("theory", ""),
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
    return render_template("index.html")


@game_bp.get("/nivel2-intro")
def level2_intro_page():
    _, session_data = _get_active_session()
    if not session_data:
        return render_template("index.html")
    return render_template("level2_intro.html")


@game_bp.get("/nivel3-intro")
def level3_intro_page():
    _, session_data = _get_active_session()
    if not session_data:
        return render_template("index.html")
    return render_template("level3_intro.html")


@game_bp.get("/laboratorio-unicode")
def unicode_lab_page():
    return render_template("lab_unicode.html")


@game_bp.get("/laboratorio-imagen")
def image_lab_page():
    return render_template("lab_image.html")


@game_bp.get("/resultado")
def result_page():
    return render_template("result.html")


@game_bp.route("/examen-final", methods=["GET", "POST"])
def final_exam_page():
    _, session_data = _get_active_session()
    if not session_data:
        return render_template("index.html")

    exam_state = session_data.setdefault(
        "final_exam",
        {
            "submitted": False,
            "answers": {},
            "score": 0,
            "started_at": None,
            "submitted_at": None,
            "review": [],
        },
    )
    review = []
    now = time.time()
    if not exam_state.get("started_at"):
        exam_state["started_at"] = now

    if request.method == "POST":
        if exam_state.get("submitted"):
            started_at = exam_state.get("started_at") or session_data.get("start_time", now)
            submitted_at = exam_state.get("submitted_at") or now
            exam_elapsed = round(max(0, submitted_at - started_at), 2)
            session_elapsed = round(max(0, submitted_at - session_data.get("start_time", now)), 2)
            correct_count = int(exam_state.get("score", 0))
            return render_template(
                "final_test.html",
                questions=_exam_public_questions(),
                exam_state=exam_state,
                review=exam_state.get("review", []),
                exam_metrics={
                    "nickname": session_data.get("nickname", ""),
                    "exam_time": exam_elapsed,
                    "total_time": session_elapsed,
                    "correct": correct_count,
                    "incorrect": 10 - correct_count,
                },
                locked=True,
            )

        score = 0
        answers = {}
        for question in FINAL_EXAM_QUESTIONS:
            key = f"q{question['id']}"
            user_answer = _normalize_exam_answer(request.form.get(key, ""))
            expected = _normalize_exam_answer(question["answer"])
            is_correct = user_answer == expected
            if is_correct:
                score += 1
            answers[key] = user_answer
            review.append(
                {
                    "id": question["id"],
                    "question": question["question"],
                    "correct": is_correct,
                    "user_answer": user_answer,
                    "expected": question["answer"],
                    "explanation": question["explanation"],
                }
            )

        exam_state["submitted"] = True
        exam_state["answers"] = answers
        exam_state["score"] = score
        exam_state["review"] = review
        exam_state["submitted_at"] = time.time()

    started_at = exam_state.get("started_at") or now
    submitted_at = exam_state.get("submitted_at") or time.time()
    exam_elapsed = round(max(0, submitted_at - started_at), 2) if exam_state.get("submitted") else 0
    session_elapsed = round(max(0, submitted_at - session_data.get("start_time", now)), 2) if exam_state.get("submitted") else 0
    correct_count = int(exam_state.get("score", 0)) if exam_state.get("submitted") else 0

    return render_template(
        "final_test.html",
        questions=_exam_public_questions(),
        exam_state=exam_state,
        review=exam_state.get("review", []),
        exam_metrics={
            "nickname": session_data.get("nickname", ""),
            "exam_time": exam_elapsed,
            "total_time": session_elapsed,
            "correct": correct_count,
            "incorrect": 10 - correct_count,
        },
        locked=exam_state.get("submitted", False),
    )


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
    answer_key = str(level_id)
    if level_id == 2 and "steps" in level:
        current_step = int(session_data.get("level_steps", {}).get("2", 1))
        total_steps = len(level["steps"])
        if current_step < 1 or current_step > total_steps:
            current_step = 1
        step_info = level["steps"][current_step - 1]
        level_payload["payload_text"] = step_info["text"]
        level_payload["current_step"] = current_step
        level_payload["total_steps"] = total_steps
        answer_key = f"2-{current_step}"

    existing_attempt = session_data.get("answers", {}).get(answer_key)
    level_payload["answer_locked"] = bool(
        existing_attempt and existing_attempt.get("correct")
    )
    level_payload["submitted_answer"] = (
        existing_attempt.get("submitted", "") if existing_attempt else ""
    )

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

    existing_attempt = session_data.get("answers", {}).get(answer_key)
    if existing_attempt and existing_attempt.get("correct"):
        return _error_response(
            409,
            "answer_locked",
            "Este reto ya fue resuelto y la respuesta quedo bloqueada.",
        )

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
    existing_attempt = session_data.get("answers", {}).get(str(level_id))
    already_solved = bool(existing_attempt and existing_attempt.get("correct"))

    file = request.files.get("image")
    if not _allowed_image(file):
        return _error_response(
            400,
            "invalid_image",
            "Archivo invalido. Formatos permitidos: png, jpg, jpeg, bmp, gif, webp, tif, tiff.",
        )

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1] or ".png"
    temp_path = None
    analysis = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name

        preferred_channel = "R" if level_id == 5 else ""
        analysis = analyze_lsb_image(temp_path, preferred_channel=preferred_channel)
        decoded = decode_lsb(temp_path) if level_id == 4 else decode_lsb_red(temp_path)
        expected = LEVELS[level_id]["expected_answer"]
        is_correct = validate_answer(decoded, expected)
        if not already_solved:
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
            "analysis": analysis,
            "correct": is_correct,
            "answer_locked": already_solved,
            "feedback": (
                "Analisis realizado. Este nivel ya estaba resuelto; la validacion permanece bloqueada."
                if already_solved
                else (
                    "Imagen correcta. Mensaje decodificado con exito."
                    if is_correct
                    else "Mensaje decodificado, pero no coincide con la solucion esperada."
                )
            ),
            "current_level": session_data["current_level"],
            "correct_count": session_data["correct_count"],
            "completed": session_data["completed"],
        }
    )


@game_bp.post("/answer-image-manual")
def answer_image_manual():
    _, session_data = _get_active_session()
    if not session_data:
        return _error_response(401, "missing_session", "No hay una sesion activa.")

    data = request.get_json(silent=True) or {}
    level_id = int(data.get("level_id", 0))
    user_answer = _sanitize_answer(data.get("answer", ""))

    if level_id not in (4, 5):
        return _error_response(400, "invalid_level", "Este endpoint solo aplica a niveles 4 y 5.")

    if not can_access_level(session_data, level_id):
        return _error_response(403, "level_locked", "No puedes responder este nivel todavia.")
    existing_attempt = session_data.get("answers", {}).get(str(level_id))
    if existing_attempt and existing_attempt.get("correct"):
        return _error_response(
            409,
            "answer_locked",
            "Este reto ya fue resuelto y la respuesta quedo bloqueada.",
        )

    if not user_answer:
        return _error_response(400, "empty_answer", "La respuesta no puede estar vacia.")

    expected = LEVELS[level_id]["expected_answer"]
    is_correct = validate_answer(user_answer, expected)
    save_attempt(session_data, level_id, user_answer, is_correct)

    return _success_response(
        {
            "level_id": level_id,
            "correct": is_correct,
            "result_label": "Correcto" if is_correct else "Incorrecto",
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
                "message": "No se detectó un mensaje oculto.",
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


@game_bp.post("/lab/embed-image-lsb")
def lab_embed_image_lsb():
    file = request.files.get("image")
    secret = (request.form.get("secret", "") or "").strip()
    mode = (request.form.get("mode", "RGB") or "RGB").upper()

    if not _allowed_image(file):
        return _error_response(
            400,
            "invalid_image",
            "Archivo invalido. Formatos permitidos: png, jpg, jpeg, bmp, gif, webp, tif, tiff.",
        )
    if not secret:
        return _error_response(400, "empty_secret", "Debes ingresar un mensaje para ocultar.")

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1] or ".png"
    input_temp = None
    output_temp = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_in:
            file.save(temp_in.name)
            input_temp = temp_in.name

        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_out:
            output_temp = temp_out.name

        report = embed_message_in_image(
            input_path=input_temp,
            output_path=output_temp,
            secret_message=secret,
            mode=mode,
        )

        with open(output_temp, "rb") as fh:
            encoded_image = base64.b64encode(fh.read()).decode("ascii")

        return _success_response(
            {
                "report": report,
                "download_filename": "imagen_con_mensaje.png",
                "image_base64": encoded_image,
                "mime": "image/png",
            }
        )
    except Exception as exc:
        return _error_response(400, "embed_error", f"No se pudo ocultar el mensaje: {exc}")
    finally:
        if input_temp and os.path.exists(input_temp):
            os.remove(input_temp)
        if output_temp and os.path.exists(output_temp):
            os.remove(output_temp)


@game_bp.post("/lab/analyze-image")
def lab_analyze_image():
    file = request.files.get("image")
    if not _allowed_image(file):
        return _error_response(
            400,
            "invalid_image",
            "Archivo invalido. Formatos permitidos: png, jpg, jpeg, bmp, gif, webp, tif, tiff.",
        )

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1] or ".png"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name

        analysis = analyze_lsb_image(temp_path)
        decoded_rgb = decode_lsb(temp_path)
        decoded_red = decode_lsb_red(temp_path)
        return _success_response(
            {
                "analysis": analysis,
                "decoded_rgb": decoded_rgb,
                "decoded_red": decoded_red,
            }
        )
    except Exception:
        return _error_response(400, "decode_error", "No se pudo procesar la imagen del laboratorio.")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

