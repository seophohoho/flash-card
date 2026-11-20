import { test } from "node:test";
import assert from "node:assert/strict";
import { slideShift } from "../js/animate.js";

test("next는 왼쪽(음수), prev는 오른쪽(양수)", () => {
  assert.ok(slideShift("next", 720, 1280) < 0);
  assert.ok(slideShift("prev", 720, 1280) > 0);
});

test("크기는 카드 폭의 0.62배와 화면 폭의 0.55배 중 작은 값", () => {
  assert.equal(Math.abs(slideShift("next", 720, 1280)), 720 * 0.62);
  assert.equal(Math.abs(slideShift("prev", 720, 400)), 400 * 0.55);
});

import { dealPlan } from "../js/animate.js";

test("dealPlan은 개수만큼 단계를 만들고 지연이 차례로 늘어난다", () => {
  const plan = dealPlan(5, () => 0.5);
  assert.equal(plan.length, 5);
  assert.deepEqual(plan.map((s) => s.delay), [0, 70, 140, 210, 280]);
});

test("dealPlan은 왼쪽과 오른쪽에서 번갈아 날아온다", () => {
  const plan = dealPlan(4, () => 0.5);
  assert.deepEqual(plan.map((s) => Math.sign(s.fromX)), [-1, 1, -1, 1]);
});
