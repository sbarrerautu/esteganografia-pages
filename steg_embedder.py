import argparse
import os
import sys

from app.services.lsb_embedder import embed_message_in_image


def main():
    parser = argparse.ArgumentParser(
        description="Oculta mensajes en imágenes usando LSB."
    )
    parser.add_argument("input_image", help="Ruta de imagen de entrada")
    parser.add_argument("output_image", help="Ruta de imagen de salida")
    parser.add_argument("message", help="Mensaje a ocultar")
    parser.add_argument(
        "--mode",
        default="RGB",
        choices=["RGB", "R", "G", "B"],
        help="Canal de ocultación (RGB por defecto)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.input_image):
        print(f"Error: no existe {args.input_image}")
        sys.exit(1)

    try:
        report = embed_message_in_image(
            input_path=args.input_image,
            output_path=args.output_image,
            secret_message=args.message,
            mode=args.mode,
        )
    except Exception as exc:
        print(f"Error al ocultar mensaje: {exc}")
        sys.exit(1)

    print("Imagen generada correctamente.")
    print(f"Modo: {report['mode']}")
    print(f"Bits escritos: {report['bits_written']}")
    print(f"Capacidad total: {report['capacity_bits']}")
    print(f"Salida: {report['output_path']}")


if __name__ == "__main__":
    main()
