const SWIPE_THRESHOLD = 50;

export function classifySwipe(dx, dy) {
  const horizontal = Math.abs(dx);
  if (horizontal <= SWIPE_THRESHOLD || horizontal <= Math.abs(dy)) return null;
  return dx < 0 ? "next" : "prev";
}

export function keyToDirection(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === "ArrowRight") return "next";
  if (event.key === "ArrowLeft") return "prev";
  return null;
}

export function isToggleKey(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return false;
  return event.key === "ArrowDown";
}

export function bindInput(swipeTarget, onNavigate, onToggle) {
  document.addEventListener("keydown", (event) => {
    const direction = keyToDirection(event);
    if (direction) {
      onNavigate(direction);
      return;
    }
    if (onToggle && isToggleKey(event)) {
      event.preventDefault();
      onToggle();
    }
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
