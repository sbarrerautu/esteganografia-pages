import assert from 'node:assert/strict';
import { examBank } from './public/exam-bank.js';
import { gradeQuestion, gradeAttempt, selectQuestions } from './public/exam-core.js';

const questions = examBank.questions;
assert.equal(questions.length, 111);
assert.equal(new Set(questions.map(question => question.id)).size, 111);
assert.equal(questions.filter(question => question.pool === 'base').length, 90);
assert.equal(questions.filter(question => question.pool === 'profesor').length, 6);
assert.equal(questions.filter(question => question.pool === 'refuerzo').length, 15);

for (const question of questions) {
  assert.deepEqual(question.options.map(option => option.id), ['A', 'B', 'C', 'D', 'E']);
  assert.ok(question.prompt && question.explanation && question.sources.length, question.id);
  assert.equal(question.multiple, question.correct.length > 1, question.id);
  assert.equal(new Set(question.correct).size, question.correct.length, question.id);
  assert.ok(question.correct.every(letter => 'ABCDE'.includes(letter)), question.id);
  assert.ok(examBank.topics.some(topic => topic.id === question.topic), question.id);
  for (const source of question.sources) {
    assert.ok(examBank.sources[source], `${question.id}: fuente ausente`);
    assert.equal(new URL(examBank.sources[source][1]).protocol, 'https:');
  }

  // Las 32 combinaciones posibles de A–E, incluida la respuesta en blanco.
  const correctMask = question.correct.reduce((mask, letter) => mask | (1 << (letter.charCodeAt(0) - 65)), 0);
  for (let mask = 0; mask < 32; mask += 1) {
    const selected = [...'ABCDE'].filter((letter, index) => mask & (1 << index));
    const expected = mask === 0 ? 'unanswered' : mask === correctMask ? 'correct' : 'incorrect';
    assert.equal(gradeQuestion(question, selected), expected, `${question.id}: ${selected}`);
    assert.equal(gradeQuestion(question, [...selected].reverse()), expected, `${question.id}: orden de selección`);
  }
}

const multiple = questions.find(question => question.id === 't1-02');
const single = questions.find(question => question.id === 't4-p04');
assert.deepEqual(questions.find(question => question.id === 't3-14').correct, ['B', 'C']);
assert.deepEqual(multiple.correct, ['A', 'C']);
assert.deepEqual(single.correct, ['C']);
assert.equal(single.multiple, false);
const result = gradeAttempt([multiple, single, questions[0]], { [multiple.id]: ['C', 'A'], [single.id]: ['C', 'A'] });
assert.equal(result.correct, 1);
assert.equal(result.incorrect, 1);
assert.equal(result.unanswered, 1);
assert.equal(result.percent, 33);
assert.equal(gradeAttempt(questions, Object.fromEntries(questions.map(question => [question.id, question.correct]))).percent, 100);
assert.equal(gradeAttempt(questions, {}).unanswered, 111);

for (const topic of ['all', '1', '2', '3', '4', '5', '6']) {
  for (const pool of ['all', 'base', 'profesor', 'refuerzo']) {
    const eligible = questions.filter(question => (topic === 'all' || String(question.topic) === topic) && (pool === 'all' || question.pool === pool));
    for (const count of ['10', '20', '30', 'all']) {
      const selected = selectQuestions(questions, { topic, pool, count }, () => 0.5);
      assert.equal(selected.length, count === 'all' ? eligible.length : Math.min(Number(count), eligible.length));
      assert.equal(new Set(selected.map(question => question.id)).size, selected.length);
      assert.ok(selected.every(question => eligible.includes(question)));
    }
  }
}
console.log('Examen verificado: 111 preguntas, 3.552 combinaciones de respuestas y selección por tema, origen y cantidad.');
