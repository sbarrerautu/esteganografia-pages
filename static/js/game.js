(function () {
  "use strict";

  const page = document.body.dataset.page;

  const state = {
    currentLevel: 1,
    maxLevel: 5,
    nickname: "",
    completed: false,
    currentStep: 1,
    totalSteps: 1,
    startTime: 0,
    solvedCurrent: false,
    timerRef: null,
    textSubmitting: false,
    imageSubmitting: false,
    imageManualSubmitting: false
  };

  function goToLevel(level) {
    const safeLevel = Math.max(1, Math.min(5, level));
    loadLevel(safeLevel).catch(function (err) {
      setFeedback(document.getElementById("game-feedback"), err.message, "err");
    });
  }

  function setFeedback(target, message, type) {
    if (!target) return;
    target.textContent = message;
    target.classList.remove("ok", "err");
    if (type) target.classList.add(type);
  }

  function hasInvisibleChars(text) {
    return /[\u200B\u200C]/.test(text || "");
  }

  function countInvisibleChars(text) {
    const matches = String(text || "").match(/[\u200B\u200C]/g);
    return matches ? matches.length : 0;
  }

  function toVisibleUnicodeText(text) {
    return String(text || "")
      .replace(/\u200B/g, "[U+200B]")
      .replace(/\u200C/g, "[U+200C]");
  }

  async function copyTextPreservingUnicode(text) {
    const raw = String(text || "");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(raw);
      return;
    }
    const temp = document.createElement("textarea");
    temp.value = raw;
    temp.setAttribute("readonly", "readonly");
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
  }

  async function renderLevel3SolvedExplanation() {
    const payload = (document.getElementById("payload-text") || {}).value || "";
    const explanation = document.getElementById("level3-explanation");
    const binaryOut = document.getElementById("level3-solution-binary");
    const stepsOut = document.getElementById("level3-solution-steps");
    const unicodePlainOut = document.getElementById("level3-unicode-plain");
    if (!payload || !explanation || !binaryOut || !stepsOut || !unicodePlainOut) return;

    try {
      const body = await fetchWithRetry(
        "/lab/decode-zero-width",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: payload })
        },
        2,
        800
      );
      binaryOut.value = body.binary || "";
      const lines = (body.steps || []).map(function (s, idx) {
        return (idx + 1) + ". " + s.byte + " -> " + s.ascii_code + " -> " + s.ascii_char;
      });
      stepsOut.textContent = lines.join("\n");
      unicodePlainOut.textContent = toVisibleUnicodeText(payload);
      explanation.classList.remove("hidden");
    } catch (err) {
      binaryOut.value = "";
      stepsOut.textContent = "";
      unicodePlainOut.textContent = toVisibleUnicodeText(payload);
      explanation.classList.remove("hidden");
    }
  }

  async function parseResponse(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) {
      if (body?.error?.message) {
        throw new Error(body.error.message);
      }
      if (response.status >= 500) {
        throw new Error("El servidor se esta iniciando. Espera unos segundos y vuelve a intentar.");
      }
      throw new Error("Error inesperado");
    }
    return body;
  }

  async function fetchWithRetry(url, options, retries, delayMs) {
    let lastError = null;
    for (let i = 0; i <= retries; i += 1) {
      try {
        const res = await fetch(url, options);
        return await parseResponse(res);
      } catch (err) {
        lastError = err;
        if (i < retries) {
          await new Promise(function (resolve) {
            setTimeout(resolve, delayMs);
          });
        }
      }
    }
    throw lastError || new Error("No se pudo completar la solicitud.");
  }

  function formatSeconds(total) {
    const secs = Math.max(0, Math.floor(total));
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return mm + ":" + ss;
  }

  function clampText(value, maxLen) {
    const text = String(value || "");
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + "...";
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
    const body = await fetchWithRetry("/state", {}, 3, 1500);
    state.nickname = body.state.nickname || "";
    state.currentLevel = body.state.current_level;
    state.completed = !!body.state.completed;
    state.maxLevel = 5;
    startTimer(body.state.start_time);
    return body.state;
  }

  function showCompletionScreen() {
    const levelContent = document.getElementById("level-content");
    const completionBox = document.getElementById("completion-box");
    const completionMeta = document.getElementById("completion-meta");
    const nextBtn = document.getElementById("next-btn");
    if (levelContent) levelContent.classList.add("hidden");
    if (completionBox) completionBox.classList.remove("hidden");
    if (nextBtn) nextBtn.classList.add("hidden");
    if (completionMeta) {
      const timerText = (document.getElementById("timer") || {}).textContent || "00:00";
      const nick = state.nickname || "Participante";
      completionMeta.textContent = nick + " - Tiempo total: " + timerText;
    }
  }

  function updateProgress(level) {
    const progressText = document.getElementById("progress-text");
    const fill = document.getElementById("progress-fill");
    if (!progressText || !fill) return;
    progressText.textContent = "Nivel " + level + " de " + state.maxLevel;
    fill.style.width = ((level / state.maxLevel) * 100) + "%";
  }

  function setLevel4Mode(mode) {
    const retoBlock = document.getElementById("level4-reto-block");
    const labBlock = document.getElementById("image-embed-lab");
    if (!retoBlock || !labBlock) return;
    const isLab = mode === "lab";
    retoBlock.classList.toggle("hidden", isLab);
    labBlock.classList.toggle("hidden", !isLab);
  }

  async function loadLevel(level) {
    const feedback = document.getElementById("game-feedback");
    const body = await fetchWithRetry("/level/" + level, {}, 2, 1200);
    const levelData = body.level;

    state.currentLevel = body.current_level;
    state.solvedCurrent = false;
    updateProgress(levelData.id);
    setFeedback(feedback, "", null);

    state.currentStep = levelData.current_step || 1;
    state.totalSteps = levelData.total_steps || 1;

    let dynamicTitle = levelData.title;
    if (levelData.id === 2) {
      dynamicTitle = "Nivel 2." + state.currentStep + " - Acrostico";
    }
    document.getElementById("level-title").textContent = dynamicTitle;
    const theoryEl = document.getElementById("level-theory");
    if (theoryEl) {
      // Sin spoilers: ocultamos el bloque teorico durante los retos.
      theoryEl.textContent = "";
      theoryEl.classList.add("hidden");
    }
    const questionEl = document.getElementById("level-question");
    const instructionEl = document.getElementById("level-instruction");
    const hintEl = document.getElementById("level-hint");
    const level3Explanation = document.getElementById("level3-explanation");
    level3Explanation.classList.add("hidden");
    const level3SolutionBinary = document.getElementById("level3-solution-binary");
    const level3SolutionSteps = document.getElementById("level3-solution-steps");
    const level3UnicodePlain = document.getElementById("level3-unicode-plain");
    if (level3SolutionBinary) level3SolutionBinary.value = "";
    if (level3SolutionSteps) level3SolutionSteps.textContent = "";
    if (level3UnicodePlain) level3UnicodePlain.textContent = "";

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
    const stepProgress = document.getElementById("step-progress");
    if (levelData.id === 2) {
      stepProgress.classList.remove("hidden");
      stepProgress.textContent = "Reto " + state.currentStep + " de " + state.totalSteps;
    } else {
      stepProgress.classList.add("hidden");
      stepProgress.textContent = "";
    }

    const nextBtn = document.getElementById("next-btn");
    const prevBtn = document.getElementById("prev-btn");
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.classList.add("hidden");
      nextBtn.textContent = "Siguiente nivel";
    }
    if (prevBtn) prevBtn.disabled = levelData.id <= 1;

    const completionBox = document.getElementById("completion-box");
    const levelContent = document.getElementById("level-content");
    if (completionBox) completionBox.classList.add("hidden");
    if (levelContent) levelContent.classList.remove("hidden");

    const textZone = document.getElementById("text-zone");
    const imageZone = document.getElementById("image-zone");
    const decodedPreview = document.getElementById("decoded-preview");
    const copyChallengeBtn = document.getElementById("copy-challenge-text-btn");
    const copyChallengeFeedback = document.getElementById("copy-challenge-feedback");
    const level3DecoderZone = document.getElementById("level3-decoder-zone");
    const level4Info = document.getElementById("level4-info");
    const level5Info = document.getElementById("level5-info");
    const level4Switch = document.getElementById("level4-mode-switch");
    if (!textZone || !imageZone || !decodedPreview) return;
    decodedPreview.textContent = "";
    renderImageAnalysis(null);

    if (levelData.kind === "text") {
      textZone.classList.remove("hidden");
      imageZone.classList.add("hidden");
      if (level4Info) level4Info.classList.add("hidden");
      if (level5Info) level5Info.classList.add("hidden");
      document.getElementById("payload-text").value = levelData.payload_text;
      if (levelData.id === 3) {
        if (copyChallengeBtn) copyChallengeBtn.classList.remove("hidden");
        if (level3DecoderZone) level3DecoderZone.classList.remove("hidden");
        const custom = document.getElementById("level3-custom-text");
        const decodeFeedback = document.getElementById("level3-decode-feedback");
        const result = document.getElementById("level3-decode-result");
        const debugBox = document.getElementById("level3-decode-debug");
        const binaryOut = document.getElementById("level3-binary-output");
        const asciiSteps = document.getElementById("level3-ascii-steps");
        if (custom) custom.value = "";
        if (copyChallengeFeedback) copyChallengeFeedback.textContent = "";
        setFeedback(decodeFeedback, "", null);
        if (result) result.value = "";
        if (debugBox) debugBox.classList.add("hidden");
        if (binaryOut) binaryOut.value = "";
        if (asciiSteps) asciiSteps.textContent = "";
      } else {
        if (copyChallengeBtn) copyChallengeBtn.classList.add("hidden");
        if (copyChallengeFeedback) copyChallengeFeedback.textContent = "";
        if (level3DecoderZone) level3DecoderZone.classList.add("hidden");
      }
      document.getElementById("answer-input").value = "";
      const textLocked = !!levelData.answer_locked;
      document.getElementById("answer-input").disabled = textLocked;
      document.getElementById("answer-btn").disabled = textLocked;
      if (textLocked) {
        state.solvedCurrent = true;
        setFeedback(
          document.getElementById("game-feedback"),
          "Este nivel ya fue resuelto. La respuesta quedo bloqueada.",
          "ok"
        );
        const submitted = levelData.submitted_answer || "";
        if (submitted) document.getElementById("answer-input").value = submitted;
      }
    } else {
      imageZone.classList.remove("hidden");
      textZone.classList.add("hidden");
      if (copyChallengeBtn) copyChallengeBtn.classList.add("hidden");
      if (level3DecoderZone) level3DecoderZone.classList.add("hidden");
      if (level4Info) level4Info.classList.add("hidden");
      if (level5Info) level5Info.classList.add("hidden");
      if (level4Switch) level4Switch.classList.toggle("hidden", levelData.id !== 4);
      if (levelData.id === 4) {
        setLevel4Mode("reto");
      } else {
        const retoBlock = document.getElementById("level4-reto-block");
        const labBlock = document.getElementById("image-embed-lab");
        if (retoBlock) retoBlock.classList.remove("hidden");
        if (labBlock) labBlock.classList.add("hidden");
      }
      document.getElementById("challenge-image").src = levelData.challenge_image;
      document.getElementById("image-input").value = "";
      const imageAnswerInput = document.getElementById("image-answer-input");
      if (imageAnswerInput) imageAnswerInput.value = "";
      const imageLocked = !!levelData.answer_locked;
      const uploadBtn = document.getElementById("upload-btn");
      const manualBtn = document.getElementById("image-answer-btn");
      const manualInput = imageAnswerInput;
      if (uploadBtn) uploadBtn.disabled = false;
      if (manualBtn) manualBtn.disabled = imageLocked;
      if (manualInput) manualInput.disabled = imageLocked;
      if (imageLocked) {
        state.solvedCurrent = true;
        setFeedback(
          document.getElementById("game-feedback"),
          "Nivel resuelto: puedes seguir analizando imagenes, pero la validacion de respuesta esta bloqueada.",
          "ok"
        );
      }
    }
  }

  async function submitTextAnswer() {
    const feedback = document.getElementById("game-feedback");
    if (state.textSubmitting) return;
    state.textSubmitting = true;
    const previousStep = state.currentStep;
    const answer = document.getElementById("answer-input").value.trim();
    if (!answer) {
      setFeedback(feedback, "Ingresa una respuesta antes de validar.", "err");
      state.textSubmitting = false;
      return;
    }

    try {
      const answerBtn = document.getElementById("answer-btn");
      if (answerBtn) answerBtn.disabled = true;
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
      state.completed = !!body.completed;
      const withExpected = state.currentLevel === 1 || state.currentLevel === 2 || state.currentLevel === 3;
      if (body.correct) {
        const feedbackText = withExpected && body.expected_answer
          ? body.result_label + "\nMensaje esperado: " + body.expected_answer
          : body.feedback;
        setFeedback(feedback, feedbackText, "ok");
        state.solvedCurrent = true;
        const answerInput = document.getElementById("answer-input");
        const answerBtn = document.getElementById("answer-btn");
        if (answerInput) answerInput.disabled = true;
        if (answerBtn) answerBtn.disabled = true;
        if (state.currentLevel === 2 && body.current_step <= body.total_steps) {
          state.currentStep = body.current_step;
          if (body.current_step > previousStep) {
            await loadLevel(2);
            setFeedback(
              feedback,
              "Correcto en el reto 2.1. Ahora continua con el reto 2.2.",
              "ok"
            );
            return;
          }
        }
        unlockNavigation(body.completed);
      } else {
        setFeedback(feedback, "Incorrecto. Intenta nuevamente.", "err");
        const answerBtn = document.getElementById("answer-btn");
        if (answerBtn) answerBtn.disabled = false;
      }

      if (state.currentLevel === 3 && body.correct) {
        await renderLevel3SolvedExplanation();
      }
    } catch (err) {
      setFeedback(feedback, err.message, "err");
      const answerBtn = document.getElementById("answer-btn");
      const answerInput = document.getElementById("answer-input");
      if (answerBtn && !(answerInput && answerInput.disabled)) {
        answerBtn.disabled = false;
      }
    } finally {
      state.textSubmitting = false;
    }
  }

  async function submitImageAnswer() {
    const feedback = document.getElementById("game-feedback");
    if (state.imageSubmitting) return;
    state.imageSubmitting = true;
    const decodedPreview = document.getElementById("decoded-preview");
    const fileInput = document.getElementById("image-input");
    const answerInput = document.getElementById("image-answer-input");
    const file = fileInput.files[0];
    if (!file) {
      setFeedback(feedback, "Selecciona una imagen para procesar.", "err");
      state.imageSubmitting = false;
      return;
    }

    const formData = new FormData();
    formData.append("level_id", String(state.currentLevel));
    formData.append("image", file);

    try {
      const uploadBtn = document.getElementById("upload-btn");
      if (uploadBtn) uploadBtn.disabled = true;
      const response = await fetch("/upload-image", {
        method: "POST",
        body: formData
      });
      const body = await parseResponse(response);
      state.completed = !!body.completed;
      let messageToShow = body.decoded_message || "";
      if (state.currentLevel === 4 && body.analysis && body.analysis.best_guess) {
        const best = body.analysis.best_guess;
        messageToShow =
          best.delimiter_message ||
          (best.readable_sections && best.readable_sections[0]) ||
          messageToShow;
      }
      if (messageToShow.length > 160) {
        messageToShow = messageToShow.slice(0, 160) + "...";
      }
      decodedPreview.textContent = "Mensaje extraido: " + messageToShow;
      renderImageAnalysis(body.analysis);
      if (body.correct) {
        setFeedback(feedback, body.feedback, "ok");
        state.solvedCurrent = true;
        const uploadBtn = document.getElementById("upload-btn");
        if (uploadBtn) uploadBtn.disabled = false;
        unlockNavigation(body.completed);
      } else {
        setFeedback(feedback, body.feedback, "err");
        const uploadBtn = document.getElementById("upload-btn");
        if (uploadBtn) uploadBtn.disabled = false;
      }
    } catch (err) {
      setFeedback(feedback, err.message, "err");
      const uploadBtn = document.getElementById("upload-btn");
      if (uploadBtn) uploadBtn.disabled = false;
    } finally {
      state.imageSubmitting = false;
    }
  }

  async function submitImageManualAnswer() {
    const feedback = document.getElementById("game-feedback");
    if (state.imageManualSubmitting) return;
    state.imageManualSubmitting = true;
    const answer = (document.getElementById("image-answer-input") || {}).value || "";
    if (!answer.trim()) {
      setFeedback(feedback, "Ingresa una respuesta manual antes de enviar.", "err");
      state.imageManualSubmitting = false;
      return;
    }

    try {
      const manualBtn = document.getElementById("image-answer-btn");
      if (manualBtn) manualBtn.disabled = true;
      const response = await fetch("/answer-image-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level_id: state.currentLevel,
          answer: answer
        })
      });
      const body = await parseResponse(response);
      state.completed = !!body.completed;
      if (body.correct) {
        setFeedback(feedback, body.feedback, "ok");
        state.solvedCurrent = true;
        const manualInput = document.getElementById("image-answer-input");
        const manualBtn = document.getElementById("image-answer-btn");
        if (manualInput) manualInput.disabled = true;
        if (manualBtn) manualBtn.disabled = true;
        unlockNavigation(body.completed);
      } else {
        setFeedback(feedback, "Incorrecto. Intenta nuevamente.", "err");
        const manualBtn = document.getElementById("image-answer-btn");
        if (manualBtn) manualBtn.disabled = false;
      }
    } catch (err) {
      setFeedback(feedback, err.message, "err");
      const manualBtn = document.getElementById("image-answer-btn");
      if (manualBtn) manualBtn.disabled = false;
    } finally {
      state.imageManualSubmitting = false;
    }
  }

  function renderImageAnalysis(analysis) {
    const box = document.getElementById("image-analysis-box");
    const summaryEl = document.getElementById("analysis-summary");
    const bestEl = document.getElementById("analysis-best");
    const stepsEl = document.getElementById("analysis-steps");
    const candidatesEl = document.getElementById("analysis-candidates");
    if (!box || !summaryEl || !bestEl || !stepsEl || !candidatesEl) return;

    if (!analysis) {
      box.classList.add("hidden");
      summaryEl.textContent = "";
      bestEl.textContent = "";
      stepsEl.textContent = "";
      candidatesEl.textContent = "";
      return;
    }

    box.classList.remove("hidden");
    summaryEl.textContent = analysis.summary || "Sin resumen.";
    stepsEl.textContent = (analysis.steps || []).join("\n");
    const best = analysis.best_guess || null;
    if (best) {
      const clean =
        best.delimiter_message ||
        ((best.readable_sections || [])[0] || "(sin texto limpio)");
      bestEl.textContent =
        "Mejor candidato: canal " + best.channel +
        ", offset " + best.offset +
        ". Texto sugerido: " + clampText(clean, 80);
    } else {
      bestEl.textContent = "No se detectó un candidato claro.";
    }

    const bits = analysis.bits_extracted || {};
    const bitLines = Object.keys(bits).map(function (k) {
      return "- " + k + ": " + bits[k] + " bits";
    });
    const candidateLines = (analysis.candidates || []).map(function (c, idx) {
      const sections = (c.readable_sections || []).join(" | ");
      const extra = c.delimiter_message ? (" | Delimitador: " + c.delimiter_message) : "";
      const b64 = c.base64_decoded ? (" | Base64: " + c.base64_decoded) : "";
      const transform = (c.ascii_preview || []).map(function (s, i) {
        return (i + 1) + ". " + s.byte + " -> " + s.ascii_code + " -> " + s.ascii_char;
      }).join("\n");
      return (
        "[" + (idx + 1) + "] canal=" + c.channel +
        " offset=" + c.offset +
        " score=" + c.score +
        " bits=" + (c.bit_count || c.bits_used || 0) +
        "\npreview: " + (c.preview || "") +
        (sections ? ("\nlegible: " + sections) : "") +
        extra + b64 +
        (c.binary_preview ? ("\nbinario (preview): " + c.binary_preview) : "") +
        (transform ? ("\ntransformacion byte->ASCII:\n" + transform) : "")
      );
    });
    candidatesEl.textContent = [
      "Bits extraídos:",
      bitLines.join("\n"),
      "",
      "Candidatos:",
      candidateLines.join("\n\n")
    ].join("\n");
  }

  function unlockNavigation(completed) {
    const nextBtn = document.getElementById("next-btn");
    if (!nextBtn) return;
    state.completed = !!completed;
    if (completed || state.currentLevel === state.maxLevel) {
      nextBtn.textContent = "Finalizar taller";
      nextBtn.classList.remove("hidden");
      nextBtn.disabled = false;
      return;
    }
    nextBtn.textContent = "Siguiente nivel";
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
        setFeedback(feedback, "Ingresa un nickname válido.", "err");
        return;
      }

      try {
        const response = await fetch("/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: nickname })
        });
        await parseResponse(response);
        window.location.href = "/game?level=1";
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
        await parseResponse(response);
        window.location.href = "/game?level=2";
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

    function setLab3ExportEnabled(enabled) {
      if (copyBtn) copyBtn.disabled = !enabled;
      if (downloadBtn) downloadBtn.disabled = !enabled;
    }

    setLab3ExportEnabled(false);

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
          const isValid = body.validation === "VALID";
          if (isValid) {
            document.getElementById("lab3-encoded-output").value = encodedText;
            document.getElementById("lab3-decode-input").value = encodedText;
            setLab3ExportEnabled(true);
          } else {
            document.getElementById("lab3-encoded-output").value = "";
            setLab3ExportEnabled(false);
          }
          const zwCount = (body.bits || "").length;
          const statusText = body.validation_message || body.validation || "N/A";
          const adviceText = body.advice ? (" | " + body.advice) : "";
          meta.textContent = "Caracteres invisibles incluidos: " + zwCount + " | Estado: " + statusText + adviceText;
          if (isValid) {
            setFeedback(labFeedback, "Información oculta en el texto generado.", "ok");
          } else {
            setFeedback(
              labFeedback,
              "No se pudo generar un texto oculto válido. Ajusta el texto visible o el mensaje y vuelve a intentar.",
              "err"
            );
          }
        })
        .catch(function (err) {
          document.getElementById("lab3-encoded-output").value = "";
          setLab3ExportEnabled(false);
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
          const statusText = body.validation_message || body.validation || "N/A";
          meta.textContent = "Estado: " + statusText + " | Bits detectados: " + ((body.bits || "").length);
          if (decoded) {
            const encodedCurrent = document.getElementById("lab3-encoded-output").value || "";
            setLab3ExportEnabled(!!encodedCurrent);
            setFeedback(labFeedback, "Texto descifrado correctamente.", "ok");
          } else {
            document.getElementById("lab3-encoded-output").value = "";
            setLab3ExportEnabled(false);
            setFeedback(
              labFeedback,
              "Descifrado inválido: no se detectaron datos ocultos válidos.",
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
            "No se pudo copiar automáticamente. Usa el botón de descarga .txt.",
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
        await parseResponse(response);
        window.location.href = "/game?level=3";
      } catch (err) {
        setFeedback(feedback, err.message, "err");
      }
    });
  }

  async function bindGamePage() {
    const feedback = document.getElementById("game-feedback");
    try {
      const sessionState = await loadSessionState();
      const params = new URLSearchParams(window.location.search);
      const requestedLevel = Number(params.get("level") || 0);
      if (requestedLevel >= 1 && requestedLevel <= 5) {
        await loadLevel(requestedLevel);
      } else {
        await loadLevel(sessionState.current_level);
      }
    } catch (err) {
      setFeedback(feedback, err.message + " Vuelve al inicio.", "err");
      return;
    }

    document.getElementById("answer-btn").addEventListener("click", submitTextAnswer);
    document.getElementById("upload-btn").addEventListener("click", submitImageAnswer);
    const imageAnswerBtn = document.getElementById("image-answer-btn");
    if (imageAnswerBtn) {
      imageAnswerBtn.addEventListener("click", submitImageManualAnswer);
    }
    const copyChallengeBtn = document.getElementById("copy-challenge-text-btn");
    if (copyChallengeBtn) {
      copyChallengeBtn.addEventListener("click", async function () {
        const payload = (document.getElementById("payload-text") || {}).value || "";
        try {
          await copyTextPreservingUnicode(payload);
          const invisibleCount = countInvisibleChars(payload);
          if (copyChallengeFeedback) {
            copyChallengeFeedback.textContent =
              "Texto copiado con " + invisibleCount + " caracteres Unicode invisibles.";
          }
        } catch (err) {
          if (copyChallengeFeedback) {
            copyChallengeFeedback.textContent =
              "No se pudo copiar automáticamente. Selecciona y copia el texto manualmente.";
          }
        }
      });
    }

    const decodeBtn = document.getElementById("level3-decode-btn");
    if (decodeBtn) {
      decodeBtn.addEventListener("click", function () {
        const customText = (document.getElementById("level3-custom-text") || {}).value || "";
        const sourceText = customText;
        const warningEl = document.getElementById("level3-decode-warning");
        const decodeFeedback = document.getElementById("level3-decode-feedback");
        const resultEl = document.getElementById("level3-decode-result");
        const debugBox = document.getElementById("level3-decode-debug");
        const binaryOut = document.getElementById("level3-binary-output");
        const asciiSteps = document.getElementById("level3-ascii-steps");
        if (warningEl) warningEl.textContent = "";
        setFeedback(decodeFeedback, "", null);
        if (!sourceText.trim()) {
          if (resultEl) resultEl.value = "";
          if (binaryOut) binaryOut.value = "";
          if (asciiSteps) asciiSteps.textContent = "";
          if (debugBox) debugBox.classList.add("hidden");
          setFeedback(decodeFeedback, "Debes pegar o escribir un texto para descifrar.", "err");
          return;
        }
        if (warningEl && !hasInvisibleChars(customText)) {
          warningEl.textContent = "No se detectaron caracteres invisibles en el texto ingresado.";
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
              setFeedback(decodeFeedback, "Texto descifrado correctamente.", "ok");
            } else {
              if (debugBox) debugBox.classList.add("hidden");
              setFeedback(decodeFeedback, body.message || "No se detectaron caracteres invisibles ocultos en el texto.", "err");
            }
          })
          .catch(function (err) {
            setFeedback(decodeFeedback, err.message, "err");
          });
      });
    }

    const embedBtn = document.getElementById("embed-image-btn");
    if (embedBtn) {
      embedBtn.addEventListener("click", async function () {
        const feedbackEl = document.getElementById("embed-feedback");
        const fileInput = document.getElementById("embed-image-input");
        const secretInput = document.getElementById("embed-secret-input");
        const modeSelect = document.getElementById("embed-mode-select");
        const downloadLink = document.getElementById("embed-download-link");

        const file = fileInput.files[0];
        const secret = (secretInput.value || "").trim();
        const mode = (modeSelect.value || "RGB").toUpperCase();

        if (!file) {
          setFeedback(feedbackEl, "Selecciona una imagen base para ocultar datos.", "err");
          return;
        }
        if (!secret) {
          setFeedback(feedbackEl, "Ingresa un mensaje para ocultar.", "err");
          return;
        }

        const formData = new FormData();
        formData.append("image", file);
        formData.append("secret", secret);
        formData.append("mode", mode);

        try {
          const response = await fetch("/lab/embed-image-lsb", {
            method: "POST",
            body: formData
          });
          const body = await parseResponse(response);
          const mime = body.mime || "image/png";
          const dataUrl = "data:" + mime + ";base64," + body.image_base64;
          downloadLink.href = dataUrl;
          downloadLink.download = body.download_filename || "imagen_con_mensaje.png";
          downloadLink.classList.remove("hidden");
          setFeedback(
            feedbackEl,
            "Imagen generada. Bits escritos: " + body.report.bits_written + " / " + body.report.capacity_bits,
            "ok"
          );
        } catch (err) {
          setFeedback(feedbackEl, err.message, "err");
        }
      });
    }

    const nextBtn = document.getElementById("next-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (state.currentLevel >= state.maxLevel || state.completed) {
          showCompletionScreen();
          return;
        }
        const next = Math.min(5, state.currentLevel + 1);
        window.location.href = "/game?level=" + next;
      });
    }
  }

  async function bindImageLabPage() {
    const analyzeBtn = document.getElementById("lab-image-analyze-btn");
    const feedbackEl = document.getElementById("lab-image-feedback");
    const analyzeLoader = document.getElementById("lab-image-loader");
    if (!analyzeBtn) return;

    analyzeBtn.addEventListener("click", async function () {
      const fileInput = document.getElementById("lab-image-input");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      if (!file) {
        setFeedback(feedbackEl, "Selecciona una imagen para analizar.", "err");
        return;
      }
      const formData = new FormData();
      formData.append("image", file);
      try {
        analyzeBtn.disabled = true;
        if (analyzeLoader) analyzeLoader.classList.remove("hidden");
        const res = await fetch("/lab/analyze-image", { method: "POST", body: formData });
        const body = await parseResponse(res);
        const decodedEl = document.getElementById("lab-image-decoded");
        const rgb = body.decoded_rgb || "";
        const red = body.decoded_red || "";
        if (decodedEl) {
          decodedEl.textContent = "Canal RGB: " + clampText(rgb, 80) + " | Canal R: " + clampText(red, 80);
        }
        renderImageAnalysis(body.analysis);
        setFeedback(feedbackEl, "Análisis completado.", "ok");
      } catch (err) {
        setFeedback(feedbackEl, err.message, "err");
      } finally {
        analyzeBtn.disabled = false;
        if (analyzeLoader) analyzeLoader.classList.add("hidden");
      }
    });

    const embedBtn = document.getElementById("embed-image-btn");
    const embedLoader = document.getElementById("embed-loader");
    if (embedBtn) {
      embedBtn.addEventListener("click", async function () {
        const fileInput = document.getElementById("embed-image-input");
        const secretInput = document.getElementById("embed-secret-input");
        const modeSelect = document.getElementById("embed-mode-select");
        const downloadLink = document.getElementById("embed-download-link");
        const embedFeedback = document.getElementById("embed-feedback");

        const file = fileInput.files[0];
        const secret = (secretInput.value || "").trim();
        const mode = (modeSelect.value || "RGB").toUpperCase();
        if (!file) {
          setFeedback(embedFeedback, "Selecciona una imagen base.", "err");
          return;
        }
        if (!secret) {
          setFeedback(embedFeedback, "Ingresa un mensaje a ocultar.", "err");
          return;
        }

        const formData = new FormData();
        formData.append("image", file);
        formData.append("secret", secret);
        formData.append("mode", mode);

        try {
          embedBtn.disabled = true;
          if (embedLoader) embedLoader.classList.remove("hidden");
          const res = await fetch("/lab/embed-image-lsb", { method: "POST", body: formData });
          const body = await parseResponse(res);
          const dataUrl = "data:" + (body.mime || "image/png") + ";base64," + body.image_base64;
          downloadLink.href = dataUrl;
          downloadLink.download = body.download_filename || "imagen_con_mensaje.png";
          downloadLink.classList.remove("hidden");
          setFeedback(embedFeedback, "Imagen generada correctamente.", "ok");
        } catch (err) {
          setFeedback(embedFeedback, err.message, "err");
        } finally {
          embedBtn.disabled = false;
          if (embedLoader) embedLoader.classList.add("hidden");
        }
      });
    }
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
      setFeedback(feedback, "Desafío completado.", "ok");
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
  } else if (page === "lab-unicode") {
    bindLevel3Lab();
  } else if (page === "lab-image") {
    bindImageLabPage();
  } else if (page === "result") {
    bindResultPage();
  }
})();
