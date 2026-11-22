import { parseQuestions } from "./validate.js";
import { createDeck, SUBJECTS } from "./deck.js";
import { renderCard } from "./render.js";
import { bindInput } from "./input.js";
import { playTransition, playDeal } from "./animate.js";
import { fitCard, getAvailableHeight } from "./fit.js";
import { openSummary, closeSummary } from "./summary.js";
import { openExam, closeExam } from "./exam.js";

const FILTERS = [
  ["all", "전체"],
  ["multiple", "객관식"],
  ["short", "단답형"],
  ["essay", "주관식"],
];

const optionsEl = document.getElementById("options");
const filtersEl = document.getElementById("filters");
const stageEl = document.getElementById("stage");
const cardEl = document.getElementById("card");
const g1El = document.getElementById("g1");
const g2El = document.getElementById("g2");
const progressEl = document.getElementById("progress");
const hintEl = document.getElementById("hint");
const autoExpandEl = document.getElementById("auto-expand");
const controlsEl = document.getElementById("controls");
const orderEl = document.getElementById("order");
const errorEl = document.getElementById("error");
const modesEl = document.getElementById("modes");
const summaryEl = document.getElementById("summary");
const examEl = document.getElementById("exam");

let deck = null;
let busy = false;
let autoExpand = false;
let mode = "cards";
let cardsFailed = false;

function showError(message) {
  cardsFailed = true;
  errorEl.textContent = message;
  applyMode();
}

function applyMode() {
  const cards = mode === "cards";
  const showCards = cards && !cardsFailed;
  stageEl.hidden = !showCards;
  optionsEl.hidden = !showCards;
  filtersEl.hidden = !showCards;
  progressEl.hidden = !showCards;
  hintEl.hidden = !showCards;
  controlsEl.hidden = !showCards;
  errorEl.hidden = !(cards && cardsFailed);
  summaryEl.hidden = mode !== "summary";
  examEl.hidden = mode !== "exam";
  for (const button of modesEl.children) {
    button.classList.toggle("active", button.dataset.mode === mode);
  }
}

function parseHash() {
  const match = /^#(summary|exam)(?:-(\d+))?$/.exec(window.location.hash);
  return match ? { mode: match[1], part: match[2] ? Number(match[2]) - 1 : 0 } : { mode: "cards", part: 0 };
}

function setMode(next, part = 0) {
  const previous = mode;
  mode = next;
  applyMode();
  if (previous === "summary") closeSummary();
  if (previous === "exam") closeExam();
  if (next === "summary") {
    openSummary(part);
  } else if (next === "exam") {
    openExam(part);
  } else {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    if (deck) fit();
  }
}

function bindModes() {
  for (const button of modesEl.children) {
    button.addEventListener("click", () => {
      button.blur();
      if (button.dataset.mode !== mode) setMode(button.dataset.mode);
    });
  }
  window.addEventListener("hashchange", () => {
    const target = parseHash();
    if (target.mode !== mode || target.mode !== "cards") setMode(target.mode, target.part);
  });
}

function fit() {
  fitCard(cardEl, getAvailableHeight(stageEl));
}

function renderCurrent() {
  renderCard(cardEl, deck.current(), fit, autoExpand);
  g1El.classList.toggle("hidden", deck.remaining() < 1);
  g2El.classList.toggle("hidden", deck.remaining() < 2);
  fit();
}

function renderFilters() {
  const counts = deck.counts();
  filtersEl.replaceChildren();
  for (const [value, label] of FILTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    const n = document.createElement("span");
    n.className = "n";
    n.textContent = String(counts[value]);
    button.appendChild(n);
    button.disabled = counts[value] === 0;
    if (value === deck.filter()) button.classList.add("active");
    button.addEventListener("click", () => {
      button.blur();
      if (busy) return;
      if (deck.setFilter(value)) renderAll();
    });
    filtersEl.appendChild(button);
  }
}

function renderOptions() {
  const counts = deck.subjectCounts();
  optionsEl.replaceChildren();
  const group = (items, isActive, onPick) => {
    const box = document.createElement("div");
    box.className = "group";
    for (const [value, label, count] of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (count !== undefined) {
        const n = document.createElement("span");
        n.className = "n";
        n.textContent = String(count);
        button.appendChild(n);
        button.disabled = count === 0;
      }
      if (isActive(value)) button.classList.add("active");
      button.addEventListener("click", () => {
        button.blur();
        if (busy) return;
        onPick(value);
      });
      box.appendChild(button);
    }
    optionsEl.appendChild(box);
  };
  group(
    [["all", "전체 과목", counts.all], ...SUBJECTS.map(([k, l]) => [k, l, counts[k]])],
    (value) => value === deck.subject(),
    (value) => {
      if (deck.setSubject(value)) renderAll();
    },
  );
}

function renderOrder() {
  orderEl.replaceChildren();
  for (const [value, label] of [
    ["shuffle", "섞기"],
    ["ordered", "순서대로"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if ((value === "ordered") === deck.isOrdered()) button.classList.add("active");
    button.addEventListener("click", async () => {
      button.blur();
      if (busy) return;
      deck.setOrdered(value === "ordered");
      renderAll();
      busy = true;
      try {
        await playDeal(cardEl, [g1El, g2El]);
      } catch (error) {
        if (error.name !== "AbortError") console.error(error);
      } finally {
        busy = false;
      }
    });
    orderEl.appendChild(button);
  }
}

function toggleAutoExpand() {
  autoExpandEl.blur();
  if (busy) return;
  autoExpand = !autoExpand;
  autoExpandEl.setAttribute("aria-pressed", String(autoExpand));
  autoExpandEl.textContent = autoExpand ? "항상 펼치기: ON" : "항상 펼치기: OFF";
  if (autoExpand) renderCurrent();
}

function toggleCardAnswer() {
  const button = cardEl.querySelector(".toggle");
  if (button) button.click();
}

function renderProgress() {
  progressEl.textContent = `${deck.index() + 1} / ${deck.total()}`;
}

function renderAll() {
  renderOptions();
  renderOrder();
  renderFilters();
  renderCurrent();
  renderProgress();
}

async function navigate(dir) {
  if (busy) return;
  const result = dir === "next" ? deck.next() : deck.prev();
  if (result === "stay") return;
  busy = true;
  try {
    await playTransition(cardEl, dir, () => {
      renderCurrent();
      renderProgress();
    });
  } catch (error) {
    if (error.name !== "AbortError") console.error(error);
  } finally {
    busy = false;
  }
}

async function boot() {
  bindModes();
  const initial = parseHash();
  if (initial.mode !== "cards") setMode("summary", initial.part);
  try {
    const response = await fetch("questions.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { questions } = parseQuestions(await response.json());
    if (questions.length === 0) throw new Error("no valid questions");
    deck = createDeck(questions);
  } catch {
    showError("문제를 불러오지 못했습니다");
    return;
  }
  renderAll();
  bindInput(stageEl, navigate, toggleCardAnswer, () => mode === "cards");
  autoExpandEl.addEventListener("click", toggleAutoExpand);
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
}

boot();
