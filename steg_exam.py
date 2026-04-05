def normalize_answer(value):
    return (value or "").strip().lower()


def validate_answer(user_answer, question):
    expected = normalize_answer(question["answer"])
    given = normalize_answer(user_answer)
    return given == expected


def ask_question(question, index):
    print(f"\n{index}. {question['question']}")
    if question["type"] == "mcq":
        for option in question["options"]:
            print(option)
        user_answer = input("Tu respuesta (A/B/C/D): ")
    else:
        user_answer = input("Tu respuesta: ")
    return user_answer


def performance_label(percentage):
    if percentage >= 90:
        return "Excelente"
    if percentage >= 70:
        return "Bueno"
    return "Necesita mejorar"


def run_exam():
    questions = [
        {
            "question": "¿Cuál es la diferencia principal entre esteganografía y criptografía?",
            "type": "mcq",
            "options": [
                "A) La esteganografía oculta la existencia del mensaje; la criptografía su contenido.",
                "B) La criptografía oculta la existencia y la esteganografía comprime datos.",
                "C) Son la misma técnica.",
                "D) Ninguna de las anteriores.",
            ],
            "answer": "a",
            "explanation": "Esteganografía esconde que existe mensaje. Criptografía cifra el contenido.",
        },
        {
            "question": "¿Qué significa LSB?",
            "type": "text",
            "answer": "least significant bit",
            "explanation": "LSB es el bit menos significativo de un byte.",
        },
        {
            "question": "¿Cuántos canales tiene un píxel RGB?",
            "type": "mcq",
            "options": ["A) 1", "B) 2", "C) 3", "D) 4"],
            "answer": "c",
            "explanation": "RGB tiene 3 canales: rojo, verde y azul.",
        },
        {
            "question": "¿Qué canal se usa en el nivel avanzado de canal único?",
            "type": "text",
            "answer": "rojo",
            "explanation": "En el nivel avanzado se analiza solo el canal rojo.",
        },
        {
            "question": "¿Por qué PNG suele ser mejor que JPG para LSB?",
            "type": "mcq",
            "options": [
                "A) Porque PNG tiene más colores",
                "B) Porque JPG es sin pérdida",
                "C) Porque PNG evita compresión con pérdida que altera bits",
                "D) Porque PNG solo usa canal rojo",
            ],
            "answer": "c",
            "explanation": "La compresión con pérdida de JPG puede destruir datos ocultos en LSB.",
        },
        {
            "question": "¿Qué técnica puede ocultar mensajes con caracteres invisibles Unicode?",
            "type": "text",
            "answer": "zero width",
            "explanation": "Caracteres de ancho cero pueden mapear bits y esconder texto.",
        },
        {
            "question": "¿Qué es ASCII?",
            "type": "mcq",
            "options": [
                "A) Un formato de imagen",
                "B) Una codificación de caracteres",
                "C) Un algoritmo de cifrado",
                "D) Un canal RGB",
            ],
            "answer": "b",
            "explanation": "ASCII asigna valores numéricos a caracteres.",
        },
        {
            "question": "Si el valor binario termina en ...10110101, ¿cuál es el LSB?",
            "type": "mcq",
            "options": ["A) 0", "B) 1", "C) 5", "D) No aplica"],
            "answer": "b",
            "explanation": "El LSB es el último bit del byte; aquí es 1.",
        },
        {
            "question": "Al decodificar LSB, los bits se agrupan en bloques de 8 llamados:",
            "type": "text",
            "answer": "bytes",
            "explanation": "8 bits forman 1 byte y luego se convierten a texto (ASCII).",
        },
        {
            "question": "¿Qué salida sugiere que NO hay un mensaje oculto claro?",
            "type": "mcq",
            "options": [
                "A) Texto limpio con delimitador ###",
                "B) Ruido aleatorio sin patrón legible",
                "C) Frase coherente en todos los offsets",
                "D) Base64 válido con texto claro",
            ],
            "answer": "b",
            "explanation": "Cuando no hay ocultamiento real, suele aparecer ruido sin coherencia.",
        },
    ]

    score = 0
    total = len(questions)

    print("=== Examen Final de Esteganografía ===")
    for index, question in enumerate(questions, start=1):
        user_answer = ask_question(question, index)
        if validate_answer(user_answer, question):
            print("Correcto ✅")
            score += 1
        else:
            print("Incorrecto ❌")
            print("Explicacion:", question["explanation"])

    percentage = int((score / total) * 100)
    print("\n=== Resultado Final ===")
    print(f"Puntaje: {score}/{total}")
    print(f"Porcentaje: {percentage}%")
    print("Rendimiento:", performance_label(percentage))


if __name__ == "__main__":
    run_exam()
