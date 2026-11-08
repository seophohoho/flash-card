export function shuffle(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createDeck(questions, rng = Math.random) {
  let all = shuffle(questions, rng);
  let currentFilter = "all";
  let position = 0;

  const cards = () =>
    currentFilter === "all"
      ? all
      : all.filter((card) => card.type === currentFilter);

  const countOf = (type) => all.filter((card) => card.type === type).length;

  return {
    cards,
    current: () => cards()[position],
    index: () => position,
    total: () => cards().length,
    remaining: () => cards().length - position - 1,
    filter: () => currentFilter,
    counts: () => ({
      all: all.length,
      multiple: countOf("multiple"),
      short: countOf("short"),
      essay: countOf("essay"),
    }),
    setFilter(next) {
      const available = next === "all" ? all.length : countOf(next);
      if (available === 0) return false;
      currentFilter = next;
      position = 0;
      return true;
    },
    next() {
      if (position < cards().length - 1) {
        position += 1;
        return "moved";
      }
      all = shuffle(all, rng);
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
