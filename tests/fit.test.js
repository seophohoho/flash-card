import { test } from "node:test";
import assert from "node:assert/strict";
import { pickScale, MIN_SCALE } from "../js/fit.js";

test("내용이 영역에 들어가면 1", () => {
  assert.equal(pickScale(300, 400), 1);
  assert.equal(pickScale(400, 400), 1);
});

test("넘치면 영역/내용 비율", () => {
  assert.equal(pickScale(500, 400), 0.8);
});

test("비율이 하한보다 작으면 하한", () => {
  assert.equal(pickScale(2000, 400, 0.6), 0.6);
  assert.equal(pickScale(2000, 400), MIN_SCALE);
});

test("영역 높이가 0이어도 하한을 돌려준다", () => {
  assert.equal(pickScale(300, 0), MIN_SCALE);
});
