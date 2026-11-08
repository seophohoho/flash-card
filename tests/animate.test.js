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
