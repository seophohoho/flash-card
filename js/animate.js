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

const DEAL_COUNT = 8;
const DEAL_STAGGER_MS = 70;
const DEAL_FLY_MS = 420;
const DEAL_SETTLE_MS = 260;

export function dealPlan(count, rng = Math.random) {
  return Array.from({ length: count }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    return {
      delay: i * DEAL_STAGGER_MS,
      fromX: side * (0.55 + rng() * 0.25),
      fromY: -(30 + rng() * 90),
      fromRot: side * (14 + rng() * 22),
      toX: (rng() - 0.5) * 14,
      toY: (rng() - 0.5) * 10,
      toRot: (rng() - 0.5) * 7,
    };
  });
}

export async function playDeal(cardEl, hideEls = []) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const rect = cardEl.getBoundingClientRect();
  const hidden = [cardEl, ...hideEls];
  hidden.forEach((el) => {
    el.style.visibility = "hidden";
  });
  const clones = dealPlan(DEAL_COUNT).map((step) => {
    const node = document.createElement("div");
    node.className = "deal-card";
    node.style.left = `${rect.left}px`;
    node.style.top = `${rect.top}px`;
    node.style.width = `${rect.width}px`;
    node.style.height = `${rect.height}px`;
    document.body.appendChild(node);
    const from = `translate(${step.fromX * window.innerWidth}px, ${step.fromY}px) rotate(${step.fromRot}deg)`;
    const to = `translate(${step.toX}px, ${step.toY}px) rotate(${step.toRot}deg)`;
    const anim = node.animate(
      [
        { transform: from, opacity: 0 },
        { transform: from, opacity: 1, offset: 0.12 },
        { transform: to, opacity: 1 },
      ],
      {
        duration: DEAL_FLY_MS,
        delay: step.delay,
        easing: "cubic-bezier(.2,.8,.3,1)",
        fill: "both",
      },
    );
    return { node, anim };
  });

  try {
    await Promise.all(clones.map(({ anim }) => anim.finished));
    hidden.forEach((el) => {
      el.style.visibility = "";
    });
    cardEl.animate(
      [{ transform: "scale(.97)" }, { transform: "scale(1)" }],
      { duration: DEAL_SETTLE_MS, easing: "ease-out" },
    );
    await Promise.all(
      clones.map(({ node }) =>
        node.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: DEAL_SETTLE_MS,
          easing: "ease-out",
          fill: "forwards",
        }).finished,
      ),
    );
  } finally {
    hidden.forEach((el) => {
      el.style.visibility = "";
    });
    clones.forEach(({ node }) => node.remove());
  }
}
