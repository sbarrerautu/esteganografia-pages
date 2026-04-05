ZERO = "\u200B"
ONE = "\u200C"


def encode_message(secret, cover):
    secret_message = (secret or "").strip()
    cover_text = cover or ""

    # Do not allow manual invisible characters in cover text.
    cover_text = cover_text.replace(ZERO, "").replace(ONE, "")

    # Add null terminator to stop decoding cleanly even if extra hidden chars
    # are appended by copy/paste intermediaries.
    binary = "".join(format(ord(c), "08b") for c in (secret_message + "\x00"))

    encoded = ""
    for b in binary:
        if b == "0":
            encoded += ZERO
        else:
            encoded += ONE

    return cover_text + encoded


def decode_message(text):
    details = decode_with_details(text)
    # Only trust messages with a proper terminator to avoid garbage output.
    return details["decoded"] if details["terminated"] else ""


def validate_encoded_text(text):
    invisible_count = 0

    for c in text or "":
        if c == ZERO or c == ONE:
            invisible_count += 1

    if invisible_count < 8:
        return "INVALID: not enough data"

    if invisible_count % 8 != 0:
        return "INVALID: incomplete bytes"

    return "VALID"


def debug_zero_width(text):
    result = []

    for c in text or "":
        if c == ZERO:
            result.append("0")
        elif c == ONE:
            result.append("1")

    return "".join(result)


def has_invisible(text):
    for c in text or "":
        if c == ZERO or c == ONE:
            return True
    return False


def debug_codepoints(text):
    return [ord(c) for c in (text or "")]


def decode_with_details(text):
    binary = debug_zero_width(text)
    chunks = [binary[i : i + 8] for i in range(0, len(binary), 8)]
    steps = []
    decoded = ""
    terminated = False
    for chunk in chunks:
        if len(chunk) != 8:
            break
        try:
            value = int(chunk, 2)
        except Exception:
            continue
        try:
            char = chr(value)
        except Exception:
            continue
        if char == "\x00":
            steps.append({"byte": chunk, "ascii_code": value, "ascii_char": "\\x00"})
            terminated = True
            break
        decoded += char
        steps.append({"byte": chunk, "ascii_code": value, "ascii_char": char})

    return {"decoded": decoded, "binary": binary, "steps": steps, "terminated": terminated}
