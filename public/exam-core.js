export function gradeQuestion(question, selected = []) {
  const answers = new Set(selected);
  if (answers.size === 0) return 'unanswered';
  const exact = answers.size === question.correct.length && question.correct.every(id => answers.has(id));
  return exact ? 'correct' : 'incorrect';
}

export function gradeAttempt(questions, answers) {
  const results = questions.map(question => ({
    question,
    selected: [...(answers[question.id] || [])],
    status: gradeQuestion(question, answers[question.id])
  }));
  const correct = results.filter(result => result.status === 'correct').length;
  const unanswered = results.filter(result => result.status === 'unanswered').length;
  return { results, correct, unanswered, incorrect: questions.length - correct - unanswered,
    total: questions.length, percent: questions.length ? Math.round(correct * 100 / questions.length) : 0 };
}

export function selectQuestions(questions, settings, random = Math.random) {
  const pool = questions.filter(question =>
    (settings.topic === 'all' || String(question.topic) === settings.topic) &&
    (settings.pool === 'all' || question.pool === settings.pool));
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  const count = settings.count === 'all' ? pool.length : Number(settings.count);
  return pool.slice(0, Math.min(pool.length, count));
}
