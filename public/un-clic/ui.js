// Interfaz del reproductor: videos precargados, decisiones, fichas, subtítulos, música y teclado.
(function () {
  var S = window.STORY;
  var $ = function (sel) { return document.querySelector(sel); };
  var stage = $('#stage');
  var body = document.body;
  var params = new URLSearchParams(location.search);
  var engine = null;
  var mode = 'show';

  // ── Escala: 1 unidad = 1/1080 del alto del escenario ─────────────
  function fit() { stage.style.setProperty('--u', stage.clientHeight / 1080 + 'px'); }
  window.addEventListener('resize', fit);
  fit();

  // ── Pool de videos ───────────────────────────────────────────────
  var pool = [];
  for (var i = 0; i < 4; i++) {
    var v = document.createElement('video');
    v.playsInline = true;
    v.preload = 'auto';
    $('#videos').appendChild(v);
    pool.push(v);
  }
  var current = null;
  var clipTimer = null;
  var hasClip = function (id) { return !!(S.clips && S.clips[id]); };
  var srcOf = function (id) { return S.clips[id]; };

  function find(src) {
    for (var i = 0; i < pool.length; i++) if (pool[i].dataset.src === src) return pool[i];
    return null;
  }
  // Nunca devuelve un video protegido (el que se está mostrando o por mostrar): si no queda lugar, no precarga.
  function free(except) {
    for (var i = 0; i < pool.length; i++) if (except.indexOf(pool[i]) < 0) return pool[i];
    return null;
  }
  function load(src, keep) {
    var v = find(src);
    if (v) return v;
    v = free(keep);
    if (!v) return null;
    v.dataset.src = src;
    v.src = src;
    v.load();
    return v;
  }
  function preload(ids) {
    var keep = [current].concat(pool.filter(function (p) { return p.classList.contains('on'); }));
    ids.forEach(function (id) {
      var v = hasClip(id) && load(srcOf(id), keep);
      if (v) keep.push(v);
    });
  }
  function show(v) {
    v.classList.add('on');
    pool.forEach(function (p) {
      if (p !== v && p.classList.contains('on')) {
        setTimeout(function () { p.classList.remove('on'); p.pause(); }, 60);
      }
    });
  }

  function playClip(id, opts) {
    opts = opts || {};
    clearTimeout(clipTimer);
    $('#slate').hidden = true;
    if (!hasClip(id)) return playSlate(id, opts);
    var visible = pool.filter(function (p) { return p.classList.contains('on'); });
    var v = load(srcOf(id), [current].concat(visible)) || load(srcOf(id), [current]);
    v.loop = !!opts.loop;
    v.muted = !!opts.muted;
    v.onended = opts.loop ? null : function () { engine.clipEnded(); };
    var start = function () {
      v.currentTime = 0;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      v.onplaying = function () { show(v); v.onplaying = null; };
    };
    if (v.readyState >= 3) start();
    else v.oncanplay = function () { v.oncanplay = null; start(); };
    if (!opts.loop) current = v;
    return v;
  }

  // Sin video renderizado todavía: placa con el texto y duración estimada.
  function playSlate(id, opts) {
    var n = S.nodes[id];
    var slate = $('#slate');
    if (opts.loop) return null;
    slate.hidden = false;
    slate.innerHTML = '<div><small>' + id + ' · vista previa sin animación</small>' + n.show.join(' ') + '</div>';
    var dur = (S.durations && S.durations[id]) || 6;
    var t0 = performance.now();
    current = { slate: true, get currentTime() { return (performance.now() - t0) / 1000; }, pause: function () {}, play: function () {} };
    clipTimer = setTimeout(function () { engine.clipEnded(); }, dur * 1000);
    return null;
  }

  // ── Subtítulos ───────────────────────────────────────────────────
  var subsEl = $('#subs');
  var subsNode = null;
  function tickSubs() {
    var s = engine && engine.state;
    var cue = '';
    if (s && s.kind === 'clip' && current && S.cues && S.cues[s.node]) {
      var t = current.currentTime;
      var list = S.cues[s.node];
      for (var i = 0; i < list.length; i++) if (t >= list[i].start && t < list[i].end + 0.25) cue = list[i].text;
    }
    if (cue !== subsNode) {
      subsNode = cue;
      subsEl.innerHTML = cue ? '<span>' + cue + '</span>' : '';
    }
  }
  if (params.get('subs') === '0') body.classList.add('subs-off');

  // ── Música por capítulo, continua entre ramas ────────────────────
  var music = {};
  var musicOn = params.get('musica') !== '0';
  var musicChapter = null;
  var VOL_CLIP = 0.16;
  var VOL_HOLD = 0.32;
  function track(ch) {
    if (!S.music || !S.music[ch]) return null;
    if (!music[ch]) {
      var a = new Audio(S.music[ch]);
      a.loop = true;
      a.volume = 0;
      music[ch] = a;
    }
    return music[ch];
  }
  function ramp(a, to, ms) {
    if (!a) return;
    var from = a.volume;
    var t0 = performance.now();
    if (to > 0 && a.paused) { var p = a.play(); if (p && p.catch) p.catch(function () {}); }
    clearInterval(a._ramp);
    a._ramp = setInterval(function () {
      var k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = from + (to - from) * k;
      if (k >= 1) { clearInterval(a._ramp); if (to === 0) a.pause(); }
    }, 30);
  }
  function setMusic(ch, holding) {
    var target = musicOn && ch ? (holding ? VOL_HOLD : VOL_CLIP) : 0;
    if (ch !== musicChapter) {
      if (musicChapter) ramp(track(musicChapter), 0, 1200);
      musicChapter = ch;
    }
    ramp(track(ch), target, 600);
  }

  // ── Paneles ──────────────────────────────────────────────────────
  var panels = ['#gate', '#chapters', '#warning', '#decision', '#ficha', '#end', '#sources'];
  function only(sel) {
    panels.forEach(function (p) { $(p).hidden = p !== sel; });
  }
  function chapterOf(id) { return S.chapters.filter(function (c) { return c.id === id; })[0]; }
  function dots(chId) {
    $('#dots').innerHTML = S.chapters.map(function (c) { return '<i class="' + (c.id === chId ? 'on' : '') + '"></i>'; }).join('');
  }

  // Decisiones: 1/2 eligen directo; flechas/AvPág seleccionan y un segundo toque confirma.
  var selected = null;
  var locked = false;
  function renderDecision(s) {
    var n = S.nodes[s.node];
    $('#question').textContent = n.question;
    var btns = document.querySelectorAll('.choice');
    n.choices.forEach(function (c, i) {
      btns[i].querySelector('.label').textContent = c.label;
      btns[i].className = 'choice';
    });
    selected = null;
    locked = false;
    $('#confirm-hint').hidden = true;
  }
  function select(key) {
    if (locked) return;
    if (selected === key) return choose(key);
    selected = key;
    document.querySelectorAll('.choice').forEach(function (b) { b.classList.toggle('selected', b.dataset.key === key); });
    $('#confirm-hint').hidden = false;
  }
  function choose(key) {
    if (locked || !engine || engine.state.kind !== 'decision') return;
    locked = true;
    document.querySelectorAll('.choice').forEach(function (b) {
      b.classList.remove('selected');
      b.classList.add(b.dataset.key === key ? 'chosen' : 'dim');
    });
    setTimeout(function () { engine.choose(key); }, 420);
  }

  function renderFicha(chId) {
    var f = S.fichas[chId];
    var ch = chapterOf(chId);
    $('#ficha-kicker').textContent = 'Capítulo ' + ch.n + ' · ' + ch.title;
    $('#ficha-title').textContent = f.title;
    $('#ficha-lines').innerHTML = f.lines.map(function (l) { return '<li>' + l + '</li>'; }).join('');
    $('#ficha-links').innerHTML = f.links.map(function (l) { return '<a href="' + l.url + '" target="_blank" rel="noopener">' + l.label + ' ↗</a>'; }).join('');
  }
  function renderEnd() {
    $('#route').innerHTML = engine.route.map(function (r) {
      return '<li>' + chapterOf(r.chapter).title + ': ' + r.question + ' → <b>' + r.label + '</b></li>';
    }).join('');
    $('#credits').textContent = S.credits || 'Grupo 4 · Gestión de Seguridad de la Información';
  }

  function onState(s) {
    body.classList.toggle('holding', s.kind !== 'clip');
    dots(s.chapter);
    if (s.kind === 'gate') { only('#gate'); setMusic(null); if (window.self === window.top) $('#btn-show').focus(); return; }
    if (s.kind === 'warning') { only('#warning'); $('#warning-text').textContent = s.text; setMusic(s.chapter, true); return; }
    if (s.kind === 'clip') {
      only(null);
      setMusic(s.chapter, false);
      playClip(s.node);
      var n = S.nodes[s.node];
      var next = n.choices ? n.choices.map(function (c) { return c.next; }) : n.next.indexOf('ficha:') ? [n.next] : [];
      preload((n.choices ? [s.node + '-loop'] : []).concat(next));
      return;
    }
    if (s.kind === 'decision') {
      only('#decision');
      renderDecision(s);
      setMusic(s.chapter, true);
      if (hasClip(s.node + '-loop')) playClip(s.node + '-loop', { loop: true, muted: true });
      return;
    }
    if (s.kind === 'ficha') { only('#ficha'); renderFicha(s.ficha); setMusic(s.chapter, true); return; }
    if (s.kind === 'end') { only('#end'); renderEnd(); setMusic(s.chapter, true); }
  }

  function begin(chapterId) {
    mode = chapterId ? 'chapter' : 'show';
    body.classList.toggle('present', mode === 'show');
    engine = window.createEngine(S, { mode: mode });
    engine.subscribe(onState);
    if (chapterId) engine.start(chapterId);
    else { engine.start(); engine.next(); }
  }
  function home() {
    clearTimeout(clipTimer);
    pool.forEach(function (p) { p.pause(); p.classList.remove('on'); });
    $('#slate').hidden = true;
    engine = window.createEngine(S, { mode: 'show' });
    engine.subscribe(onState);
    engine.start();
  }

  // ── Botones ──────────────────────────────────────────────────────
  $('#btn-show').onclick = function () { begin(null); };
  $('#btn-chapters').onclick = function () {
    $('#chapter-list').innerHTML = S.chapters.map(function (c) {
      return '<button data-ch="' + c.id + '"><small>Capítulo ' + c.n + '</small>' + c.title + '</button>';
    }).join('');
    document.querySelectorAll('[data-ch]').forEach(function (b) { b.onclick = function () { begin(b.dataset.ch); }; });
    only('#chapters');
  };
  function openSources(back) {
    $('#source-list').innerHTML = S.sources.map(function (s) { return '<li><a href="' + s.url + '" target="_blank" rel="noopener">' + s.label + '</a></li>'; }).join('');
    only('#sources');
    $('#sources [data-close]').onclick = function () { only(back); };
  }
  $('#btn-sources').onclick = function () { openSources('#gate'); };
  $('#btn-sources-end').onclick = function () { openSources('#end'); };
  $('#btn-restart').onclick = home;
  $('#chapters [data-close]').onclick = function () { only('#gate'); };
  document.querySelectorAll('[data-continue]').forEach(function (b) { b.onclick = function () { engine.next(); }; });
  document.querySelectorAll('.choice').forEach(function (b) { b.onclick = function () { choose(b.dataset.key); }; });

  // ── Teclado y control remoto ─────────────────────────────────────
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1400);
  }
  function togglePause() {
    if (!current || current.slate) return;
    if (current.paused) { current.play(); body.classList.remove('paused'); }
    else { current.pause(); body.classList.add('paused'); }
  }
  document.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    var k = e.key;
    var s = engine && engine.state;
    if (!s) return;
    if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {});
      return;
    }
    if (k === 'c' || k === 'C') { body.classList.toggle('subs-off'); toast(body.classList.contains('subs-off') ? 'Subtítulos apagados' : 'Subtítulos encendidos'); return; }
    if (k === 'm' || k === 'M') { musicOn = !musicOn; setMusic(musicChapter, s.kind !== 'clip'); toast(musicOn ? 'Música encendida' : 'Música apagada'); return; }
    if (k === 'Escape') { home(); return; }
    if (s.kind === 'gate' && (k === 'Enter' || k === ' ' || k === 'PageDown' || k === 'ArrowRight')) { e.preventDefault(); begin(null); return; }
    if (s.kind === 'decision') {
      if (k === '1') return choose('A');
      if (k === '2') return choose('B');
      if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); return select('A'); }
      if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); return select('B'); }
      if ((k === 'Enter' || k === ' ') && selected) { e.preventDefault(); return choose(selected); }
      if (k === 'r' || k === 'R') { engine.replay(); return; }
      return;
    }
    if (s.kind === 'warning' || s.kind === 'ficha') {
      if (k === 'Enter' || k === ' ' || k === 'PageDown' || k === 'ArrowRight') { e.preventDefault(); engine.next(); }
      return;
    }
    if (s.kind === 'clip') {
      if (k === ' ') { e.preventDefault(); togglePause(); }
      if (k === 'r' || k === 'R') { body.classList.remove('paused'); playClip(s.node); }
    }
  });

  var hudTimer;
  document.addEventListener('mousemove', function () {
    body.classList.add('show-hud');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(function () { body.classList.remove('show-hud'); }, 1800);
  });

  home();
  setInterval(tickSubs, 50);
})();
