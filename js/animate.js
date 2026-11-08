const OUT_MS = 260;
const BACK_MS = 260;
const TILT_DEG = 7;
const LIFT_PX = -6;

export function slideShift(dir, cardWidth, viewportWidth) {
  const size = Math.min(cardWidth * 0.62, viewportWidth * 0.55);
  return dir === "next" ? -size : size;
}

function cloneForLeaving(cardEl, rect) {
  const clone = cardEl.cloneNode(true);
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  clone.classList.add("leaving");
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.zIndex = "30";
  return clone;
}

export async function playTransition(cardEl, dir, swap) {
  const rect = cardEl.getBoundingClientRect();
  const clone = cloneForLeaving(cardEl, rect);
  document.body.appendChild(clone);

  try {
    swap();

    const sign = dir === "next" ? -1 : 1;
    const shift = slideShift(dir, rect.width, window.innerWidth);
    const tilted = `translate(${shift}px, ${LIFT_PX}px) rotate(${sign * TILT_DEG}deg)`;

    cardEl.animate(
      [
        { transform: "translateY(18px) scale(.95)" },
        { transform: "translateY(18px) scale(.95)", offset: 0.45 },
        { transform: "translateY(0) scale(1)" },
      ],
      { duration: OUT_MS + BACK_MS, easing: "ease-out" },
    );

    await clone.animate(
      [{ transform: "translate(0, 0) rotate(0deg)" }, { transform: tilted }],
      { duration: OUT_MS, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" },
    ).finished;

    clone.style.zIndex = "-1";
    await clone.animate(
      [
        { transform: tilted, opacity: 1 },
        { transform: "translate(0, 22px) rotate(0deg) scale(.93)", opacity: 0 },
      ],
      { duration: BACK_MS, easing: "ease-in-out", fill: "forwards" },
    ).finished;
  } finally {
    clone.remove();
  }
}
