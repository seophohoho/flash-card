const OPEN_FENCE = /^```[^`\s]*\s*$/;
const INLINE_CODE = /`([^`\n]+)`/g;

function isClosingFence(line) {
  return line.trim() === "```";
}

function splitInline(text) {
  const segments = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_CODE)) {
    if (match.index > last) {
      segments.push({ type: "text", value: text.slice(last, match.index) });
    }
    segments.push({ type: "inline-code", value: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }
  return segments;
}

export function parseRichText(text) {
  const lines = text.split("\n");
  const segments = [];
  let pending = [];

  const flushText = () => {
    if (pending.length === 0) return;
    const joined = pending.join("\n");
    pending = [];
    if (joined !== "") segments.push(...splitInline(joined));
  };

  let i = 0;
  while (i < lines.length) {
    if (OPEN_FENCE.test(lines[i])) {
      let close = -1;
      for (let j = i + 1; j < lines.length; j += 1) {
        if (isClosingFence(lines[j])) {
          close = j;
          break;
        }
      }
      if (close !== -1) {
        flushText();
        segments.push({
          type: "code-block",
          value: lines.slice(i + 1, close).join("\n"),
        });
        i = close + 1;
        continue;
      }
      flushText();
      segments.push({ type: "text", value: lines.slice(i).join("\n") });
      return segments;
    }
    pending.push(lines[i]);
    i += 1;
  }
  flushText();
  return segments;
}
