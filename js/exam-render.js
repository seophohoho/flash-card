import { parseBlocks } from "./markdown.js";
import { highlightPython } from "./highlight.js";
import { renderInline, renderList, renderTable, renderCode } from "./summary-render.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderBlocks(parent, markdown) {
  for (const block of parseBlocks(markdown)) {
    if (block.type === "heading") {
      const level = block.level <= 2 ? "h3" : "h4";
      parent.appendChild(el(level, "", block.text));
    } else if (block.type === "paragraph") {
      const p = el("p");
      renderInline(p, block.text);
      parent.appendChild(p);
    } else if (block.type === "quote") {
      const q = el("blockquote", "callout note");
      renderInline(q, block.text);
      parent.appendChild(q);
    } else if (block.type === "list") {
      parent.appendChild(renderList(block));
    } else if (block.type === "table") {
      parent.appendChild(renderTable(block));
    } else if (block.type === "code") {
      parent.appendChild(renderCode({ ...block, lang: block.lang === "mermaid" ? "text" : block.lang }));
    }
  }
}

function cutPoints(highlights) {
  const points = new Set();
  for (const [a, b] of highlights) {
    points.add(a);
    points.add(b);
  }
  return [...points].sort((x, y) => x - y);
}

function pieces(start, end, points) {
  const result = [];
  let from = start;
  for (const point of points) {
    if (point <= from || point >= end) continue;
    result.push([from, point]);
    from = point;
  }
  result.push([from, end]);
  return result;
}

export function renderAnswerCode(code, highlights) {
  const box = el("div", "code-card");
  const head = el("div", "code-head");
  for (let i = 0; i < 3; i += 1) head.appendChild(el("span", "dot"));
  if (highlights.length > 0) head.appendChild(el("span", "ans-legend", "노란 칸 = 빈칸 정답"));
  head.appendChild(el("span", "code-lang", "python"));
  box.appendChild(head);
  const pre = el("pre");
  const codeEl = el("code");
  const points = cutPoints(highlights);
  let position = 0;
  for (const token of highlightPython(code)) {
    for (const [a, b] of pieces(position, position + token.text.length, points)) {
      const text = code.slice(a, b);
      const base = token.cls ? el("span", token.cls, text) : document.createTextNode(text);
      const inside = highlights.some(([from, to]) => a >= from && b <= to);
      if (inside) {
        const mark = el("span", "hl-ans");
        mark.appendChild(base);
        codeEl.appendChild(mark);
      } else codeEl.appendChild(base);
    }
    position += token.text.length;
  }
  pre.appendChild(codeEl);
  box.appendChild(pre);
  return box;
}

function renderOutput(output) {
  const box = el("div", "code-card");
  const head = el("div", "code-head");
  for (let i = 0; i < 3; i += 1) head.appendChild(el("span", "dot"));
  head.appendChild(el("span", "code-lang", "output"));
  box.appendChild(head);
  const pre = el("pre");
  pre.appendChild(el("code", "", output));
  box.appendChild(pre);
  return box;
}

function section(title) {
  const sec = el("section", "sec");
  sec.appendChild(el("h2", "", title));
  return sec;
}

export function renderExam(container, problem, index, total) {
  container.replaceChildren();
  const hero = el("header", "hero");
  hero.appendChild(el("div", "hero-tag", `${problem.kind} ${problem.id.slice(3).replace("_", "-")} · ${problem.partName || "월말 평가"}`));
  hero.appendChild(el("h1", "hero-title", problem.title));
  hero.appendChild(el("p", "hero-sub", `${index + 1} / ${total}`));
  container.appendChild(hero);

  if (problem.description) {
    const details = el("details", "exam-desc");
    details.appendChild(el("summary", "", "문제 설명 보기"));
    const body = el("div", "exam-desc-body");
    renderBlocks(body, problem.description);
    details.appendChild(body);
    container.appendChild(details);
  }

  if (problem.code) {
    const sec = section("정답 코드");
    sec.appendChild(renderAnswerCode(problem.code, problem.highlights));
    container.appendChild(sec);
  }
  if (problem.output) {
    const sec = section("실행 출력");
    sec.appendChild(renderOutput(problem.output));
    container.appendChild(sec);
  }
  if (problem.concepts) {
    const sec = section("핵심 개념");
    renderBlocks(sec, problem.concepts);
    container.appendChild(sec);
  }
  for (const extra of problem.extra) {
    const sec = section(extra.title);
    renderBlocks(sec, extra.markdown);
    container.appendChild(sec);
  }
}
