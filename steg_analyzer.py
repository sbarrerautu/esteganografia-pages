import os
import sys

from app.services.lsb_analyzer import analyze_lsb_image


def main():
    if len(sys.argv) != 2:
        print("Uso: python steg_analyzer.py <imagen>")
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"Error: archivo no encontrado -> {image_path}")
        sys.exit(1)

    try:
        report = analyze_lsb_image(image_path)
    except Exception as exc:
        print(f"Error al analizar la imagen: {exc}")
        sys.exit(1)

    print("=== Analisis LSB ===")
    print("Bits extraidos:")
    for channel, count in report["bits_extracted"].items():
        print(f"- {channel}: {count}")

    print("\nResumen:")
    print(report["summary"])

    print("\nPaso a paso:")
    for step in report["steps"]:
        print(f"- {step}")

    print("\nMensajes posibles:")
    if not report["candidates"]:
        print("- No se detectaron candidatos legibles.")
        return

    for idx, candidate in enumerate(report["candidates"], start=1):
        print(f"\n[{idx}] Canal={candidate['channel']} Offset={candidate['offset']} Score={candidate['score']}")
        print(f"Preview: {candidate['preview']}")
        if candidate["readable_sections"]:
            print("Secciones legibles:")
            for section in candidate["readable_sections"]:
                print(f"  - {section}")
        if candidate["delimiter_message"]:
            print(f"Delimitador ### detectado: {candidate['delimiter_message']}")
        if candidate["base64_decoded"]:
            print(f"Posible base64 decodificado: {candidate['base64_decoded']}")


if __name__ == "__main__":
    main()
