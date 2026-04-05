import base64
import binascii
import re
from typing import Dict, List, Tuple

from PIL import Image


PRINTABLE_MIN = 32
PRINTABLE_MAX = 126


def _is_printable_ascii(value: int) -> bool:
    return PRINTABLE_MIN <= value <= PRINTABLE_MAX


def _extract_bitstreams(img: Image.Image) -> Dict[str, str]:
    bits_r: List[str] = []
    bits_g: List[str] = []
    bits_b: List[str] = []
    bits_rgb: List[str] = []

    for r, g, b in img.getdata():
        br = str(r & 1)
        bg = str(g & 1)
        bb = str(b & 1)
        bits_r.append(br)
        bits_g.append(bg)
        bits_b.append(bb)
        bits_rgb.extend([br, bg, bb])

    return {
        "R": "".join(bits_r),
        "G": "".join(bits_g),
        "B": "".join(bits_b),
        "RGB": "".join(bits_rgb),
    }


def _decode_bits_with_offset(bits: str, offset: int) -> Tuple[str, List[int]]:
    payload = bits[offset:]
    values: List[int] = []

    for i in range(0, len(payload), 8):
        chunk = payload[i : i + 8]
        if len(chunk) < 8:
            break
        values.append(int(chunk, 2))

    chars = []
    for value in values:
        if value == 0:
            chars.append("\x00")
        elif _is_printable_ascii(value):
            chars.append(chr(value))
        else:
            chars.append(".")
    return "".join(chars), values


def _extract_readable_sections(decoded: str) -> List[str]:
    sections = re.findall(r"[ -~]{4,}", decoded)
    return sections[:6]


def _try_base64_decode(text: str) -> str:
    candidate = text.strip()
    if len(candidate) < 8:
        return ""
    if len(candidate) % 4 != 0:
        return ""
    if not re.fullmatch(r"[A-Za-z0-9+/=]+", candidate):
        return ""
    try:
        decoded = base64.b64decode(candidate, validate=True)
    except (binascii.Error, ValueError):
        return ""
    try:
        decoded_text = decoded.decode("ascii", errors="ignore")
    except Exception:
        return ""
    readable = re.findall(r"[ -~]{4,}", decoded_text)
    return readable[0] if readable else ""


def _score_candidate(readable_sections: List[str], delimiter_message: str, base64_guess: str) -> int:
    score = 0
    if readable_sections:
        score += max(len(s) for s in readable_sections)
        score += len(readable_sections) * 3
    if delimiter_message:
        score += 50
    if base64_guess:
        score += 20
    return score


def analyze_lsb_image(image_path: str, preferred_channel: str = "") -> Dict:
    img = Image.open(image_path).convert("RGB")
    bitstreams = _extract_bitstreams(img)
    candidates = []
    preferred = (preferred_channel or "").upper().strip()
    steps = [
        "1) Extraer LSB.",
        "2) Reconstruir binario.",
        "3) Convertir a ASCII.",
    ]

    for channel, bits in bitstreams.items():
        for offset in range(8):
            decoded, values = _decode_bits_with_offset(bits, offset)
            readable_sections = _extract_readable_sections(decoded)

            delimiter_message = ""
            if "###" in decoded:
                delimiter_message = decoded.split("###", 1)[0]

            base64_guess = ""
            if readable_sections:
                for section in readable_sections:
                    base64_guess = _try_base64_decode(section)
                    if base64_guess:
                        break

            score = _score_candidate(readable_sections, delimiter_message, base64_guess)
            if preferred and channel == preferred:
                score += 15
            if score == 0:
                continue

            preview = "".join(ch for ch in decoded[:120] if ch != "\x00")
            candidates.append(
                {
                    "channel": channel,
                    "offset": offset,
                    "bits_used": len(values) * 8,
                    "preview": preview,
                    "readable_sections": readable_sections,
                    "delimiter_message": delimiter_message,
                    "base64_decoded": base64_guess,
                    "score": score,
                }
            )

    candidates.sort(key=lambda item: item["score"], reverse=True)
    top_candidates = candidates[:10]
    best_guess = top_candidates[0] if top_candidates else None

    if best_guess:
        summary = (
            f"Canal probable: {best_guess['channel']} (offset {best_guess['offset']}). "
            f"Segmentos legibles detectados: {len(best_guess['readable_sections'])}."
        )
    else:
        summary = "No se detectaron mensajes legibles claros con LSB en los canales analizados."

    return {
        "bits_extracted": {name: len(bits) for name, bits in bitstreams.items()},
        "summary": summary,
        "steps": steps,
        "best_guess": best_guess,
        "candidates": top_candidates,
    }
