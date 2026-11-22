import { parseBlocks, parseInline } from "./markdown.js";
import { highlightPython } from "./highlight.js";
import { diagramKind } from "./diagram.js";

const KIND_LABELS = {
  flowchart: "흐름도",
  sequence: "시퀀스",
  gantt: "타임라인",
  other: "다이어그램",
};

const CONCLUSION = /^\*\*결론[:：]?\*\*\s*/;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function appendText(parent, value) {
  const pieces = value.split(/(\(보충\))/);
  for (const piece of pieces) {
    if (piece === "(보충)") parent.appendChild(el("span", "tag", "보충"));
    else if (piece) parent.appendChild(document.createTextNode(piece));
  }
}

export function renderInline(parent, text) {
  for (const seg of parseInline(text)) {
    if (seg.type === "text") appendText(parent, seg.value);
    else if (seg.type === "code") parent.appendChild(el("code", "", seg.value));
    else if (seg.type === "bold") {
      const strong = el("strong");
      renderInline(strong, seg.value);
      parent.appendChild(strong);
    } else parent.appendChild(document.createElement("br"));
  }
}

export function renderList(list) {
  const root = el(list.ordered ? "ol" : "ul");
  for (const item of list.items) {
    const li = el("li");
    if (item.text.startsWith("(보충)")) li.classList.add("suppl");
    renderInline(li, item.text);
    for (const child of item.children) li.appendChild(renderList(child));
    root.appendChild(li);
  }
  return root;
}

export function renderTable(block) {
  const wrap = el("div", "table-wrap");
  const table = el("table");
  const thead = el("thead");
  const headRow = el("tr");
  for (const cell of block.header) {
    const th = el("th");
    renderInline(th, cell);
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = el("tbody");
  for (const row of block.rows) {
    const tr = el("tr");
    for (const cell of row) {
      const td = el("td");
      renderInline(td, cell);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

export function renderCode(block) {
  const box = el("div", "code-card");
  const head = el("div", "code-head");
  head.appendChild(el("span", "dot"));
  head.appendChild(el("span", "dot"));
  head.appendChild(el("span", "dot"));
  head.appendChild(el("span", "code-lang", block.lang || "text"));
  box.appendChild(head);
  const pre = el("pre");
  const code = el("code");
  if (block.lang === "python") {
    for (const part of highlightPython(block.text)) {
      if (part.cls) code.appendChild(el("span", part.cls, part.text));
      else code.appendChild(document.createTextNode(part.text));
    }
  } else {
    code.textContent = block.text;
  }
  pre.appendChild(code);
  box.appendChild(pre);
  return box;
}

function renderDiagramShell(block) {
  const kind = diagramKind(block.text);
  const figure = el("figure", "dg");
  figure.dataset.kind = kind;
  const head = el("div", "dg-head");
  head.appendChild(el("span", "dg-badge", "DIAGRAM"));
  head.appendChild(el("span", "dg-kind", KIND_LABELS[kind]));
  head.appendChild(el("span", "dg-hint", "← 좌우로 밀어서 보기"));
  const zoom = el("button", "dg-zoom", "⤢ 크게");
  zoom.type = "button";
  zoom.disabled = true;
  head.appendChild(zoom);
  figure.appendChild(head);
  const body = el("div", "dg-body");
  body.appendChild(el("div", "dg-loading", "다이어그램을 그리는 중…"));
  figure.appendChild(body);
  return { figure, body, source: block.text };
}

function renderHeading(block, state) {
  const tag = `h${block.level}`;
  const node = el(tag);
  const numbered =
    block.level === 2
      ? /^(\d+)\.\s*(.*)$/.exec(block.text)
      : block.level === 3
        ? /^(\d+(?:-\d+)+)\.\s*(.*)$/.exec(block.text)
        : null;
  if (numbered) {
    node.appendChild(el("span", "num", numbered[1]));
    node.appendChild(el("span", "ttl", numbered[2]));
  } else {
    node.appendChild(el("span", "ttl", block.text));
  }
  if (block.level === 2) {
    node.id = `sec-${state.toc.length}`;
    state.toc.push({ id: node.id, number: numbered ? numbered[1] : "", text: numbered ? numbered[2] : block.text });
    state.section = el("section", "sec");
    state.article.appendChild(state.section);
  }
  return node;
}

function isConclusion(text) {
  return CONCLUSION.test(text);
}

function renderConclusion(text) {
  const box = el("div", "callout conclusion");
  box.appendChild(el("div", "callout-label", "결론"));
  const body = el("div", "callout-body");
  renderInline(body, text.replace(CONCLUSION, ""));
  box.appendChild(body);
  return box;
}

export function renderPartHero(part, index, total) {
  const hero = el("header", "hero");
  const match = /^(.*?)\s*\((\d+)\/(\d+)\)\s*(?:[-–—]\s*(.*))?$/.exec(part.title);
  hero.appendChild(el("div", "hero-tag", `PART ${match ? match[2] : index + 1} / ${match ? match[3] : total}`));
  hero.appendChild(el("h1", "hero-title", match ? match[1] : part.title));
  if (match && match[4]) hero.appendChild(el("p", "hero-sub", match[4]));
  return hero;
}

export function renderPart(container, part, index, total) {
  container.replaceChildren();
  container.appendChild(renderPartHero(part, index, total));
  const state = { toc: [], diagrams: [], article: container, section: null };
  const intro = el("section", "sec intro");
  container.appendChild(intro);
  state.section = intro;

  for (const block of parseBlocks(part.markdown)) {
    const target = state.section;
    if (block.type === "heading") {
      const node = renderHeading(block, state);
      (block.level === 2 ? state.section : target).appendChild(node);
    } else if (block.type === "paragraph") {
      if (isConclusion(block.text)) target.appendChild(renderConclusion(block.text));
      else {
        const p = el("p");
        renderInline(p, block.text);
        target.appendChild(p);
      }
    } else if (block.type === "quote") {
      const q = el("blockquote", "callout note");
      renderInline(q, block.text);
      target.appendChild(q);
    } else if (block.type === "list") {
      target.appendChild(renderList(block));
    } else if (block.type === "table") {
      target.appendChild(renderTable(block));
    } else if (block.type === "hr") {
      continue;
    } else if (block.type === "code") {
      if (block.lang === "mermaid") {
        const shell = renderDiagramShell(block);
        state.diagrams.push(shell);
        target.appendChild(shell.figure);
      } else {
        target.appendChild(renderCode(block));
      }
    }
  }

  if (intro.children.length === 0) intro.remove();
  return { toc: state.toc, diagrams: state.diagrams };
}
