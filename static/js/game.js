(function () {
  "use strict";

  const page = document.body.dataset.page;

  const state = {
    currentLevel: 1,
    maxLevel: 5,
    currentStep: 1,
    totalSteps: 1,
    startTime: 0,
    solvedCurrent: false,
    timerRef: null
  };

  function setFeedback(target, message, type) {
    if (!target) return;
    target.textContent = message;
    target.classList.remove("ok", "err");
    if (type) target.classList.add(type);
  }

  function hasInvisibleChars(text) {
    return /[\u200B\u200C]/.test(text || "");
  }

  async function parseResponse(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) {
      throw new Error(body?.error?.message || "Error inesperado");
    }
    return body;
  }

  function formatSeconds(total) {
    const secs = Math.max(0, Math.floor(total));
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return mm + ":" + ss;
  }

  function startTimer(startTime) {
    state.startTime = startTime;
    const timerEl = document.getElementById("timer");
    if (!timerEl) return;
    if (state.timerRef) clearInterval(state.timerRef);
    state.timerRef = setInterval(() => {
      const elapsed = Date.now() / 1000 - state.startTime;
      timerEl.textContent = formatSeconds(elapsed);
    }, 250);
  }

  async function loadSessionState() {
    const response = await fetch("/state");
    const body = await parseResponse(response);
    state.currentLevel = body.state.current_level;
    state.maxLevel = 5;
    startTimer(body.state.start_time);
    return body.state;
  }

  function updateProgress(level) {
    const progressText = document.getElementById("progress-text");
    const fill = document.getElementById("progress-fill");
    if (!progressText || !fill) return;
    progressText.textContent = "Nivel " + level + " de " + state.maxLevel;
    fill.style.width = ((level / state.maxLevel) * 100) + "%";
  }

  async function loadLevel(level) {
    const feedback = document.getElementById("game-feedback");
    const response = await fetch("/level/" + level);
    const body = await parseResponse(response);
    const levelData = body.level;

    state.currentLevel = body.current_level;
    state.solvedCurrent = false;
    updateProgress(levelData.id);
    setFeedback(feedback, "", null);

    document.getElementById("level-title").textContent = levelData.title;
    const questionEl = document.getElementById("level-question");
    const instructionEl = document.getElementById("level-instruction");
    const hintEl = document.getElementById("level-hint");
    const level3Explanation = document.getElementById("level3-explanation");
    level3Explanation.classList.add("hidden");

    if (levelData.id === 1 || levelData.id === 2) {
      questionEl.classList.add("hidden");
      instructionEl.classList.add("hidden");
      hintEl.classList.add("hidden");
      questionEl.textContent = "";
      instructionEl.textContent = "";
      hintEl.textContent = "";
    } else if (levelData.id === 3) {
      questionEl.classList.add("hidden");
      instructionEl.classList.remove("hidden");
      hintEl.classList.remove("hidden");
      questionEl.textContent = "";
      instructionEl.textContent = levelData.instruction;
      hintEl.textContent = levelData.hint;
    } else {
      questionEl.classList.remove("hidden");
      instructionEl.classList.remove("hidden");
      hintEl.classList.remove("hidden");
      questionEl.textContent = "Pregunta: " + levelData.question;
      instructionEl.textContent = levelData.instruction;
      hintEl.textContent = "Pista: " + levelData.hint;
    }
    state.currentStep = levelData.current_step || 1;
    state.totalSteps = levelData.total_steps || 1;
    const stepProgress = document.getElementById("step-progress");
    if (levelData.id === 2) {
      stepProgress.classList.remove("hidden");
      stepProgress.textContent = "Reto " + state.currentStep + " de " + state.totalSteps;
    } else {
      stepProgress.classList.add("hidden");
      stepProgress.textContent = "";
    }

    const nextBtn = document.getElementById("next-btn");
    const resultBtn = document.getElementById("result-btn");
    nextBtn.disabled = true;
    resultBtn.classList.add("hidden");

    const textZone = document.getElementById("text-zone");
    const imageZone = document.getElementById("image-zone");
    const decodedPreview = document.getElementById("decoded-preview");
    const copyChallengeBtn = document.getElementById("copy-challenge-text-btn");
    const level3DecoderZone = document.getElementById("level3-decoder-zone");
    if (!textZone || !imageZone || !decodedPreview) return;
    decodedPreview.textContent = "";

    if (levelData.kind === "text") {
      textZone.classList.remove("hidden");
      imageZone.classList.add("hidden");
      document.getElementById("payload-text").value = levelData.payload_text;
      if (levelData.id === 3) {
        if (copyChallengeBtn) copyChallengeBtn.classList.remove("hidden");
        if (level3DecoderZone) level3DecoderZone.classList.remove("hidden");
        const custom = document.getElementById("level3-custom-text");
        const result = document.getElementById("level3-decode-result");
        const debugBox = document.getElementById("level3-decode-debug");
        const binaryOut = document.getElementById("level3-binary-output");
        const asciiSteps = document.getElementById("level3-ascii-steps");
        if (custom) custom.value = levelData.payload_text;
        if (result) result.value = "";
        if (debugBox) debugBox.classList.add("hidden");
        if (binaryOut) binaryOut.value = "";
        if (asciiSteps) asciiSteps.textContent = "";
      } else {
        if (copyChallengeBtn) copyChallengeBtn.classList.add("hidden");
        if (level3DecoderZone) level3DecoderZone.classList.add("hidden");
      }
      document.getElementById("answer-input").value = "";
    } else {
      imageZone.classList.remove("hidden");
      textZone.classList.add("hidden");
      if (copyChallengeBtn) copyChallengeBtn.classList.add("hidden");
      if (level3DecoderZone) level3DecoderZone.classList.add("hidden");
      document.getElementById("challenge-image").src = levelData.challenge_image;
      document.getElementById("image-input").value = "";
    }
  }

  async function submitTextAnswer() {
    const feedback = document.getElementById("game-feedback");
    const answer = document.getElementById("answer-input").value.trim();
    if (!answer) {
      setFeedback(feedback, "Ingresa una respuesta antes de validar.", "err");
      return;
    }

    try {
      const response = await fetch("/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level_id: state.currentLevel,
          step_id: state.currentStep,
          answer: answer
        })
      });
      const body = await parseResponse(response);
      const withExpected = state.currentLevel === 1 || state.currentLevel === 2 || state.currentLevel === 3;
      if (body.correct) {
        const feedbackText = withExpected && body.expected_answer
          ? body.result_label + "\nMensaje esperado: " + body.expected_answer
          : body.feedback;
        setFeedback(feedback, feedbackText, "ok");
        state.solvedCurrent = true;
        if (state.currentLevel === 2 && body.current_step <= body.total_steps) {
          state.currentStep = body.current_step;
        }
        unlockNavigation(body.completed);
      } else {
        setFeedback(feedback, "Incorrecto. Intenta nuevamente.", "err");
      }

      if (state.currentLevel === 3) {
        document.getElementById("level3-explanation").classList.remove("hidden");
      }
    } catch (err) {
      setFeedback(feedback, err.message, "err");
    }
  }

  async function submitImageAnswer() {
    const feedback = document.getElementById("game-feedback");
    const decodedPreview = document.getElementById("decoded-preview");
    const fileInput = document.getElementById("image-input");
    const file = fileInput.files[0];
    if (!file) {
      setFeedback(feedback, "Selecciona una imagen para procesar.", "err");
      return;
    }

    const formData = new FormData();
    formData.append("level_id", String(state.currentLevel));
    formData.append("image", file);

    try {
      const response = await fetch("/upload-image", {
        method: "POST",
        body: formData
      });
      const body = await parseResponse(response);
      decodedPreview.textContent = "Mensaje extraido: " + body.decoded_message;
      if (body.correct) {
        setFeedback(feedback, body.feedback, "ok");
        state.solvedCurrent = true;
        unlockNavigation(body.completed);
      } else {
        setFeedback(feedback, body.feedback, "err");
      }
    } catch (err) {
      setFeedback(feedback, err.message, "err");
    }
  }

  function unlockNavigation(completed) {
    const nextBtn = document.getElementById("next-btn");
    const resultBtn = document.getElementById("result-btn");
    if (completed || state.currentLevel === state.maxLevel) {
      nextBtn.classList.add("hidden");
      resultBtn.classList.remove("hidden");
      return;
    }
    nextBtn.classList.remove("hidden");
    nextBtn.disabled = false;
  }

  async function bindIndexPage() {
    const form = document.getElementById("start-form");
    const feedback = document.getElementById("start-feedback");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const nickname = document.getElementById("nickname").value.trim();
      if (!nickname) {
        setFeedback(feedback, "Ingresa un nickname valido.", "err");
        return;
      }

      try {
        const response = await fetch("/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: nickname })
        });
        await parseResponse(response);
        window.location.href = "/intro";
      } catch (err) {
        setFeedback(feedback, err.message, "err");
      }
    });
  }

  async function bindIntroPage() {
    const button = document.getElementById("start-level-1-btn");
    const feedback = document.getElementById("intro-feedback");
    if (!button) return;

    button.addEventListener("click", async function () {
      try {
        const response = await fetch("/state");
        await parseResponse(response);
        window.location.href = "/game";
      } catch (err) {
        setFeedback(feedback, err.message + " Vuelve al inicio.", "err");
      }
    });
  }

  async function bindLevel2IntroPage() {
    const button = document.getElementById("start-level-2-btn");
    const feedback = document.getElementById("level2-intro-feedback");
    if (!button) return;

    button.addEventListener("click", async function () {
      try {
        const response = await fetch("/state");
        const body = await parseResponse(response);
        if (body.state.current_level < 2) {
          throw new Error("Debes completar el nivel 1 primero.");
        }
        window.location.href = "/game";
      } catch (err) {
        setFeedback(feedback, err.message, "err");
      }
    });
  }

  function bindLevel3Lab() {
    const encodeBtn = document.getElementById("lab3-encode-btn");
    const copyBtn = document.getElementById("lab3-copy-btn");
    const decodeBtn = document.getElementById("lab3-decode-btn");
    const downloadBtn = document.getElementById("lab3-download-btn");
    const labFeedback = document.getElementById("lab3-feedback");
    const meta = document.getElementById("lab3-meta");
    if (!encodeBtn || !decodeBtn) return;

    encodeBtn.addEventListener("click", function () {
      const visible = document.getElementById("lab3-visible-text").value || "";
      const key = document.getElementById("lab3-key-text").value || "";
      fetch("/lab/encode-zero-width", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: key, cover: visible })
      })
        .then(parseResponse)
        .then(function (body) {
          const encodedText = body.encoded_text || "";
          document.getElementById("lab3-encoded-output").value = encodedText;
          document.getElementById("lab3-decode-input").value = encodedText;
          const zwCount = (body.bits || "").length;
          meta.textContent = "Caracteres invisibles incluidos: " + zwCount + " | Estado: " + (body.validation || "N/A");
          setFeedback(labFeedback, "Informacion oculta en el texto generado.", "ok");
        })
        .catch(function (err) {
          setFeedback(labFeedback, err.message, "err");
        });
    });

    decodeBtn.addEventListener("click", function () {
      const typedText = document.getElementById("lab3-decode-input").value || "";
      const generatedText = document.getElementById("lab3-encoded-output").value || "";
      const sourceText = typedText || generatedText;
      fetch("/lab/decode-zero-width", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText })
      })
        .then(parseResponse)
        .then(function (body) {
          const decoded = body.validation === "VALID" ? (body.decoded_message || "") : "";
          document.getElementById("lab3-decoded-output").value = decoded;
          meta.textContent = "Estado: " + (body.validation || "N/A") + " | Bits detectados: " + ((body.bits || "").length);
          if (decoded) {
            setFeedback(labFeedback, "Texto descifrado correctamente.", "ok");
          } else {
            setFeedback(
              labFeedback,
              "No se detectaron caracteres invisibles decodificables en el texto ingresado.",
              "err"
            );
          }
        })
        .catch(function (err) {
          setFeedback(labFeedback, err.message, "err");
        });
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", async function () {
        const encodedText = document.getElementById("lab3-encoded-output").value || "";
        if (!encodedText) {
          setFeedback(labFeedback, "Primero genera un texto oculto.", "err");
          return;
        }
        try {
          await navigator.clipboard.writeText(encodedText);
          setFeedback(
            labFeedback,
            "Texto oculto copiado. Si otra app limpia caracteres invisibles, usa la descarga .txt.",
            "ok"
          );
        } catch (err) {
          setFeedback(
            labFeedback,
            "No se pudo copiar automaticamente. Usa el boton de descarga .txt.",
            "err"
          );
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", function () {
        const encodedText = document.getElementById("lab3-encoded-output").value || "";
        if (!encodedText) {
          setFeedback(labFeedback, "Primero genera un texto oculto.", "err");
          return;
        }
        const blob = new Blob([encodedText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mensaje_unicode_invisible.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setFeedback(labFeedback, "Archivo .txt descargado para compartir sin perder caracteres invisibles.", "ok");
      });
    }
  }

  async function bindLevel3IntroPage() {
    const button = document.getElementById("start-level-3-btn");
    const feedback = document.getElementById("level3-intro-feedback");
    bindLevel3Lab();
    if (!button) return;

    button.addEventListener("click", async function () {
      try {
        const response = await fetch("/state");
        const body = await parseResponse(response);
        if (body.state.current_level < 3) {
          throw new Error("Debes completar el nivel 2 primero.");
        }
        window.location.href = "/game";
      } catch (err) {
        setFeedback(feedback, err.message, "err");
      }
    });
  }

  async function bindGamePage() {
    const feedback = document.getElementById("game-feedback");
    try {
      await loadSessionState();
      await loadLevel(state.currentLevel);
    } catch (err) {
      setFeedback(feedback, err.message + " Vuelve al inicio.", "err");
      return;
    }

    document.getElementById("answer-btn").addEventListener("click", submitTextAnswer);
    document.getElementById("upload-btn").addEventListener("click", submitImageAnswer);
    const copyChallengeBtn = document.getElementById("copy-challenge-text-btn");
    if (copyChallengeBtn) {
      copyChallengeBtn.addEventListener("click", async function () {
        const payload = (document.getElementById("payload-text") || {}).value || "";
        try {
          await navigator.clipboard.writeText(payload);
          setFeedback(
            document.getElementById("game-feedback"),
            "Texto del reto copiado. Si una app elimina invisibles, usa un editor que respete Unicode.",
            "ok"
          );
        } catch (err) {
          setFeedback(
            document.getElementById("game-feedback"),
            "No se pudo copiar automaticamente. Selecciona y copia el texto manualmente.",
            "err"
          );
        }
      });
    }

    const decodeBtn = document.getElementById("level3-decode-btn");
    if (decodeBtn) {
      decodeBtn.addEventListener("click", function () {
        const customText = (document.getElementById("level3-custom-text") || {}).value || "";
        const challengeText = (document.getElementById("payload-text") || {}).value || "";
        const sourceText = hasInvisibleChars(customText) ? customText : challengeText;
        const warningEl = document.getElementById("level3-decode-warning");
        const resultEl = document.getElementById("level3-decode-result");
        const debugBox = document.getElementById("level3-decode-debug");
        const binaryOut = document.getElementById("level3-binary-output");
        const asciiSteps = document.getElementById("level3-ascii-steps");
        if (warningEl) warningEl.textContent = "";
        if (warningEl && !hasInvisibleChars(customText)) {
          warningEl.textContent = "No se detectaron invisibles en el texto pegado. Se uso el texto del reto.";
        }
        fetch("/lab/decode-zero-width", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sourceText })
        })
          .then(parseResponse)
          .then(function (body) {
            const decoded = body.validation === "VALID" ? (body.decoded_message || "") : "";
            if (resultEl) resultEl.value = decoded;
            if (binaryOut) binaryOut.value = body.binary || "";
            if (asciiSteps) {
              const lines = (body.steps || []).map(function (s, idx) {
                return (idx + 1) + ". " + s.byte + " -> " + s.ascii_code + " -> " + s.ascii_char;
              });
              asciiSteps.textContent = lines.join("\n");
            }
            if (warningEl && body.warning) {
              warningEl.textContent = body.warning;
            }
            if (decoded) {
              if (debugBox) debugBox.classList.remove("hidden");
              setFeedback(document.getElementById("game-feedback"), "Texto descifrado correctamente.", "ok");
            } else {
              if (debugBox) debugBox.classList.add("hidden");
              setFeedback(
                document.getElementById("game-feedback"),
                body.message || "No se detectaron caracteres invisibles ocultos en el texto.",
                "err"
              );
            }
          })
          .catch(function (err) {
            setFeedback(document.getElementById("game-feedback"), err.message, "err");
          });
      });
    }

    document.getElementById("next-btn").addEventListener("click", async function () {
      if (!state.solvedCurrent) return;
      try {
        if (state.currentLevel === 1) {
          window.location.href = "/nivel2-intro";
          return;
        }
        if (state.currentLevel === 2) {
          window.location.href = "/nivel3-intro";
          return;
        }
        const response = await fetch("/state");
        const body = await parseResponse(response);
        await loadLevel(body.state.current_level);
      } catch (err) {
        setFeedback(feedback, err.message, "err");
      }
    });

    document.getElementById("result-btn").addEventListener("click", function () {
      window.location.href = "/resultado";
    });
  }

  async function bindResultPage() {
    const feedback = document.getElementById("result-feedback");
    try {
      const response = await fetch("/result");
      const body = await parseResponse(response);
      document.getElementById("r-nickname").textContent = body.nickname;
      document.getElementById("r-time").textContent = body.total_time + " s";
      document.getElementById("r-score").textContent = String(body.score);
      document.getElementById("r-correct").textContent = String(body.correct_answers) + " / 5";

      const list = document.getElementById("level-times");
      list.innerHTML = "";
      for (let i = 1; i <= 5; i += 1) {
        const key = String(i);
        const value = body.per_level_time[key] !== undefined ? body.per_level_time[key] + " s" : "No resuelto";
        const item = document.createElement("li");
        item.textContent = "Nivel " + key + ": " + value;
        list.appendChild(item);
      }
      setFeedback(feedback, "Desafio completado.", "ok");
    } catch (err) {
      setFeedback(feedback, err.message, "err");
    }
  }

  if (page === "index") {
    bindIndexPage();
  } else if (page === "intro") {
    bindIntroPage();
  } else if (page === "level2-intro") {
    bindLevel2IntroPage();
  } else if (page === "level3-intro") {
    bindLevel3IntroPage();
  } else if (page === "game") {
    bindGamePage();
  } else if (page === "result") {
    bindResultPage();
  }
})();
