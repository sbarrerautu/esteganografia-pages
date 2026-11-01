// Máquina de estados del recorrido. Sin DOM: la usa ui.js en el navegador y los tests en Node.
(function (root) {
  function createEngine(story, opts) {
    var mode = (opts && opts.mode) || 'show';
    var chapters = story.chapters;
    var nodes = story.nodes;
    var listeners = [];
    var engine = { state: { kind: 'idle' }, route: [] };

    function set(next) {
      engine.state = next;
      listeners.forEach(function (fn) { fn(next); });
    }
    function chapterIndex(id) {
      for (var i = 0; i < chapters.length; i++) if (chapters[i].id === id) return i;
      return -1;
    }
    function enterChapter(id) {
      var ch = chapters[chapterIndex(id)];
      if (ch.warning) set({ kind: 'warning', chapter: ch.id, text: ch.warning });
      else set({ kind: 'clip', chapter: ch.id, node: ch.start });
    }
    function goto(target, chapter) {
      if (target.indexOf('ficha:') === 0) set({ kind: 'ficha', chapter: chapter, ficha: target.slice(6) });
      else set({ kind: 'clip', chapter: chapter, node: target });
    }

    engine.subscribe = function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    };

    engine.start = function (chapterId) {
      engine.route = [];
      if (chapterId) enterChapter(chapterId);
      else set({ kind: 'gate' });
    };

    engine.clipEnded = function () {
      var s = engine.state;
      if (s.kind !== 'clip') return;
      var n = nodes[s.node];
      if (n.choices) set({ kind: 'decision', chapter: s.chapter, node: s.node });
      else goto(n.next, s.chapter);
    };

    engine.choose = function (key) {
      var s = engine.state;
      if (s.kind !== 'decision') return;
      var n = nodes[s.node];
      var c = n.choices.filter(function (x) { return x.key === key; })[0];
      if (!c) return;
      engine.route.push({ chapter: s.chapter, node: s.node, question: n.question, key: c.key, label: c.label });
      goto(c.next, s.chapter);
    };

    engine.next = function () {
      var s = engine.state;
      if (s.kind === 'gate') enterChapter(chapters[0].id);
      else if (s.kind === 'warning') set({ kind: 'clip', chapter: s.chapter, node: chapters[chapterIndex(s.chapter)].start });
      else if (s.kind === 'ficha') {
        var i = chapterIndex(s.chapter);
        if (mode === 'show' && i < chapters.length - 1) enterChapter(chapters[i + 1].id);
        else set({ kind: 'end', chapter: s.chapter });
      }
    };

    /** Vuelve a reproducir el clip actual (o el último, si estamos en decisión). */
    engine.replay = function () {
      var s = engine.state;
      if (s.kind === 'clip' || s.kind === 'decision') set({ kind: 'clip', chapter: s.chapter, node: s.node, replay: true });
    };

    return engine;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createEngine: createEngine };
  else root.createEngine = createEngine;
})(typeof window !== 'undefined' ? window : globalThis);
