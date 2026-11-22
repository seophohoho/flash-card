import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const BLANK = "____";
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const DIR_PATTERN = /^data_engineering2_(ws|hw)_(\d+)_(\d+)$/;
const TITLE_PATTERN = /^([IVX]+)\.\s*(.*?)\s*(?:[—–-]\s*)?(\d{3,5})\.\s*(.*)$/;

function normalize(text) {
  return text.replace(/\r\n?/g, "\n");
}

export function splitSections(markdown) {
  const sections = [{ title: "", lines: [] }];
  let inFence = false;
  for (const line of normalize(markdown).split("\n")) {
    if (line.trim().startsWith("```")) inFence = !inFence;
    const heading = !inFence && /^##\s+(.*)$/.exec(line);
    if (heading) sections.push({ title: heading[1].trim(), lines: [] });
    else sections[sections.length - 1].lines.push(line);
  }
  return sections.map((s) => ({ title: s.title, body: s.lines.join("\n").trim() }));
}

export function firstFence(body) {
  const lines = normalize(body).split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const open = /^```(\S*)\s*$/.exec(lines[i]);
    if (!open) continue;
    const text = [];
    i += 1;
    while (i < lines.length && lines[i].trim() !== "```") {
      text.push(lines[i]);
      i += 1;
    }
    return { lang: open[1], text: text.join("\n") };
  }
  return null;
}

function lcsPairs(a, b) {
  const same = (x, y) => a[x].trimEnd() === b[y].trimEnd();
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = same(i, j) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (same(i, j)) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1;
    else j += 1;
  }
  return pairs;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blankPattern(skeletonLine) {
  const body = skeletonLine.trim().split(BLANK).map(escapeRegExp).join("(.+?)");
  return new RegExp(`^\\s*${body}\\s*$`, "d");
}

function mergeRanges(ranges) {
  const sorted = ranges.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

export function findHighlights(skeleton, code) {
  const s = normalize(skeleton).split("\n");
  const f = normalize(code).split("\n");
  if (!s.some((line) => line.includes(BLANK))) return [];
  const starts = [];
  let offset = 0;
  for (const line of f) {
    starts.push(offset);
    offset += line.length + 1;
  }
  const anchors = [[-1, -1], ...lcsPairs(s, f), [s.length, f.length]];
  const ranges = [];
  for (let k = 0; k < anchors.length - 1; k += 1) {
    const [ps, pf] = anchors[k];
    const [ns, nf] = anchors[k + 1];
    const blanks = [];
    for (let si = ps + 1; si < ns; si += 1) if (s[si].includes(BLANK)) blanks.push(blankPattern(s[si]));
    if (blanks.length === 0) continue;
    const gapRanges = [];
    const unmatched = [];
    for (let fi = pf + 1; fi < nf; fi += 1) {
      if (f[fi].trim() === "") continue;
      let matched = null;
      for (const pattern of blanks) {
        matched = pattern.exec(f[fi]);
        if (matched) break;
      }
      if (!matched) {
        unmatched.push(fi);
        continue;
      }
      for (let g = 1; g < matched.length; g += 1) {
        const [a, b] = matched.indices[g];
        gapRanges.push([starts[fi] + a, starts[fi] + b]);
      }
    }
    ranges.push(...gapRanges);
    if (gapRanges.length === 0) {
      for (const fi of unmatched) {
        const lead = f[fi].length - f[fi].trimStart().length;
        ranges.push([starts[fi] + lead, starts[fi] + f[fi].trimEnd().length]);
      }
    }
  }
  return mergeRanges(ranges);
}

function tableHighlights(body, code) {
  const ranges = [];
  for (const row of body.split("\n").filter((line) => line.trim().startsWith("|"))) {
    const cells = row.split("|").map((c) => c.trim());
    const last = cells.filter(Boolean).pop() || "";
    const value = /^`([^`]+)`$/.exec(last);
    if (!value) continue;
    const at = code.indexOf(value[1]);
    if (at >= 0) ranges.push([at, at + value[1].length]);
  }
  return mergeRanges(ranges);
}

function parseTitle(readme, warn, id) {
  const first = normalize(readme).split("\n").find((line) => /^#\s+/.test(line)) || "";
  const text = first.replace(/^#\s+/, "").trim();
  const match = TITLE_PATTERN.exec(text);
  if (!match) {
    warn(`${id}: README 제목을 해석하지 못했습니다 (${text})`);
    return { part: 99, partName: "", number: "", title: text || id };
  }
  return { part: ROMAN[match[1]] || 99, partName: match[2].trim(), number: match[3], title: match[4].trim() };
}

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

export function parseProblem(dir, warn = () => {}) {
  const [, kindKey] = DIR_PATTERN.exec(basename(dir)) || [];
  const id = basename(dir).replace(/^data_engineering2_/, "");
  const readme = readOptional(join(dir, "README.md")) || "";
  const answer = readOptional(join(dir, "ANSWER.md")) || "";
  const skeleton = readOptional(join(dir, "skeleton", "skeleton.py"));
  const head = parseTitle(readme, warn, id);

  const description = normalize(readme)
    .split("\n")
    .slice(1)
    .filter((line) => !/^-\s*제출기한/.test(line))
    .join("\n")
    .trim();

  const sections = splitSections(answer).filter((s) => s.title !== "");
  const find = (pattern) => sections.find((s) => pattern.test(s.title));
  const blanksSection = find(/^빈칸/);
  const codeSection = find(/^완성 코드/);
  const outputSection = find(/^(실제 )?실행 출력$/);
  const conceptSection = find(/^핵심 개념/);
  const used = new Set([blanksSection, codeSection, outputSection, conceptSection]);

  const code = (codeSection && firstFence(codeSection.body)?.text) || "";
  if (!code) warn(`${id}: 완성 코드를 찾지 못했습니다`);
  const output = (outputSection && firstFence(outputSection.body)?.text) || "";
  if (outputSection && !output && outputSection.body) used.delete(outputSection);
  else if (!output) warn(`${id}: 실행 출력을 찾지 못했습니다`);

  let highlights = [];
  if (code && skeleton && skeleton.includes(BLANK)) highlights = findHighlights(skeleton, code);
  else if (code && blanksSection) highlights = tableHighlights(blanksSection.body, code);

  return {
    id,
    kind: kindKey === "hw" ? "과제" : "실습",
    ...head,
    description,
    code,
    highlights,
    output,
    concepts: conceptSection ? conceptSection.body : "",
    extra: sections.filter((s) => !used.has(s)).map((s) => ({ title: s.title, markdown: s.body })),
  };
}

export function buildExam(wsHwDir, warn = () => {}) {
  const warnings = [];
  const report = (message) => {
    warnings.push(message);
    warn(message);
  };
  const problems = readdirSync(wsHwDir)
    .filter((name) => DIR_PATTERN.test(name))
    .filter((name) => {
      const ok = existsSync(join(wsHwDir, name, "ANSWER.md")) && existsSync(join(wsHwDir, name, "README.md"));
      if (!ok) report(`${name}: README.md 또는 ANSWER.md가 없어 건너뜁니다`);
      return ok;
    })
    .map((name) => parseProblem(join(wsHwDir, name), report));
  const order = (p) => {
    const [, kind, a, b] = /^(ws|hw)_(\d+)_(\d+)$/.exec(p.id);
    return [p.part, kind === "ws" ? 0 : 1, Number(a), Number(b)];
  };
  problems.sort((x, y) => {
    const ox = order(x);
    const oy = order(y);
    for (let i = 0; i < ox.length; i += 1) if (ox[i] !== oy[i]) return ox[i] - oy[i];
    return 0;
  });
  return { problems, warnings };
}
