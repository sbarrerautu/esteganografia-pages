import argparse
import base64
import binascii
import os
import re
import sys
from typing import Dict, List

from PIL import Image


PRINTABLE_MIN = 32
PRINTABLE_MAX = 126


def load_image_rgb(image_path: str) -> Image.Image:
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"No se encontro el archivo: {image_path}")
    return Image.open(image_path).convert("RGB")


def extract_red_lsb_bits(img: Image.Image) -> str:
    bits: List[str] = []
    for r, _g, _b in img.getdata():
        bits.append(str(r & 1))
    return "".join(bits)


def decode_bits_to_ascii(bits: str, offset: int) -> Dict:
    payload = bits[offset:]
    values: List[int] = []
    for i in range(0, len(payload), 8):
        chunk = payload[i : i + 8]
        if len(chunk) < 8:
            break
        values.append(int(chunk, 2))

    chars: List[str] = []
    for value in values:
        if value == 0:
            chars.append("\x00")
        elif PRINTABLE_MIN <= value <= PRINTABLE_MAX:
            chars.append(chr(value))
        else:
            chars.append(".")
    decoded = "".join(chars)
    readable = re.findall(r"[ -~]{4,}", decoded)
    clean = decoded.split("###", 1)[0] if "###" in decoded else ""
    return {
        "offset": offset,
        "decoded": decoded,
        "readable": readable,
        "clean_message": clean,
        "bits_used": len(values) * 8,
    }


def try_base64(text: str) -> str:
    candidate = text.strip()
    if len(candidate) < 8 or len(candidate) % 4 != 0:
        return ""
    if not re.fullmatch(r"[A-Za-z0-9+/=]+", candidate):
        return ""
    try:
        raw = base64.b64decode(candidate, validate=True)
    except (binascii.Error, ValueError):
        return ""
    decoded = raw.decode("utf-8", errors="ignore")
    readable = re.findall(r"[ -~]{4,}", decoded)
    return readable[0] if readable else ""


def score_result(result: Dict) -> int:
    score = 0
    if result["readable"]:
        score += max(len(s) for s in result["readable"])
    if result["clean_message"]:
        score += 40
    return score


def analyze_red_channel(image_path: str, preview_only: bool = False) -> Dict:
    img = load_image_rgb(image_path)
    bits = extract_red_lsb_bits(img)
    results: List[Dict] = []

    for offset in range(8):
        data = decode_bits_to_ascii(bits, offset)
        data["score"] = score_result(data)
        data["base64"] = ""
        if data["readable"]:
            for section in data["readable"]:
                decoded_b64 = try_base64(section)
                if decoded_b64:
                    data["base64"] = decoded_b64
                    data["score"] += 20
                    break
        results.append(data)

    results.sort(key=lambda item: item["score"], reverse=True)
    best = results[0] if results else None

    return {
        "image_name": os.path.basename(image_path),
        "total_bits": len(bits),
        "results": results,
        "best": best,
        "preview_only": preview_only,
    }


def print_report(report: Dict) -> None:
    print("=== Analizador LSB (Canal Rojo) ===")
    print(f"Imagen: {report['image_name']}")
    print(f"Bits extraidos (R): {report['total_bits']}")
    print("")
    print("Resultados por offset (0-7):")

    for result in report["results"]:
        print(f"\nOffset {result['offset']} | score={result['score']} | bits={result['bits_used']}")
        if result["clean_message"]:
            print(f"Mensaje limpio (###): {result['clean_message']}")
        if result["readable"]:
            print("Texto legible:")
            for section in result["readable"][:3]:
                print(f"- {section}")
        else:
            print("Texto legible: no detectado")
        if result["base64"]:
            print(f"Base64 detectado: {result['base64']}")

    best = report.get("best")
    print("\n=== Mejor candidato ===")
    if not best:
        print("No se detectaron candidatos legibles.")
        return
    print(f"Offset sugerido: {best['offset']}")
    if best["clean_message"]:
        print(f"Mensaje final: {best['clean_message']}")
    elif best["readable"]:
        print(f"Texto sugerido: {best['readable'][0]}")
    else:
        print("No se encontro un mensaje limpio.")


def save_output(text: str, output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as file:
        file.write(text)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analiza una imagen y extrae datos ocultos LSB del canal rojo."
    )
    parser.add_argument("image", help="Ruta de la imagen a analizar")
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Muestra solo texto legible del mejor candidato",
    )
    parser.add_argument(
        "--save",
        action="store_true",
        help="Guarda el mensaje final en output.txt",
    )
    args = parser.parse_args()

    try:
        report = analyze_red_channel(args.image, preview_only=args.preview)
    except Exception as exc:
        print(f"Error: {exc}")
        sys.exit(1)

    best = report.get("best") or {}
    final_text = ""
    if best.get("clean_message"):
        final_text = best["clean_message"]
    elif best.get("readable"):
        final_text = best["readable"][0]

    if args.preview:
        print(final_text if final_text else "No se detecto texto legible.")
    else:
        print_report(report)

    if args.save:
        save_output(final_text, "output.txt")
        print("\nMensaje guardado en output.txt")


if __name__ == "__main__":
    main()
