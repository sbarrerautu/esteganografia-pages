def normalize(value):
    return (value or "").strip().lower()


def ask_question(question, number):
    print(f"\nPregunta {number}/10")
    print(question["question"])

    if question["type"] == "mcq":
        print(f"A) {question['options']['A']}")
        print(f"B) {question['options']['B']}")
        print(f"C) {question['options']['C']}")
        print(f"D) {question['options']['D']}")
        return input("Tu respuesta (A/B/C/D): ")

    return input("Tu respuesta: ")


def check_answer(user_answer, question):
    given = normalize(user_answer)

    if question["type"] == "mcq":
        expected = normalize(question["answer"])
        return given == expected

    expected_values = [normalize(question["answer"])]
    for alias in question.get("aliases", []):
        expected_values.append(normalize(alias))
    return given in expected_values


def main():
    questions = [
        {
            "question": "¿Qué es la esteganografía?",
            "type": "mcq",
            "options": {
                "A": "Ocultar la existencia de un mensaje dentro de otro medio",
                "B": "Cifrar contraseñas con hash",
                "C": "Comprimir archivos sin pérdida",
                "D": "Bloquear puertos de red",
            },
            "answer": "A",
            "explanation": "La esteganografía busca que el mensaje pase desapercibido.",
        },
        {
            "question": "¿Cuál es la diferencia principal entre esteganografía y criptografía?",
            "type": "mcq",
            "options": {
                "A": "No hay diferencia",
                "B": "La criptografía oculta el contenido; la esteganografía oculta la existencia",
                "C": "La esteganografía solo funciona en texto",
                "D": "La criptografía solo funciona en imágenes",
            },
            "answer": "B",
            "explanation": "Criptografía protege el contenido; esteganografía esconde que existe un mensaje.",
        },
        {
            "question": "¿Qué significa LSB?",
            "type": "mcq",
            "options": {
                "A": "Large Signal Buffer",
                "B": "Least Significant Bit",
                "C": "Local Security Block",
                "D": "Last Secure Byte",
            },
            "answer": "B",
            "explanation": "LSB es el bit menos significativo de un byte.",
        },
        {
            "question": "Formato recomendado para preservar mejor datos ocultos en imagen:",
            "type": "text",
            "answer": "png",
            "explanation": "PNG evita compresión con pérdida que puede destruir bits ocultos.",
        },
        {
            "question": "Sistema usado para convertir bytes a caracteres de texto:",
            "type": "text",
            "answer": "ascii",
            "explanation": "ASCII asigna códigos numéricos a caracteres.",
        },
        {
            "question": "Canal RGB generalmente menos perceptible para cambios sutiles:",
            "type": "text",
            "answer": "azul",
            "aliases": ["blue", "b"],
            "explanation": "En muchos escenarios el ojo humano es menos sensible a variaciones en azul.",
        },
        {
            "question": "Técnica de ocultación en texto con Unicode no visible:",
            "type": "mcq",
            "options": {
                "A": "ROT13",
                "B": "Zero-width characters",
                "C": "Base64",
                "D": "CRC32",
            },
            "answer": "B",
            "explanation": "Caracteres zero-width permiten ocultar bits sin mostrar símbolos visibles.",
        },
        {
            "question": "En LSB, ¿qué bit se modifica típicamente?",
            "type": "text",
            "answer": "lsb",
            "aliases": ["ultimo", "último", "last"],
            "explanation": "Se altera el bit menos significativo para minimizar cambios visuales.",
        },
        {
            "question": "Si el byte es 10110101, ¿cuál es su LSB?",
            "type": "text",
            "answer": "1",
            "explanation": "El LSB es el último bit del byte.",
        },
        {
            "question": "Uso común de esteganografía en ciberseguridad:",
            "type": "mcq",
            "options": {
                "A": "Ocultar carga útil en archivos para evadir análisis básico",
                "B": "Aumentar velocidad de CPU",
                "C": "Desfragmentar discos",
                "D": "Actualizar firmware automáticamente",
            },
            "answer": "A",
            "explanation": "Puede usarse tanto en escenarios legítimos como maliciosos para ocultar datos.",
        },
    ]

    score = 0
    total = len(questions)

    print("=== Steg Trivia: Conocimientos Generales ===")
    for i, question in enumerate(questions, start=1):
        user_answer = ask_question(question, i)
        if check_answer(user_answer, question):
            print("Correcto ✅")
            score += 1
        else:
            print("Incorrecto ❌")
            print("Respuesta correcta:", question["answer"])
            print("Explicacion:", question["explanation"])

    percentage = round((score / total) * 100, 2)
    print("\n=== Resultado Final ===")
    print(f"Total correctas: {score}/{total}")
    print(f"Porcentaje: {percentage}%")


if __name__ == "__main__":
    main()
