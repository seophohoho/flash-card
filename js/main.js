import { parseQuestions } from "./validate.js";
import { createDeck } from "./deck.js";
import { renderCard } from "./render.js";
import { bindInput } from "./input.js";
import { playTransition } from "./animate.js";
import { fitCard, getAvailableHeight } from "./fit.js";

const FILTERS = [
  ["all", "전체"],
  ["multiple", "객관식"],
  ["short", "단답형"],
  ["essay", "주관식"],
];

const filtersEl = document.getElementById("filters");
const stageEl = document.getElementById("stage");
const cardEl = document.getElementById("card");
const g1El = document.getElementById("g1");
const g2El = document.getElementById("g2");
const progressEl = document.getElementById("progress");
const errorEl = document.getElementById("error");

let deck = null;
let busy = false;

function showError(message) {
  stageEl.hidden = true;
  filtersEl.hidden = true;
  progressEl.hidden = true;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function fit() {
  fitCard(cardEl, getAvailableHeight(stageEl));
}

function renderCurrent() {
  renderCard(cardEl, deck.current(), fit);
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

function renderProgress() {
  progressEl.textContent = `${deck.index() + 1} / ${deck.total()}`;
}

function renderAll() {
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
  } finally {
    busy = false;
  }
}

async function boot() {
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
  bindInput(stageEl, navigate);
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
}

boot();
