import { parseRichText } from "./format.js";

const TYPE_LABELS = {
  multiple: "객관식",
  short: "단답형",
  essay: "주관식",
};

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function renderRichText(parent, text) {
  for (const segment of parseRichText(text)) {
    if (segment.type === "text") {
      parent.appendChild(document.createTextNode(segment.value));
    } else if (segment.type === "inline-code") {
      const code = el("code");
      code.textContent = segment.value;
      parent.appendChild(code);
    } else {
      const pre = el("pre");
      const code = el("code");
      code.textContent = segment.value;
      pre.appendChild(code);
      parent.appendChild(pre);
    }
  }
}

export function renderCard(container, question, onToggle) {
  container.replaceChildren();

  const label = el("div", "type");
  label.textContent = TYPE_LABELS[question.type];
  container.appendChild(label);

  const q = el("div", "q");
  renderRichText(q, question.question);
  container.appendChild(q);

  const isMultiple = question.type === "multiple";
  const choiceEls = [];
  if (isMultiple) {
    const list = el("div", "choices");
    question.choices.forEach((choice, i) => {
      const item = el("div", i === question.answer ? "choice correct" : "choice");
      item.appendChild(document.createTextNode(`${i + 1}. `));
      renderRichText(item, choice);
      list.appendChild(item);
      choiceEls.push(item);
    });
    container.appendChild(list);
  }

  const toggle = el("button", "toggle");
  toggle.type = "button";
  toggle.textContent = "▼ 펼치기";
  toggle.setAttribute("aria-expanded", "false");
  container.appendChild(toggle);

  const answer = el("div", "answer");
  const main = el("div", "answer-main");
  main.appendChild(document.createTextNode("정답: "));
  renderRichText(
    main,
    isMultiple
      ? `${question.answer + 1}. ${question.choices[question.answer]}`
      : question.answer,
  );
  answer.appendChild(main);
  if (question.explanation) {
    const exp = el("div", "exp");
    renderRichText(exp, question.explanation);
    answer.appendChild(exp);
  }
  container.appendChild(answer);

  toggle.addEventListener("click", () => {
    const open = answer.classList.toggle("open");
    toggle.textContent = open ? "▲ 접기" : "▼ 펼치기";
    toggle.setAttribute("aria-expanded", String(open));
    for (const item of choiceEls) {
      if (item.classList.contains("correct")) {
        item.classList.toggle("shown", open);
      }
    }
    if (onToggle) onToggle();
  });
}
