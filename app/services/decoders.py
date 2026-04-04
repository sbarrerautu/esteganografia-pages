import re
from PIL import Image


def decode_acrostic(text):
    lines = text.strip().split("\n")
    return "".join(line[0] for line in lines if line)


def decode_spaces(text):
    spaces = re.findall(r" +", text)
    result = ""
    for s in spaces:
        n = len(s)
        if 1 <= n <= 26:
            result += chr(64 + n)
    return result


def decode_zero_width(text):
    binary = ""

    for char in text:
        if char == "\u200B":
            binary += "0"
        elif char == "\u200C":
            binary += "1"

    chars = [binary[i : i + 8] for i in range(0, len(binary), 8)]

    result = ""
    for c in chars:
        if len(c) == 8:
            result += chr(int(c, 2))

    return result


def decode_lsb(image_path):
    img = Image.open(image_path)
    binary = ""

    for pixel in img.getdata():
        for channel in pixel[:3]:
            binary += str(channel & 1)

    chars = [binary[i : i + 8] for i in range(0, len(binary), 8)]

    message = ""
    for c in chars:
        if len(c) == 8:
            char = chr(int(c, 2))
            if char == "\x00":
                break
            message += char

    return message


def decode_lsb_red(image_path):
    img = Image.open(image_path)
    binary = ""

    for pixel in img.getdata():
        red = pixel[0]
        binary += str(red & 1)

    chars = [binary[i : i + 8] for i in range(0, len(binary), 8)]

    message = ""
    for c in chars:
        if len(c) == 8:
            char = chr(int(c, 2))
            if char == "\x00":
                break
            message += char

    return message
