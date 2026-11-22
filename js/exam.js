import { renderExam } from "./exam-render.js";

const rootEl = document.getElementById("exam");
const titleEl = document.getElementById("exam-title");
const tocButton = document.getElementById("exam-toc");
const progressEl = document.getElementById("exam-progress");
const articleEl = document.getElementById("exam-article");
const pagerEl = document.getElementById("exam-pager");
const sheetEl = document.getElementById("exam-sheet");
const sheetListEl = document.getElementById("exam-sheet-list");

let problems = null;
let loadingPromise = null;
let current = -1;
let active = false;
let bound = false;
let frame = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function loadProblems() {
  if (problems) return problems;
  if (!loadingPromise) {
    loadingPromise = fetch("exam/exam.json").then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
  }
  problems = (await loadingPromise).problems;
  if (!Array.isArray(problems) || problems.length === 0) throw new Error("empty exam");
  return problems;
}

function shortId(problem) {
  return `${problem.id.slice(0, 2).toUpperCase()} ${problem.id.slice(3).replace("_", "-")}`;
}

function buildSheet() {
  sheetListEl.replaceChildren();
  let lastPart = null;
  problems.forEach((problem, i) => {
    if (problem.part !== lastPart) {
      lastPart = problem.part;
      sheetListEl.appendChild(el("div", "sheet-group", `${problem.part}. ${problem.partName}`));
    }
    const button = el("button", "sheet-item");
    button.type = "button";
    button.appendChild(el("span", "sheet-n", shortId(problem)));
    button.appendChild(el("span", "sheet-t", problem.title));
    button.addEventListener("click", () => {
      closeSheet();
      showProblem(i);
    });
    sheetListEl.appendChild(button);
  });
}

function buildPager() {
  pagerEl.replaceChildren();
  const make = (label, target, cls) => {
    const button = el("button", `pager-btn ${cls}`);
    button.type = "button";
    button.appendChild(el("span", "pager-dir", label));
    button.appendChild(el("span", "pager-ttl", `${shortId(problems[target])} · ${problems[target].title}`));
    button.addEventListener("click", () => showProblem(target));
    return button;
  };
  if (current > 0) pagerEl.appendChild(make("← 이전 문제", current - 1, "prev"));
  if (current < problems.length - 1) pagerEl.appendChild(make("다음 문제 →", current + 1, "next"));
}

function updateProgress() {
  frame = 0;
  const max = rootEl.scrollHeight - rootEl.clientHeight;
  const ratio = max > 0 ? Math.min(1, Math.max(0, rootEl.scrollTop / max)) : 0;
  progressEl.style.transform = `scaleX(${ratio})`;
}

function showProblem(index) {
  if (index < 0 || index >= problems.length) return;
  current = index;
  renderExam(articleEl, problems[index], index, problems.length);
  titleEl.textContent = `${index + 1}/${problems.length} · ${shortId(problems[index])}`;
  buildPager();
  rootEl.scrollTop = 0;
  updateProgress();
  history.replaceState(null, "", `#exam-${index + 1}`);
}

function openSheet() {
  sheetEl.hidden = false;
}

function closeSheet() {
  sheetEl.hidden = true;
}

function bindOnce() {
  tocButton.addEventListener("click", openSheet);
  document.getElementById("exam-sheet-close").addEventListener("click", closeSheet);
  sheetEl.addEventListener("click", (event) => {
    if (event.target === sheetEl) closeSheet();
  });
  document.addEventListener("keydown", (event) => {
    if (!active) return;
    if (event.key === "Escape") closeSheet();
    else if (event.key === "ArrowLeft" && sheetEl.hidden) showProblem(current - 1);
    else if (event.key === "ArrowRight" && sheetEl.hidden) showProblem(current + 1);
  });
  rootEl.addEventListener(
    "scroll",
    () => {
      if (!frame) frame = requestAnimationFrame(updateProgress);
    },
    { passive: true },
  );
  window.addEventListener("resize", updateProgress);
}

export async function openExam(index = 0) {
  active = true;
  if (!bound) {
    bindOnce();
    bound = true;
  }
  try {
    await loadProblems();
  } catch {
    articleEl.replaceChildren(el("div", "sum-error", "월말 평가 문제를 불러오지 못했습니다"));
    return;
  }
  if (sheetListEl.children.length === 0) buildSheet();
  const safe = Math.min(problems.length - 1, Math.max(0, index));
  if (safe !== current) showProblem(safe);
  else history.replaceState(null, "", `#exam-${current + 1}`);
}

export function closeExam() {
  active = false;
  closeSheet();
}
