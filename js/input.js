const SWIPE_THRESHOLD = 50;

export function classifySwipe(dx, dy) {
  const horizontal = Math.abs(dx);
  if (horizontal <= SWIPE_THRESHOLD || horizontal <= Math.abs(dy)) return null;
  return dx < 0 ? "next" : "prev";
}

export function bindInput(swipeTarget, onNavigate) {
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") onNavigate("next");
    else if (event.key === "ArrowLeft") onNavigate("prev");
  });

  let start = null;

  swipeTarget.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) {
        start = null;
        return;
      }
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
    },
    { passive: true },
  );

  swipeTarget.addEventListener("touchend", (event) => {
    if (start === null) return;
    const touch = event.changedTouches[0];
    const direction = classifySwipe(touch.clientX - start.x, touch.clientY - start.y);
    start = null;
    if (direction) onNavigate(direction);
  });

  swipeTarget.addEventListener("touchcancel", () => {
    start = null;
  });
}
