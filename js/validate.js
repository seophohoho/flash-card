const TYPES = ["multiple", "short", "essay"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function normalize(item) {
  if (item === null || typeof item !== "object") return null;
  if (!TYPES.includes(item.type)) return null;
  if (!isNonEmptyString(item.question)) return null;

  const explanation = typeof item.explanation === "string" ? item.explanation : "";

  if (item.type === "multiple") {
    const { choices, answer } = item;
    if (!Array.isArray(choices) || choices.length < 2) return null;
    if (!choices.every((c) => typeof c === "string")) return null;
    if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) {
      return null;
    }
    return {
      type: item.type,
      question: item.question,
      choices: [...choices],
      answer,
      explanation,
    };
  }

  if (!isNonEmptyString(item.answer)) return null;
  return {
    type: item.type,
    question: item.question,
    answer: item.answer,
    explanation,
  };
}

export function parseQuestions(raw) {
  if (!Array.isArray(raw)) {
    throw new Error("questions must be an array");
  }
  const questions = [];
  let skipped = 0;
  for (const item of raw) {
    const normalized = normalize(item);
    if (normalized) questions.push(normalized);
    else skipped += 1;
  }
  return { questions, skipped };
}
