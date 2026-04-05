def validate_answer(user_answer, correct_answer):
    return user_answer.strip().lower() == correct_answer.strip().lower()


def calculate_score(correct, total_time):
    return (correct * 100) - int(total_time)
