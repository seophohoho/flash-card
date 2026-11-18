const KEYWORDS = new Set([
  "def", "class", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or",
  "import", "from", "as", "with", "try", "except", "finally", "raise", "lambda", "pass",
  "break", "continue", "yield", "None", "True", "False", "is", "global", "async", "await",
]);

const BUILTINS = new Set([
  "print", "len", "range", "int", "str", "float", "list", "dict", "set", "tuple", "self",
  "super", "isinstance", "open", "sum", "min", "max", "sorted", "enumerate", "zip", "map", "filter",
]);

const TOKEN =
  /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|[fFrRbB]{0,2}"(?:\\.|[^"\\\n])*"|[fFrRbB]{0,2}'(?:\\.|[^'\\\n])*')|(@[A-Za-z_][\w.]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;

export function highlightPython(code) {
  const out = [];
  let last = 0;
  let previousWord = "";
  for (const match of code.matchAll(TOKEN)) {
    if (match.index > last) out.push({ text: code.slice(last, match.index), cls: null });
    const text = match[0];
    let cls = null;
    if (match[1] !== undefined) cls = "hl-com";
    else if (match[2] !== undefined) cls = "hl-str";
    else if (match[3] !== undefined) cls = "hl-dec";
    else if (match[4] !== undefined) cls = "hl-num";
    else {
      const next = code[match.index + text.length];
      if (KEYWORDS.has(text)) cls = "hl-kw";
      else if (previousWord === "def" || previousWord === "class") cls = "hl-fn";
      else if (BUILTINS.has(text)) cls = "hl-bi";
      else if (next === "(") cls = "hl-call";
      previousWord = text;
    }
    if (match[5] === undefined) previousWord = "";
    out.push({ text, cls });
    last = match.index + text.length;
  }
  if (last < code.length) out.push({ text: code.slice(last), cls: null });
  return out;
}
