import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySwipe } from "../js/input.js";

test("왼쪽으로 50px 넘게 쓸면 next, 오른쪽이면 prev", () => {
  assert.equal(classifySwipe(-60, 5), "next");
  assert.equal(classifySwipe(60, 5), "prev");
});

test("정확히 50px이거나 이동이 없으면 null", () => {
  assert.equal(classifySwipe(-50, 0), null);
  assert.equal(classifySwipe(0, 0), null);
});

test("세로 이동이 가로 이동보다 크거나 같으면 null", () => {
  assert.equal(classifySwipe(-80, 90), null);
  assert.equal(classifySwipe(-80, 80), null);
});

test("51px이고 세로가 더 작으면 인정", () => {
  assert.equal(classifySwipe(51, 50), "prev");
});
