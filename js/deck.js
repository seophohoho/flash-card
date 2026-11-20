export const SUBJECTS = [
  ["flink", "Flink"],
  ["spark", "Spark"],
];

export function subjectOf(card) {
  if (!card.source) return null;
  const lower = card.source.toLowerCase();
  const found = SUBJECTS.find(([key]) => lower.includes(`_${key}_`));
  return found ? found[0] : null;
}

export function shuffle(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createDeck(questions, rng = Math.random) {
  const original = [...questions];
  const subjects = new Map(original.map((card) => [card, subjectOf(card)]));
  let shuffled = shuffle(original, rng);
  let currentFilter = "all";
  let currentSubject = "all";
  let ordered = false;
  let position = 0;

  const base = () => (ordered ? original : shuffled);
  const bySubject = (card, subject) =>
    subject === "all" || subjects.get(card) === subject;
  const byType = (card, type) => type === "all" || card.type === type;

  const cards = () =>
    base().filter(
      (card) =>
        byType(card, currentFilter) && bySubject(card, currentSubject),
    );

  const countOf = (type) =>
    original.filter(
      (card) => byType(card, type) && bySubject(card, currentSubject),
    ).length;

  const subjectCountOf = (subject) =>
    original.filter(
      (card) => byType(card, currentFilter) && bySubject(card, subject),
    ).length;

  return {
    cards,
    current: () => cards()[position],
    index: () => position,
    total: () => cards().length,
    remaining: () => cards().length - position - 1,
    filter: () => currentFilter,
    subject: () => currentSubject,
    isOrdered: () => ordered,
    counts: () => ({
      all: countOf("all"),
      multiple: countOf("multiple"),
      short: countOf("short"),
      essay: countOf("essay"),
    }),
    subjectCounts: () => ({
      all: subjectCountOf("all"),
      ...Object.fromEntries(
        SUBJECTS.map(([key]) => [key, subjectCountOf(key)]),
      ),
    }),
    setFilter(next) {
      if (countOf(next) === 0) return false;
      currentFilter = next;
      position = 0;
      return true;
    },
    setSubject(next) {
      if (subjectCountOf(next) === 0) return false;
      currentSubject = next;
      position = 0;
      return true;
    },
    setOrdered(next) {
      ordered = next;
      if (!ordered) shuffled = shuffle(original, rng);
      position = 0;
    },
    next() {
      if (position < cards().length - 1) {
        position += 1;
        return "moved";
      }
      if (!ordered) shuffled = shuffle(shuffled, rng);
      position = 0;
      return "restarted";
    },
    prev() {
      if (position === 0) return "stay";
      position -= 1;
      return "moved";
    },
  };
}
