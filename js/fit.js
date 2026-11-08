export const MIN_SCALE = 0.6;

const MAX_PASSES = 5;
const TOLERANCE_PX = 0.5;

export function pickScale(contentHeight, availableHeight, minScale = MIN_SCALE) {
  if (contentHeight <= availableHeight) return 1;
  const ratio = availableHeight / contentHeight;
  return Math.min(1, Math.max(minScale, ratio));
}

export function getAvailableHeight(stageEl) {
  const style = getComputedStyle(stageEl);
  const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  return stageEl.clientHeight - padding;
}

export function fitCard(cardEl, availableHeight) {
  cardEl.classList.remove("scrollable");
  cardEl.style.maxHeight = "";
  cardEl.style.setProperty("--scale", "1");

  let height = cardEl.offsetHeight;
  let scale = pickScale(height, availableHeight);
  cardEl.style.setProperty("--scale", String(scale));

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    height = cardEl.offsetHeight;
    if (height <= availableHeight + TOLERANCE_PX || scale <= MIN_SCALE) break;
    scale = Math.max(MIN_SCALE, scale * (availableHeight / height));
    cardEl.style.setProperty("--scale", String(scale));
  }

  height = cardEl.offsetHeight;
  if (height > availableHeight + TOLERANCE_PX) {
    cardEl.classList.add("scrollable");
    cardEl.style.maxHeight = `${availableHeight}px`;
  }
}
