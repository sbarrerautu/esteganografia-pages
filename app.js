(function () {
  "use strict";

  const EXPECTED_LEVEL_1 = "clave";

  const state = {
    feedbackTargetId: "level-feedback"
  };

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".panel"));

  const levelAnswerInput = document.getElementById("level-answer");
  const checkAnswerBtn = document.getElementById("check-answer-btn");
  const retryBtn = document.getElementById("retry-btn");

  const methodSelect = document.getElementById("method-select");
  const labResource = document.getElementById("lab-resource");
  const decodeBtn = document.getElementById("decode-btn");
  const labOutput = document.getElementById("lab-output");

  function switchView(viewName) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.view === viewName;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.id === `view-${viewName}`;
      panel.classList.toggle("is-active", isActive);
    });
  }

  function getFirstLetterToken(token) {
    const clean = token.replace(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$/g, "");
    return clean.length > 0 ? clean[0] : "";
  }

  function extractAcrostic(text) {
    if (!text || !text.trim()) {
      return "";
    }

    return text
      .trim()
      .split(/\s+/)
      .map(getFirstLetterToken)
      .join("");
  }

  function normalizeAnswer(text) {
    return (text || "").trim().toLowerCase();
  }

  function checkLevelAnswer(userInput, expected) {
    return normalizeAnswer(userInput) === normalizeAnswer(expected);
  }

  function renderFeedback(type, message) {
    const target = document.getElementById(state.feedbackTargetId);
    if (!target) {
      return;
    }

    target.classList.remove("is-success", "is-error");
    target.classList.add(type === "success" ? "is-success" : "is-error");
    target.textContent = message;
  }

  function clearFeedback(targetId) {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    target.classList.remove("is-success", "is-error");
    target.textContent = "";
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchView(tab.dataset.view);
    });
  });

  checkAnswerBtn.addEventListener("click", () => {
    state.feedbackTargetId = "level-feedback";

    const userText = levelAnswerInput.value;
    const isCorrect = checkLevelAnswer(userText, EXPECTED_LEVEL_1);

    if (isCorrect) {
      renderFeedback("success", "Correcto. Descubriste el mensaje oculto.");
      return;
    }

    renderFeedback("error", "Respuesta incorrecta. Revisa las iniciales y vuelve a intentar.");
  });

  retryBtn.addEventListener("click", () => {
    levelAnswerInput.value = "";
    clearFeedback("level-feedback");
    levelAnswerInput.focus();
  });

  decodeBtn.addEventListener("click", () => {
    state.feedbackTargetId = "lab-feedback";
    clearFeedback("lab-feedback");

    if (methodSelect.value !== "acrostic") {
      renderFeedback("error", "Metodo no soportado en esta version.");
      return;
    }

    const source = labResource.value;
    if (!source.trim()) {
      labOutput.value = "";
      renderFeedback("error", "Ingresa un texto recurso para desencriptar.");
      return;
    }

    const decoded = extractAcrostic(source);
    labOutput.value = decoded;
    renderFeedback("success", "Desencriptado completo con metodo Acrostico.");
  });

  window.extractAcrostic = extractAcrostic;
  window.normalizeAnswer = normalizeAnswer;
  window.checkLevelAnswer = checkLevelAnswer;
  window.renderFeedback = renderFeedback;
})();
