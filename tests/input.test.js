import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySwipe, keyToDirection, isToggleKey } from "../js/input.js";

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

test("방향키만 인정하고 좌우 키를 방향으로 바꾼다", () => {
  assert.equal(keyToDirection({ key: "ArrowRight" }), "next");
  assert.equal(keyToDirection({ key: "ArrowLeft" }), "prev");
  assert.equal(keyToDirection({ key: "ArrowUp" }), null);
  assert.equal(keyToDirection({ key: "a" }), null);
});

test("Alt·Ctrl·Cmd와 함께 누른 방향키는 브라우저 뒤로 가기용이라 무시한다", () => {
  for (const mod of ["altKey", "ctrlKey", "metaKey"]) {
    assert.equal(keyToDirection({ key: "ArrowRight", [mod]: true }), null);
    assert.equal(keyToDirection({ key: "ArrowLeft", [mod]: true }), null);
  }
});

test("Shift와 함께 누른 방향키는 그대로 인정한다", () => {
  assert.equal(keyToDirection({ key: "ArrowRight", shiftKey: true }), "next");
});

test("아래 방향키만 펼치기/접기 키로 인정한다", () => {
  assert.equal(isToggleKey({ key: "ArrowDown" }), true);
  assert.equal(isToggleKey({ key: "ArrowUp" }), false);
  assert.equal(isToggleKey({ key: "ArrowRight" }), false);
  assert.equal(isToggleKey({ key: "Enter" }), false);
});

test("수정 키와 함께 누른 아래 방향키는 무시한다", () => {
  for (const mod of ["altKey", "ctrlKey", "metaKey"]) {
    assert.equal(isToggleKey({ key: "ArrowDown", [mod]: true }), false);
  }
});

test("키를 계속 누를 때 반복해서 들어오는 이벤트는 무시한다", () => {
  assert.equal(isToggleKey({ key: "ArrowDown", repeat: true }), false);
});

test("Shift와 함께 누른 아래 방향키는 인정한다", () => {
  assert.equal(isToggleKey({ key: "ArrowDown", shiftKey: true }), true);
});
