// ---- Generic quiz engine ----
// Each quiz page defines a global `QUIZ` object before loading this script:
// const QUIZ = {
//   moduleName: "Estrutura Atômica",
//   moduleHref: "estrutura-atomica.html",
//   roadmapHref: "index.html",
//   passThreshold: 0.7,
//   questions: [
//     { q: "...", options: ["...","...","...","..."], correct: 0, explain: "..." }
//   ]
// };

(function () {
  if (typeof QUIZ === "undefined") return;

  const pool = Array.isArray(QUIZ.questions) ? QUIZ.questions.slice() : [];
  const quizSize = Number.isFinite(QUIZ.quizSize) && QUIZ.quizSize > 0 ? QUIZ.quizSize : pool.length;
  const max = Math.min(quizSize, pool.length);

  function pick(arr, n) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n);
  }

  let current = 0;
  let score = 0;
  let selected = null;
  let answered = false;
  let round = [];

  function resetRound() {
    round = pick(pool.slice(), max);
    current = 0;
    score = 0;
    selected = null;
    answered = false;
  }

  const total = () => round.length;

  const els = {
    stage: document.getElementById("quiz-stage"),
    results: document.getElementById("quiz-results"),
    progressLabel: document.getElementById("quiz-progress-label"),
    progressFill: document.getElementById("quiz-progress-fill"),
    scoreLabel: document.getElementById("quiz-score-label"),
    question: document.getElementById("quiz-question"),
    options: document.getElementById("quiz-options"),
    feedback: document.getElementById("quiz-feedback"),
    confirmBtn: document.getElementById("quiz-confirm"),
  };

  function renderQuestion() {
    selected = null;
    answered = false;

    const q = round[current];
    els.progressLabel.textContent = `PERGUNTA ${current + 1}/${total()}`;
    els.progressFill.style.width = `${(current / total()) * 100}%`;
    els.scoreLabel.textContent = `ACERTOS: ${score}`;

    els.question.textContent = q.q;

    els.options.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.type = "button";
      btn.innerHTML = `<span class="opt-mark">${String.fromCharCode(65 + i)}</span><span>${opt}</span>`;
      btn.addEventListener("click", () => selectOption(i, btn));
      els.options.appendChild(btn);
    });

    els.feedback.style.display = "none";
    els.feedback.className = "quiz-feedback";
    els.confirmBtn.textContent = "Confirmar";
    els.confirmBtn.disabled = true;
    els.confirmBtn.onclick = confirmAnswer;
  }

  function selectOption(i, btn) {
    if (answered) return;
    selected = i;
    [...els.options.children].forEach((c) => c.classList.remove("selected"));
    btn.classList.add("selected");
    els.confirmBtn.disabled = false;
  }

  function confirmAnswer() {
    if (selected === null || answered) return;
    answered = true;

    const q = round[current];
    const isCorrect = selected === q.correct;
    if (isCorrect) score++;

    [...els.options.children].forEach((c, i) => {
      c.classList.add("locked");
      if (i === q.correct) c.classList.add("correct");
      else if (i === selected) c.classList.add("incorrect");
    });

    els.feedback.style.display = "block";
    els.feedback.classList.add(isCorrect ? "correct" : "incorrect");
    els.feedback.innerHTML = `<b>${isCorrect ? "Correto." : "Não é isso."}</b> ${q.explain}`;

    els.scoreLabel.textContent = `ACERTOS: ${score}`;
    els.progressFill.style.width = `${((current + 1) / total()) * 100}%`;

    els.confirmBtn.textContent = current + 1 < total() ? "Próxima pergunta →" : "Ver resultado →";
    els.confirmBtn.disabled = false;
    els.confirmBtn.onclick = () => {
      current++;
      if (current < total()) renderQuestion();
      else showResults();
    };
  }

  function showResults() {
    els.stage.style.display = "none";
    els.results.style.display = "block";

    const pct = score / total();
    const passed = pct >= (QUIZ.passThreshold || 0.7);

    els.results.innerHTML = `
      <div class="section-kicker" style="text-align:center;">RESULTADO</div>
      <div class="quiz-score-readout">${score}<span>/${total()}</span></div>
      <div class="quiz-pass-tag ${passed ? "" : "fail"}">${passed ? "APROVADO" : "REVISAR MÓDULO"}</div>
      <p style="color:var(--text-muted); max-width:480px; margin:0 auto 8px; font-size:14px; line-height:1.6;">
        ${passed
          ? `Você acertou ${score} de ${total()} perguntas sobre ${QUIZ.moduleName}. Base sólida para seguir no roadmap.`
          : `Você acertou ${score} de ${total()} perguntas. Vale revisar o módulo de ${QUIZ.moduleName} antes de seguir em frente.`}
      </p>
      <div class="quiz-results-actions">
        <button class="btn-primary" id="quiz-retry">Refazer quiz</button>
        <a class="btn-ghost" href="${QUIZ.moduleHref}">Revisar módulo</a>
        <a class="btn-ghost" href="${QUIZ.roadmapHref}">Voltar ao roadmap</a>
      </div>
    `;

    document.getElementById("quiz-retry").addEventListener("click", () => {
      resetRound();
      els.results.style.display = "none";
      els.stage.style.display = "block";
      renderQuestion();
    });
  }

  resetRound();
  renderQuestion();
})();
