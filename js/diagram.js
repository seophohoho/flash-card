const SRC = "vendor/mermaid.min.js";
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const MIN_SCALE = 0.62;
const SEQUENCE_STEP = 0.85;

let loader = null;
let counter = 0;

const reducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function configure(mermaid) {
  const font = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    fontFamily: font,
    themeVariables: {
      darkMode: true,
      fontFamily: font,
      fontSize: "15px",
      background: "#1d1b18",
      textColor: "#f4efe2",
      primaryColor: "#3a2a1c",
      primaryBorderColor: "#ff9a4d",
      primaryTextColor: "#f4efe2",
      secondaryColor: "#1c3a2c",
      secondaryBorderColor: "#4cc38a",
      secondaryTextColor: "#f4efe2",
      tertiaryColor: "#26231f",
      tertiaryBorderColor: "#5b5244",
      tertiaryTextColor: "#f4efe2",
      lineColor: "#d8cdb0",
      clusterBkg: "#26231f",
      clusterBorder: "#6b6150",
      titleColor: "#f4efe2",
      edgeLabelBackground: "#1d1b18",
      actorBkg: "#e8590c",
      actorBorder: "#ff9a4d",
      actorTextColor: "#ffffff",
      actorLineColor: "#6b6150",
      signalColor: "#e9e2cf",
      signalTextColor: "#f4efe2",
      labelBoxBkgColor: "#26231f",
      labelBoxBorderColor: "#6b6150",
      labelTextColor: "#f4efe2",
      loopTextColor: "#f4efe2",
      noteBkgColor: "#3a3226",
      noteBorderColor: "#c9a24b",
      noteTextColor: "#f4efe2",
      sectionBkgColor: "#26231f",
      altSectionBkgColor: "#1d1b18",
      sectionBkgColor2: "#26231f",
      taskBkgColor: "#2f9e6e",
      taskBorderColor: "#4cc38a",
      taskTextColor: "#ffffff",
      taskTextLightColor: "#ffffff",
      taskTextDarkColor: "#ffffff",
      taskTextOutsideColor: "#f4efe2",
      taskTextClickableColor: "#f4efe2",
      activeTaskBkgColor: "#e8590c",
      activeTaskBorderColor: "#ff9a4d",
      doneTaskBkgColor: "#6b6150",
      doneTaskBorderColor: "#8d867a",
      gridColor: "#4a4338",
      todayLineColor: "#ff9a4d",
    },
    flowchart: { useMaxWidth: false, htmlLabels: true, curve: "basis", padding: 14, nodeSpacing: 40, rankSpacing: 50 },
    sequence: { useMaxWidth: false, mirrorActors: false, showSequenceNumbers: false, actorMargin: 40 },
    gantt: { useMaxWidth: false, barHeight: 26, fontSize: 13, sectionFontSize: 14, leftPadding: 90 },
  });
}

export function loadMermaid() {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (window.mermaid) {
      configure(window.mermaid);
      resolve(window.mermaid);
      return;
    }
    const script = document.createElement("script");
    script.src = SRC;
    script.onload = () => {
      configure(window.mermaid);
      resolve(window.mermaid);
    };
    script.onerror = () => {
      loader = null;
      reject(new Error("mermaid load failed"));
    };
    document.head.appendChild(script);
  });
  return loader;
}

export function diagramKind(source) {
  const first = source.trim().split(/\s+/)[0] || "";
  if (first.startsWith("flowchart") || first === "graph") return "flowchart";
  if (first === "sequenceDiagram") return "sequence";
  if (first === "gantt") return "gantt";
  return "other";
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function makePacket() {
  const group = svgEl("g", { class: "dg-packet", opacity: "0" });
  group.appendChild(svgEl("circle", { class: "dg-halo", r: "11" }));
  group.appendChild(svgEl("circle", { class: "dg-dot", r: "4.6" }));
  return group;
}

function motion(group, attrs, pathRef) {
  const m = svgEl("animateMotion", { ...attrs, repeatCount: "indefinite", rotate: "0" });
  if (pathRef) {
    const mpath = svgEl("mpath");
    mpath.setAttribute("href", `#${pathRef}`);
    mpath.setAttributeNS(XLINK_NS, "xlink:href", `#${pathRef}`);
    m.appendChild(mpath);
  }
  group.appendChild(m);
}

function fade(group, values, keyTimes, dur, begin = "0s") {
  group.appendChild(
    svgEl("animate", {
      attributeName: "opacity",
      values,
      keyTimes,
      dur: `${dur}s`,
      begin,
      repeatCount: "indefinite",
    }),
  );
}

function animateFlowchart(svg) {
  const paths = svg.querySelectorAll("path.flowchart-link");
  paths.forEach((path, i) => {
    if (!path.id) path.id = `${svg.id}-edge-${i}`;
    let length = 120;
    try {
      length = path.getTotalLength();
    } catch {
      length = 120;
    }
    const dur = Math.min(4, Math.max(1.5, length / 85));
    const begin = `${((i * 0.37) % 2.2).toFixed(2)}s`;
    const packet = makePacket();
    motion(packet, { dur: `${dur}s`, begin }, path.id);
    fade(packet, "0;1;1;0", "0;0.12;0.88;1", dur, begin);
    path.parentNode.appendChild(packet);
  });
}

function animateSequence(svg) {
  const lines = [...svg.querySelectorAll(".messageLine0, .messageLine1")];
  if (lines.length === 0) return;
  const total = lines.length * SEQUENCE_STEP + 1.6;
  lines.forEach((line, i) => {
    const a = (i * SEQUENCE_STEP) / total;
    const b = ((i + 1) * SEQUENCE_STEP) / total;
    const packet = makePacket();
    const attrs = {
      dur: `${total}s`,
      calcMode: "linear",
      keyPoints: "0;0;1;1",
      keyTimes: `0;${a.toFixed(4)};${b.toFixed(4)};1`,
    };
    if (line.tagName.toLowerCase() === "line") {
      const d = `M ${line.getAttribute("x1")} ${line.getAttribute("y1")} L ${line.getAttribute("x2")} ${line.getAttribute("y2")}`;
      motion(packet, { ...attrs, path: d });
    } else {
      if (!line.id) line.id = `${svg.id}-msg-${i}`;
      motion(packet, attrs, line.id);
    }
    const t = (n) => Math.min(1, Math.max(0, n)).toFixed(4);
    fade(packet, "0;0;1;1;0;0", `0;${t(a)};${t(a + 0.0001)};${t(b)};${t(b + 0.0001)};1`, total);
    line.parentNode.appendChild(packet);
  });
}

function staggerReveal(svg, kind) {
  const selector =
    kind === "gantt"
      ? "rect[class*='task'], text[class*='task']"
      : "g.node, g.cluster, rect.actor, text.actor";
  svg.querySelectorAll(selector).forEach((node, i) => {
    node.classList.add("dg-reveal");
    node.style.setProperty("--i", String(i));
  });
}

function colorize(svg, kind) {
  const selector = kind === "sequence" ? "rect.actor" : kind === "flowchart" ? "g.node" : null;
  if (!selector) return;
  svg.querySelectorAll(selector).forEach((node, i) => node.classList.add(`dg-c${i % 4}`));
}

function enhance(svg, kind) {
  svg.classList.add("dg-svg", `dg-${kind}`);
  colorize(svg, kind);
  staggerReveal(svg, kind);
  if (reducedMotion()) return;
  if (kind === "flowchart") animateFlowchart(svg);
  else if (kind === "sequence") animateSequence(svg);
}

export async function renderDiagram(source, body) {
  const mermaid = await loadMermaid();
  counter += 1;
  const id = `dg-${counter}`;
  const { svg } = await mermaid.render(id, source);
  body.innerHTML = svg;
  const node = body.querySelector("svg");
  node.id = id;
  const kind = diagramKind(source);
  const box = node.viewBox.baseVal;
  node.dataset.w = String(box && box.width ? box.width : node.getBoundingClientRect().width);
  node.removeAttribute("height");
  node.style.maxWidth = "none";
  enhance(node, kind);
  node.pauseAnimations();
  layoutDiagram(body);
  return node;
}

export function layoutDiagram(body) {
  const svg = body.querySelector("svg");
  if (!svg) return;
  const natural = Number(svg.dataset.w) || svg.getBoundingClientRect().width;
  const avail = Math.max(1, body.clientWidth - 2);
  const scale = Math.min(1, Math.max(MIN_SCALE, avail / natural));
  svg.style.width = `${Math.round(natural * scale)}px`;
  svg.style.height = "auto";
  body.classList.toggle("scrollable", natural * scale > avail + 2);
}

export function setPlaying(svg, playing) {
  if (!svg) return;
  svg.classList.toggle("dg-live", playing);
  if (playing) svg.unpauseAnimations();
  else svg.pauseAnimations();
}
