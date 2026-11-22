import { splitParts } from "./markdown.js";
import { renderPart } from "./summary-render.js";
import { loadMermaid, renderDiagram, layoutDiagram, setPlaying } from "./diagram.js";

const SOURCE_URLS = ["summary/flink_summary.md", "summary/spark_summary.md"];
const PART_LABELS = ["Flink", "Spark"];
const ZOOM_STEP = 1.25;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;

const rootEl = document.getElementById("summary");
const partsEl = document.getElementById("sum-parts");
const tocButton = document.getElementById("sum-toc");
const progressEl = document.getElementById("sum-progress");
const articleEl = document.getElementById("sum-article");
const pagerEl = document.getElementById("sum-pager");
const sheetEl = document.getElementById("sum-sheet");
const sheetListEl = document.getElementById("sum-sheet-list");
const modalEl = document.getElementById("dg-modal");
const modalBodyEl = document.getElementById("dgm-body");
const modalTitleEl = document.getElementById("dgm-title");
const modalZoomEl = document.getElementById("dgm-zoom");

let parts = null;
let current = -1;
let token = 0;
let rendered = [];
let observer = null;
let toc = [];
let loadingPromise = null;
let modalSvg = null;
let modalZoom = 1;
let frame = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function loadParts() {
  if (parts) return parts;
  if (!loadingPromise) {
    loadingPromise = Promise.all(
      SOURCE_URLS.map((url) =>
        fetch(url).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        }),
      ),
    );
  }
  parts = (await loadingPromise).flatMap(splitParts);
  if (parts.length === 0) throw new Error("empty summary");
  return parts;
}

function buildBar() {
  partsEl.replaceChildren();
  parts.forEach((part, i) => {
    const button = el("button", "part-chip");
    button.type = "button";
    button.appendChild(el("span", "part-n", String(i + 1)));
    button.appendChild(el("span", "part-l", PART_LABELS[i] || `${i + 1}편`));
    button.addEventListener("click", () => {
      button.blur();
      showPart(i);
    });
    partsEl.appendChild(button);
  });
}

function updateBar() {
  [...partsEl.children].forEach((node, i) => node.classList.toggle("active", i === current));
}

function buildPager() {
  pagerEl.replaceChildren();
  const make = (label, target, cls) => {
    const button = el("button", `pager-btn ${cls}`);
    button.type = "button";
    button.appendChild(el("span", "pager-dir", label));
    button.appendChild(el("span", "pager-ttl", PART_LABELS[target] || `${target + 1}편`));
    button.addEventListener("click", () => showPart(target));
    return button;
  };
  if (current > 0) pagerEl.appendChild(make("← 이전 편", current - 1, "prev"));
  if (current < parts.length - 1) pagerEl.appendChild(make("다음 편 →", current + 1, "next"));
}

function buildSheet() {
  sheetListEl.replaceChildren();
  for (const item of toc) {
    const button = el("button", "sheet-item");
    button.type = "button";
    if (item.number) button.appendChild(el("span", "sheet-n", item.number));
    button.appendChild(el("span", "sheet-t", item.text));
    button.addEventListener("click", () => {
      closeSheet();
      const target = document.getElementById(item.id);
      if (target) rootEl.scrollTo({ top: target.offsetTop - 64, behavior: "smooth" });
    });
    sheetListEl.appendChild(button);
  }
}

function openSheet() {
  sheetEl.hidden = false;
}

function closeSheet() {
  sheetEl.hidden = true;
}

function updateProgress() {
  frame = 0;
  const max = rootEl.scrollHeight - rootEl.clientHeight;
  const ratio = max > 0 ? Math.min(1, Math.max(0, rootEl.scrollTop / max)) : 0;
  progressEl.style.transform = `scaleX(${ratio})`;
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(updateProgress);
}

function observeFigure(figure, body) {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const svg = entry.target.querySelector("svg");
          if (entry.isIntersecting) entry.target.classList.add("dg-in");
          setPlaying(svg, entry.isIntersecting);
        }
      },
      { root: rootEl, rootMargin: "80px 0px", threshold: 0.12 },
    );
  }
  observer.observe(figure);
  rendered.push(body);
}

async function renderDiagrams(list, myToken) {
  try {
    await loadMermaid();
  } catch {
    for (const shell of list) showDiagramFallback(shell, "다이어그램 라이브러리를 불러오지 못했습니다");
    return;
  }
  for (const shell of list) {
    if (myToken !== token) return;
    const before = shell.figure.getBoundingClientRect();
    const above = before.bottom < rootEl.getBoundingClientRect().top;
    const beforeHeight = before.height;
    try {
      await renderDiagram(shell.source, shell.body);
      const zoom = shell.figure.querySelector(".dg-zoom");
      zoom.disabled = false;
      zoom.addEventListener("click", () => openModal(shell));
      observeFigure(shell.figure, shell.body);
      updateHint(shell);
    } catch {
      showDiagramFallback(shell, "이 다이어그램은 그릴 수 없어 원문을 보여 줍니다");
    }
    if (above) rootEl.scrollTop += shell.figure.getBoundingClientRect().height - beforeHeight;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

function updateHint(shell) {
  shell.figure.classList.toggle("scrollable", shell.body.classList.contains("scrollable"));
}

function showDiagramFallback(shell, message) {
  shell.body.replaceChildren();
  shell.body.appendChild(el("div", "dg-loading", message));
  const pre = el("pre", "dg-source");
  pre.textContent = shell.source;
  shell.body.appendChild(pre);
}

async function showPart(index) {
  if (index === current) return;
  current = index;
  token += 1;
  if (observer) observer.disconnect();
  observer = null;
  rendered = [];
  const result = renderPart(articleEl, parts[index], index, parts.length);
  toc = result.toc;
  updateBar();
  buildPager();
  buildSheet();
  rootEl.scrollTop = 0;
  updateProgress();
  history.replaceState(null, "", `#summary-${index + 1}`);
  await renderDiagrams(result.diagrams, token);
}

function relayout() {
  for (const body of rendered) {
    layoutDiagram(body);
    const figure = body.closest(".dg");
    if (figure) figure.classList.toggle("scrollable", body.classList.contains("scrollable"));
  }
}

function applyModalZoom() {
  if (!modalSvg) return;
  const natural = Number(modalSvg.dataset.w) || 600;
  modalSvg.style.width = `${Math.round(natural * modalZoom)}px`;
  modalZoomEl.textContent = `${Math.round(modalZoom * 100)}%`;
}

function openModal(shell) {
  const svg = shell.body.querySelector("svg");
  if (!svg) return;
  modalBodyEl.replaceChildren();
  modalSvg = svg.cloneNode(true);
  modalSvg.classList.add("dg-in", "dg-live");
  modalBodyEl.appendChild(modalSvg);
  modalTitleEl.textContent = shell.figure.querySelector(".dg-kind").textContent;
  modalEl.hidden = false;
  const natural = Number(modalSvg.dataset.w) || 600;
  modalZoom = Math.min(1.6, Math.max(0.6, (modalBodyEl.clientWidth - 24) / natural));
  applyModalZoom();
  modalSvg.unpauseAnimations();
}

function closeModal() {
  modalEl.hidden = true;
  modalBodyEl.replaceChildren();
  modalSvg = null;
}

function zoomBy(factor) {
  modalZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, modalZoom * factor));
  applyModalZoom();
}

function bindOnce() {
  tocButton.addEventListener("click", openSheet);
  document.getElementById("sum-sheet-close").addEventListener("click", closeSheet);
  sheetEl.addEventListener("click", (event) => {
    if (event.target === sheetEl) closeSheet();
  });
  document.getElementById("dgm-close").addEventListener("click", closeModal);
  document.getElementById("dgm-in").addEventListener("click", () => zoomBy(ZOOM_STEP));
  document.getElementById("dgm-out").addEventListener("click", () => zoomBy(1 / ZOOM_STEP));
  document.getElementById("dgm-fit").addEventListener("click", () => {
    if (!modalSvg) return;
    const natural = Number(modalSvg.dataset.w) || 600;
    modalZoom = Math.min(1.6, Math.max(ZOOM_MIN, (modalBodyEl.clientWidth - 24) / natural));
    applyModalZoom();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!modalEl.hidden) closeModal();
    else if (!sheetEl.hidden) closeSheet();
  });
  rootEl.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    relayout();
    updateProgress();
  });
  window.addEventListener("orientationchange", relayout);
}

let bound = false;

export async function openSummary(partIndex = 0) {
  if (!bound) {
    bindOnce();
    bound = true;
  }
  loadMermaid().catch(() => {});
  try {
    await loadParts();
  } catch {
    articleEl.replaceChildren(el("div", "sum-error", "요약본을 불러오지 못했습니다"));
    return;
  }
  if (partsEl.children.length === 0) buildBar();
  const safe = Math.min(parts.length - 1, Math.max(0, partIndex));
  if (current === -1) await showPart(safe);
  else if (safe !== current) await showPart(safe);
  else history.replaceState(null, "", `#summary-${current + 1}`);
}

export function closeSummary() {
  closeSheet();
  closeModal();
  if (observer) {
    for (const body of rendered) setPlaying(body.querySelector("svg"), false);
  }
}
