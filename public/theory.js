import { theoryGroups } from './theory-data.js?v=20261110-13';
import { institutionGroups } from './institutions-data.js?v=20261110-15';

const quantity = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function theoryNavigation(institutions = false) {
  return `<nav class="theory-navigation" aria-label="Apartados de conceptos y teoría">
    <a href="#/teoria"${institutions ? '' : ' aria-current="page"'}>Definiciones y conceptos</a>
    <a href="#/teoria/instituciones"${institutions ? ' aria-current="page"' : ''}>Instituciones y funciones</a>
  </nav>`;
}

export function institutionsMarkup(esc) {
  return `<header class="page-head">
    <div class="kicker">CONCEPTOS Y TEORÍA · INSTITUCIONES DEL URUGUAY</div>
    <h1>Quién hace qué.</h1>
    <p>Diez instituciones y órganos para comprender el gobierno digital, la investigación penal y la defensa nacional.</p>
  </header>
  ${theoryNavigation(true)}
  <div class="institution-groups">${institutionGroups.map((group, index) => `
    <section class="institution-group">
      <header class="theory-heading"><span class="number">${String(index + 1).padStart(2, '0')}</span><h2>${esc(group.title)}</h2></header>
      <div class="institution-grid">${group.institutions.map(institution => `
        <article class="institution-card">
          <h3>${esc(institution.name)}</h3>
          <p class="institution-full-name">${esc(institution.fullName)}</p>
          <p>${esc(institution.description)}</p>
          <a href="${esc(institution.url)}" target="_blank" rel="noopener noreferrer">${esc(institution.source)} ↗<span class="sr-only"> (nueva pestaña)</span></a>
        </article>`).join('')}</div>
    </section>`).join('')}
  </div>`;
}

export function theoryMarkup(esc) {
  const total = theoryGroups.reduce((sum, group) => sum + group.terms.length, 0);
  return `
    <header class="page-head">
      <div class="kicker">CONCEPTOS Y TEORÍA · GRUPO 04</div>
      <h1>Las palabras detrás de los casos.</h1>
      <p>Definiciones para comprender los ataques, la investigación digital, la defensa y la protección de datos.</p>
    </header>
    ${theoryNavigation()}
    <div class="theory-intro">
      <p><strong>${total} conceptos en ${theoryGroups.length} temas.</strong> Seguí el recorrido completo o buscá una palabra para repasar su significado.</p>
      <p>Material de estudio aportado por el grupo. Las definiciones son generales; los requisitos de cada delito, derecho u obligación se consultan en la norma aplicable.</p>
      <a class="text-link" href="#/normas">Consultar la biblioteca de normas ↗</a>
    </div>
    <section class="theory-tools" aria-label="Buscar y filtrar conceptos">
      <div><label for="theory-search">Buscar un concepto</label><input id="theory-search" type="search" placeholder="Ej.: phishing, evidencia, consentimiento…" autocomplete="off"></div>
      <div><label for="theory-topic">Elegir un tema</label><select id="theory-topic"><option value="">Todos los temas</option>${theoryGroups.map((group, index) => `<option value="${index}">${esc(group.title)}</option>`).join('')}</select></div>
      <button class="btn" type="button" id="theory-reset">Ver todos</button>
    </section>
    <p id="theory-results" class="theory-results" role="status" aria-live="polite">${total} conceptos · ${theoryGroups.length} temas</p>
    <div class="theory-sections">
      ${theoryGroups.map((group, index) => `
        <section class="theory-section" data-theory-group="${index}">
          <header class="theory-heading"><span class="number">${String(index + 1).padStart(2, '0')}</span><h2>${esc(group.title)}</h2><span class="theory-topic-count">${group.terms.length} conceptos</span></header>
          <dl class="theory-definitions">${group.terms.map(item => `<div class="theory-card"><dt>${esc(item.term)}</dt><dd>${esc(item.definition)}</dd></div>`).join('')}</dl>
        </section>`).join('')}
    </div>
    <p class="theory-empty" hidden>Sin resultados. Probá con otra palabra o elegí «Todos los temas».</p>`;
}

export function setupTheory() {
  const search = document.querySelector('#theory-search');
  const topic = document.querySelector('#theory-topic');
  const results = document.querySelector('#theory-results');
  const empty = document.querySelector('.theory-empty');
  const groups = [...document.querySelectorAll('[data-theory-group]')];
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const cards = groups.map(group => [...group.querySelectorAll('.theory-card')].map(card => ({
    element: card,
    text: normalize(card.textContent)
  })));

  function filter() {
    const query = normalize(search.value);
    let visibleTerms = 0;
    let visibleGroups = 0;
    groups.forEach((group, index) => {
      let count = 0;
      cards[index].forEach(card => {
        const matches = (topic.value === '' || topic.value === String(index)) && card.text.includes(query);
        card.element.hidden = !matches;
        if (matches) count += 1;
      });
      group.hidden = count === 0;
      group.querySelector('.theory-topic-count').textContent = quantity(count, 'concepto');
      visibleTerms += count;
      if (count) visibleGroups += 1;
    });
    results.textContent = `${quantity(visibleTerms, 'concepto')} · ${quantity(visibleGroups, 'tema')}`;
    empty.hidden = visibleTerms !== 0;
  }

  search.addEventListener('input', filter);
  topic.addEventListener('change', filter);
  document.querySelector('#theory-reset').addEventListener('click', () => {
    search.value = '';
    topic.value = '';
    filter();
    search.focus();
  });
}
