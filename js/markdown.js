const FENCE = /^```\s*([^`\s]*)\s*$/;
const HEADING = /^(#{1,4})\s+(.*?)\s*#*\s*$/;
const HR = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const BULLET = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function isTableStart(lines, i) {
  return (
    lines[i].trim().startsWith("|") &&
    i + 1 < lines.length &&
    lines[i + 1].includes("-") &&
    TABLE_SEPARATOR.test(lines[i + 1])
  );
}

function splitRow(line) {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);
  const cells = [];
  let current = "";
  let inCode = false;
  for (const ch of text) {
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function startsBlock(lines, i) {
  const line = lines[i];
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    HR.test(line) ||
    BULLET.test(line) ||
    line.startsWith(">") ||
    isTableStart(lines, i)
  );
}

function indentOf(text) {
  return text.length;
}

function buildList(entries, start, baseIndent) {
  const list = { type: "list", ordered: /^\d/.test(entries[start].marker), items: [] };
  let i = start;
  while (i < entries.length) {
    const entry = entries[i];
    if (indentOf(entry.indent) < baseIndent) break;
    if (indentOf(entry.indent) > baseIndent) {
      const last = list.items[list.items.length - 1];
      if (!last) break;
      const [child, next] = buildList(entries, i, indentOf(entry.indent));
      last.children.push(child);
      i = next;
      continue;
    }
    list.items.push({ text: entry.text, children: [] });
    i += 1;
  }
  return [list, i];
}

export function parseBlocks(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const body = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== "```") {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", lang: fence[1], text: body.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      const header = splitRow(lines[i]);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (line.startsWith(">")) {
      const body = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: body.join(" ") });
      continue;
    }

    if (BULLET.test(line)) {
      const entries = [];
      while (i < lines.length && BULLET.test(lines[i])) {
        const m = BULLET.exec(lines[i]);
        entries.push({ indent: m[1], marker: m[2], text: m[3] });
        i += 1;
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          /^\s+\S/.test(lines[i]) &&
          !BULLET.test(lines[i]) &&
          !FENCE.test(lines[i].trim())
        ) {
          entries[entries.length - 1].text += ` ${lines[i].trim()}`;
          i += 1;
        }
      }
      const baseIndent = indentOf(entries[0].indent);
      let cursor = 0;
      while (cursor < entries.length) {
        const [list, next] = buildList(entries, cursor, baseIndent);
        blocks.push(list);
        cursor = next > cursor ? next : cursor + 1;
      }
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() !== "" && (paragraph.length === 0 || !startsBlock(lines, i))) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

export function splitParts(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const parts = [];
  let inFence = false;
  for (const line of lines) {
    if (FENCE.test(line) || line.trim() === "```") inFence = !inFence;
    const h1 = !inFence && /^#\s+(.*)$/.exec(line);
    if (h1) {
      parts.push({ title: h1[1].trim(), lines: [] });
      continue;
    }
    if (parts.length > 0) parts[parts.length - 1].lines.push(line);
  }
  return parts.map((part) => ({ title: part.title, markdown: part.lines.join("\n") }));
}

export function parseInline(text) {
  const segments = [];
  const pattern = /`([^`\n]+)`|\*\*([^*]+?)\*\*|<br\s*\/?>/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) segments.push({ type: "text", value: text.slice(last, match.index) });
    if (match[1] !== undefined) segments.push({ type: "code", value: match[1] });
    else if (match[2] !== undefined) segments.push({ type: "bold", value: match[2] });
    else segments.push({ type: "br" });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments;
}
