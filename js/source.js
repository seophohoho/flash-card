const SOURCE_LINE = /(?:^|\n+)출처:[ \t]*(\S[^\n]*?)[ \t]*\s*$/;

export function extractSource(text) {
  const match = SOURCE_LINE.exec(text);
  if (!match) return { explanation: text, source: null };
  return { explanation: text.slice(0, match.index), source: match[1] };
}
