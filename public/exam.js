import { gradeAttempt, gradeQuestion, selectQuestions } from './exam-core.js?v=20261121-21';

const poolNames = { base: 'Banco base', profesor: 'Simulacro del profesor', refuerzo: 'Refuerzo del tema 1' };

export function examMarkup() {
  return `<header class="page-head"><div class="kicker">PRÁCTICA · GESTIÓN SEGURIDAD DE LA INFORMACIÓN</div>
    <h1>Simulación de examen.</h1>
    <p>Practicá con preguntas de los seis temas. Comprobá cada respuesta y leé su explicación antes de continuar.</p>
  </header><section id="exam-root" aria-label="Simulación de examen"><p role="status">Cargando banco de preguntas…</p></section>`;
}

export async function setupExam(esc) {
  const root = document.querySelector('#exam-root');
  let bank;
  try {
    ({ examBank: bank } = await import('./exam-bank.js?v=20261121-21'));
  } catch {
    if (root.isConnected) root.innerHTML = '<p role="alert">No se pudo cargar el banco. Recargá la página para volver a intentarlo.</p>';
    return;
  }
  if (!root.isConnected) return;

  let settings = { topic: 'all', pool: 'all', count: 'all' };
  let attempt = [];
  let answers = {};
  let checkedQuestions = new Set();
  let current = 0;
  let stage = 'config';
  const topicName = question => bank.topics.find(topic => topic.id === question.topic).title;
  const questionName = question => `${poolNames[question.pool]} · ${question.pool === 'profesor' ? 'P' : ''}${String(question.number).padStart(2, '0')}`;
  const sourceLinks = question => question.sources.map(id => {
    const [label, url] = bank.sources[id];
    return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗<span class="sr-only"> (nueva pestaña)</span></a>`;
  }).join('');

  function explanationMarkup(question) {
    return `<div class="exam-explanation"><strong>Por qué</strong><p>${esc(question.explanation)}</p>${question.reviewNote ? `<p class="exam-review-note">${esc(question.reviewNote)}</p>` : ''}<div class="exam-references">${sourceLinks(question)}</div></div>`;
  }

  function renderFeedback() {
    const question = attempt[current];
    const feedback = root.querySelector('#exam-feedback');
    const selected = answers[question.id] || [];
    root.querySelector('[data-exam-action="check"]').disabled = selected.length === 0;
    if (!checkedQuestions.has(question.id)) {
      feedback.innerHTML = '';
      return;
    }
    const correct = gradeQuestion(question, selected) === 'correct';
    feedback.innerHTML = `<section class="exam-feedback-panel"><h3 tabindex="-1"><span class="exam-status ${correct ? 'correct' : 'incorrect'}">${correct ? 'Respuesta correcta' : 'Respuesta incorrecta'}</span></h3>
      <p class="exam-answer-summary"><strong>Tu respuesta:</strong> ${selected.join(', ')}<br><strong>Respuesta correcta:</strong> ${question.correct.join(', ')}</p>
      <ul class="exam-feedback-answers">${question.options.filter(option => question.correct.includes(option.id)).map(option => `<li><strong>${option.id}.</strong> ${esc(option.text)}</li>`).join('')}</ul>
      ${explanationMarkup(question)}</section>`;
  }

  function focusHeading() {
    const heading = root.querySelector('[data-exam-heading]');
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function availableCount() {
    return bank.questions.filter(question =>
      (settings.topic === 'all' || String(question.topic) === settings.topic) &&
      (settings.pool === 'all' || question.pool === settings.pool)).length;
  }

  function updateAvailability() {
    const available = availableCount();
    const counts = ['all', ...['10', '20', '30'].filter(value => Number(value) < available)];
    if (!counts.includes(settings.count)) settings.count = 'all';
    root.querySelector('#exam-count').innerHTML = counts.map(value => `<option value="${value}"${settings.count === value ? ' selected' : ''}>${value === 'all' ? 'Todas las disponibles' : value}</option>`).join('');
    const requested = settings.count === 'all' ? available : Number(settings.count);
    root.querySelector('#exam-available').textContent = `${available} ${available === 1 ? 'pregunta disponible' : 'preguntas disponibles'}. El intento incluirá ${requested}.`;
    root.querySelector('[type=submit]').disabled = available === 0;
  }

  function renderConfig() {
    stage = 'config';
    root.innerHTML = `<div class="exam-overview"><strong>111 preguntas</strong><span>90 del banco base · 6 del profesor · 15 de refuerzo</span></div>
      <form id="exam-config" class="exam-config">
        <div><label for="exam-topic">Tema</label><select id="exam-topic" name="topic"><option value="all">Todos los temas</option>${bank.topics.map(topic => `<option value="${topic.id}"${settings.topic === String(topic.id) ? ' selected' : ''}>${topic.id}. ${esc(topic.title)}</option>`).join('')}</select></div>
        <div><label for="exam-pool">Preguntas</label><select id="exam-pool" name="pool"><option value="all">Todo el banco</option>${Object.entries(poolNames).map(([value, label]) => `<option value="${value}"${settings.pool === value ? ' selected' : ''}>${label}</option>`).join('')}</select></div>
        <div><label for="exam-count">Cantidad</label><select id="exam-count" name="count"></select></div>
        <p id="exam-available" role="status" aria-live="polite"></p>
        <button class="btn" type="submit">Comenzar simulación →</button>
      </form>
      <section class="exam-rules"><h2>Cómo practicar</h2><p>Elegí tus opciones y pulsá «Comprobar respuesta» para ver la corrección, una breve explicación y sus fuentes. Podés cambiar tu selección y volver a comprobarla antes de continuar.</p><p>Cada pregunta vale un punto. En selección múltiple debés marcar todas las opciones correctas y ninguna adicional. El resumen final usa tu última selección; las preguntas sin responder valen cero y los errores no descuentan puntos.</p><p>Podés ir y volver entre preguntas. Si elegís menos preguntas de las disponibles, se seleccionan al azar.</p></section>
      <details class="exam-audit"><summary>Revisión del banco y ajustes realizados</summary><p>Revisión conceptual con fuentes públicas oficiales y de los autores de los marcos. Fecha: ${esc(bank.reviewed)}. Las referencias históricas y las ediciones estudiadas se identifican en las explicaciones.</p><ul>${bank.reviewNotes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></details>`;
    updateAvailability();
  }

  function updateProgress() {
    const answered = attempt.filter(question => answers[question.id]?.length).length;
    root.querySelector('#exam-progress').textContent = `${answered} de ${attempt.length} respondidas`;
    root.querySelectorAll('[data-exam-index]').forEach(button => {
      const index = Number(button.dataset.examIndex);
      const done = Boolean(answers[attempt[index].id]?.length);
      button.classList.toggle('is-answered', done);
      button.setAttribute('aria-label', `Pregunta ${index + 1}${done ? ', respondida' : ', sin responder'}`);
    });
  }

  function renderQuestion() {
    const question = attempt[current];
    const selected = answers[question.id] || [];
    root.innerHTML = `<div class="exam-toolbar"><span id="exam-progress" role="status" aria-live="polite"></span><strong>Pregunta ${current + 1} de ${attempt.length}</strong></div>
      <article class="exam-question"><div class="kicker">TEMA ${question.topic} · ${esc(topicName(question))}</div>
        <p class="exam-origin">${esc(questionName(question))}</p>
        <fieldset><legend data-exam-heading tabindex="-1">${esc(question.prompt)}</legend>
          <p id="exam-selection" class="exam-selection">${question.multiple ? 'Selección múltiple: marcá todas las opciones correctas.' : 'Selección única: elegí una opción.'}</p>
          <div class="exam-options" aria-describedby="exam-selection">${question.options.map(option => `<label class="exam-option"><input type="${question.multiple ? 'checkbox' : 'radio'}" name="answer-${question.id}" value="${option.id}" data-exam-answer${selected.includes(option.id) ? ' checked' : ''}><span><strong>${option.id}.</strong> ${esc(option.text)}</span></label>`).join('')}</div>
        </fieldset>
        <div class="exam-check"><button class="btn" type="button" data-exam-action="check" aria-controls="exam-feedback">Comprobar respuesta</button><p>Elegí tus opciones para comprobarlas. Podés modificarlas y volver a intentar.</p></div>
        <div id="exam-feedback" aria-live="polite"></div>
      </article>
      <div class="exam-step-actions"><button class="btn btn-light" data-exam-action="previous"${current === 0 ? ' disabled' : ''}>← Anterior</button><button class="btn btn-light" data-exam-action="next"${current === attempt.length - 1 ? ' disabled' : ''}>Siguiente →</button></div>
      <nav class="exam-question-nav" aria-label="Preguntas del intento">${attempt.map((item, index) => `<button type="button" data-exam-index="${index}"${index === current ? ' aria-current="step"' : ''}>${index + 1}</button>`).join('')}</nav>
      <div class="exam-finish"><p>Al finalizar se corrigen también las preguntas que hayas dejado sin responder.</p><button class="btn" data-exam-action="finish">Finalizar y corregir</button></div>`;
    updateProgress();
    renderFeedback();
  }

  function renderResults() {
    stage = 'results';
    const result = gradeAttempt(attempt, answers);
    const statusNames = { correct: 'Correcta', incorrect: 'Incorrecta', unanswered: 'Sin responder' };
    root.innerHTML = `<section class="exam-summary"><div class="kicker">RESULTADO DE LA PRÁCTICA · ÚLTIMAS RESPUESTAS</div><h2 data-exam-heading tabindex="-1">${result.correct} de ${result.total} puntos · ${result.percent}%</h2>
      <p>${result.correct} correctas · ${result.incorrect} incorrectas · ${result.unanswered} sin responder</p>
      <button class="btn" data-exam-action="new">Configurar otro intento</button></section>
      <h2 class="exam-review-heading">Revisión de las respuestas</h2>
      ${result.results.map((item, index) => `<article class="exam-review"><div class="exam-review-meta"><span>Pregunta ${index + 1} · Tema ${item.question.topic} · ${esc(questionName(item.question))}</span><strong class="exam-status ${item.status}">${statusNames[item.status]}</strong></div>
        <h3>${esc(item.question.prompt)}</h3>
        <p class="exam-answer-summary"><strong>Tu respuesta:</strong> ${item.selected.length ? item.selected.join(', ') : 'Sin responder'}<br><strong>Respuesta correcta:</strong> ${item.question.correct.join(', ')}</p>
        <ul class="exam-reviewed-options">${item.question.options.map(option => `<li class="${item.question.correct.includes(option.id) ? 'is-correct' : ''}"><strong>${option.id}.</strong> ${esc(option.text)}${item.question.correct.includes(option.id) ? ' <span class="exam-option-tag">✓ Correcta</span>' : ''}${item.selected.includes(option.id) ? ' <span class="exam-option-tag">Tu elección</span>' : ''}</li>`).join('')}</ul>
        ${explanationMarkup(item.question)}
      </article>`).join('')}`;
    focusHeading();
  }

  root.addEventListener('submit', event => {
    event.preventDefault();
    if (stage !== 'config') return;
    attempt = selectQuestions(bank.questions, settings);
    if (!attempt.length) return;
    answers = {};
    checkedQuestions = new Set();
    current = 0;
    stage = 'attempt';
    renderQuestion();
    focusHeading();
  });

  root.addEventListener('change', event => {
    const input = event.target;
    if (stage === 'config' && input.matches('select')) {
      settings[input.name] = input.value;
      updateAvailability();
    }
    if (stage === 'attempt' && input.matches('[data-exam-answer]')) {
      const question = attempt[current];
      const selected = new Set(answers[question.id] || []);
      if (!question.multiple) selected.clear();
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      answers[question.id] = [...selected].sort();
      checkedQuestions.delete(question.id);
      updateProgress();
      renderFeedback();
    }
  });

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (stage === 'results' && button.dataset.examAction === 'new') {
      renderConfig();
      root.querySelector('select').focus();
    } else if (stage === 'attempt') {
      if (button.dataset.examAction === 'check') {
        checkedQuestions.add(attempt[current].id);
        renderFeedback();
        const heading = root.querySelector('#exam-feedback h3');
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'center', behavior: 'instant' });
      } else if (button.dataset.examAction === 'finish') {
        renderResults();
      } else if (button.hasAttribute('data-exam-index') || ['previous', 'next'].includes(button.dataset.examAction)) {
        current = button.hasAttribute('data-exam-index') ? Number(button.dataset.examIndex) : current + (button.dataset.examAction === 'next' ? 1 : -1);
        renderQuestion();
        focusHeading();
      }
    }
  });

  renderConfig();
}
