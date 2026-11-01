export function presentationMarkup() {
  return `<header class="page-head"><div class="kicker">PRESENTACIÓN · GRUPO 04</div><h1>Ciberdelito, ciberdefensa y privacidad.</h1><p>Explorá el marco jurídico uruguayo, la cooperación internacional y la protección de datos a través de la presentación completa.</p></header>
  <section id="presentation-viewer" class="presentation-viewer" tabindex="0" aria-label="Visor de la presentación">
    <div class="presentation-toolbar"><span class="presentation-count" role="status" aria-live="polite">Cargando presentación…</span><div class="presentation-actions"><button type="button" data-slides-fullscreen>Pantalla completa ⛶</button><a href="presentacion/presentacion.pdf" target="_blank" rel="noopener noreferrer">Abrir PDF ↗</a><a href="presentacion/presentacion.pdf" download="Presentacion_Grupo_4.pdf">Descargar PDF ↓</a></div></div>
    <div class="presentation-image"><img width="1600" height="900" alt="La presentación se está cargando" hidden><p class="presentation-loading">Cargando diapositivas…</p></div>
    <div class="presentation-controls"><button type="button" data-slide-prev disabled aria-label="Diapositiva anterior">← Anterior</button><div class="slide-picker"><label class="sr-only" for="slide-number">Elegir diapositiva</label><select id="slide-number" disabled><option>Cargando…</option></select></div><button type="button" data-slide-next disabled aria-label="Diapositiva siguiente">Siguiente →</button></div>
  </section>
  <p class="presentation-help">Elegí una diapositiva o usá las flechas del teclado con el visor seleccionado. El PDF original está disponible para abrir y descargar.</p>
  <details class="presentation-transcript"><summary>Leer el texto de la diapositiva</summary><pre></pre></details>`;
}

export async function setupPresentation() {
  const viewer = document.querySelector('#presentation-viewer');
  if (!viewer) return;
  const count = viewer.querySelector('.presentation-count');
  const image = viewer.querySelector('img');
  const loading = viewer.querySelector('.presentation-loading');
  const picker = viewer.querySelector('select');
  const previous = viewer.querySelector('[data-slide-prev]');
  const next = viewer.querySelector('[data-slide-next]');
  const fullscreen = viewer.querySelector('[data-slides-fullscreen]');
  const transcript = document.querySelector('.presentation-transcript pre');
  let slides;
  try {
    const response = await fetch('presentacion/slides.json');
    if (!response.ok) throw new Error('No se pudo cargar la presentación');
    slides = await response.json();
    if (!Array.isArray(slides) || !slides.length) throw new Error('Presentación vacía');
  } catch {
    if (!viewer.isConnected) return;
    count.textContent = 'Presentación disponible en PDF';
    loading.textContent = 'No se pudo cargar el visor. Podés abrir o descargar el PDF con los enlaces de arriba.';
    fullscreen.hidden = true;
    return;
  }
  if (!viewer.isConnected) return;
  let current = 0;
  picker.replaceChildren(...slides.map((slide,index) => new Option(`${index + 1}. ${slide.title}`,String(index))));
  picker.disabled = false;
  image.onload = () => { loading.hidden = true; image.hidden = false; };
  image.onerror = () => { loading.textContent = 'No se pudo mostrar esta diapositiva. Podés verla en el PDF original.'; loading.hidden = false; image.hidden = true; };
  function show(index) {
    current = Math.max(0, Math.min(slides.length - 1,index));
    const slide = slides[current];
    count.textContent = `Diapositiva ${current + 1} de ${slides.length}`;
    picker.value = String(current);
    image.alt = `Diapositiva ${current + 1}: ${slide.title}`;
    image.src = slide.image;
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    transcript.textContent = slide.text;
    if (slides[current + 1]) { const preload = new Image(); preload.src = slides[current + 1].image; }
  }
  previous.addEventListener('click',() => show(current - 1));
  next.addEventListener('click',() => show(current + 1));
  picker.addEventListener('change',() => show(Number(picker.value)));
  if (!viewer.requestFullscreen) fullscreen.hidden = true;
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === viewer) await document.exitFullscreen();
      else await viewer.requestFullscreen();
    } catch { count.textContent = 'Pantalla completa no disponible. Podés abrir el PDF en otra pestaña.'; }
  }
  fullscreen.addEventListener('click',toggleFullscreen);
  viewer.addEventListener('keydown',event => {
    if (event.target.closest('select,a,button,input') || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); show(current + 1); }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); show(current - 1); }
    if (event.key === 'Home') { event.preventDefault(); show(0); }
    if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
    if (event.key.toLowerCase() === 'f' && viewer.requestFullscreen) { event.preventDefault(); toggleFullscreen(); }
  });
  show(0);
}
