from PIL import Image


def _to_bits(payload: bytes) -> str:
    return "".join(format(byte, "08b") for byte in payload)


def embed_message_in_image(
    input_path: str,
    output_path: str,
    secret_message: str,
    mode: str = "RGB",
    delimiter: str = "###",
):
    img = Image.open(input_path).convert("RGB")
    pixels = list(img.getdata())

    mode = (mode or "RGB").upper()
    if mode not in {"RGB", "R", "G", "B"}:
        raise ValueError("Modo inválido. Usa RGB, R, G o B.")

    payload = f"{secret_message}{delimiter}".encode("utf-8")
    bits = _to_bits(payload)

    if mode == "RGB":
        capacity = len(pixels) * 3
    else:
        capacity = len(pixels)

    if len(bits) > capacity:
        raise ValueError(
            f"Mensaje demasiado largo para esta imagen. Bits requeridos={len(bits)}, capacidad={capacity}."
        )

    bit_idx = 0
    new_pixels = []
    for r, g, b in pixels:
        if mode == "RGB":
            channels = [r, g, b]
            for i in range(3):
                if bit_idx < len(bits):
                    channels[i] = (channels[i] & ~1) | int(bits[bit_idx])
                    bit_idx += 1
            new_pixels.append(tuple(channels))
        else:
            if bit_idx < len(bits):
                if mode == "R":
                    r = (r & ~1) | int(bits[bit_idx])
                elif mode == "G":
                    g = (g & ~1) | int(bits[bit_idx])
                else:
                    b = (b & ~1) | int(bits[bit_idx])
                bit_idx += 1
            new_pixels.append((r, g, b))

    img.putdata(new_pixels)
    img.save(output_path)

    return {
        "mode": mode,
        "bits_written": bit_idx,
        "capacity_bits": capacity,
        "output_path": output_path,
    }
