import { test } from "node:test";
import assert from "node:assert/strict";
import { extractSource } from "../js/source.js";

test("해설 끝의 출처 줄을 떼어 낸다", () => {
  assert.deepEqual(extractSource("해설 본문\n\n출처: a_b.pdf p.5"), {
    explanation: "해설 본문",
    source: "a_b.pdf p.5",
  });
});

test("출처가 없으면 해설은 그대로, source는 null", () => {
  assert.deepEqual(extractSource("해설 본문"), {
    explanation: "해설 본문",
    source: null,
  });
  assert.deepEqual(extractSource(""), { explanation: "", source: null });
});

test("해설이 출처 줄뿐이면 해설은 빈 문자열", () => {
  assert.deepEqual(extractSource("출처: a.pdf p.1"), {
    explanation: "",
    source: "a.pdf p.1",
  });
});

test("쪽수 범위와 여러 쪽수를 그대로 보존한다", () => {
  assert.equal(extractSource("x\n\n출처: a.pdf p.5~7, 9").source, "a.pdf p.5~7, 9");
});

test("끝의 공백과 줄바꿈은 무시한다", () => {
  assert.deepEqual(extractSource("x\n\n출처: a.pdf p.5  \n"), {
    explanation: "x",
    source: "a.pdf p.5",
  });
});

test("출처 줄이 마지막이 아니면 건드리지 않는다", () => {
  const text = "x\n출처: a.pdf p.5\n뒤에 글이 더 있다";
  assert.deepEqual(extractSource(text), { explanation: text, source: null });
});

test("글 중간의 '출처:'는 출처로 보지 않는다", () => {
  const text = "이 개념의 출처: 책 참고";
  assert.deepEqual(extractSource(text), { explanation: text, source: null });
});

test("값이 빈 '출처:'는 출처로 보지 않는다", () => {
  const text = "x\n\n출처:   ";
  assert.equal(extractSource(text).source, null);
});
