import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRichText } from "../js/format.js";

const t = (value) => ({ type: "text", value });
const ic = (value) => ({ type: "inline-code", value });
const cb = (value) => ({ type: "code-block", value });

test("빈 문자열은 빈 배열", () => {
  assert.deepEqual(parseRichText(""), []);
});

test("일반 글은 줄바꿈을 유지한 text 하나", () => {
  assert.deepEqual(parseRichText("hello\nworld"), [t("hello\nworld")]);
});

test("인라인 코드", () => {
  assert.deepEqual(parseRichText("use `GET` here"), [
    t("use "),
    ic("GET"),
    t(" here"),
  ]);
});

test("코드 블록은 앞뒤 줄바꿈을 먹고 내용만 value로", () => {
  assert.deepEqual(parseRichText("before\n```\nSELECT 1\nFROM t\n```\nafter"), [
    t("before"),
    cb("SELECT 1\nFROM t"),
    t("after"),
  ]);
});

test("언어 이름이 붙은 여는 펜스는 언어 이름을 버린다", () => {
  assert.deepEqual(parseRichText("```sql\nSELECT 1\n```"), [cb("SELECT 1")]);
});

test("닫히지 않은 펜스는 전부 글자 그대로", () => {
  assert.deepEqual(parseRichText("```\nSELECT 1"), [t("```\nSELECT 1")]);
});

test("짝 없는 백틱은 글자 그대로", () => {
  assert.deepEqual(parseRichText("a ` b"), [t("a ` b")]);
});

test("인라인 코드는 줄을 넘지 않는다", () => {
  assert.deepEqual(parseRichText("a `b\nc` d"), [t("a `b\nc` d")]);
});

test("코드 블록 안의 백틱은 해석하지 않는다", () => {
  assert.deepEqual(parseRichText("```\na `b` c\n```"), [cb("a `b` c")]);
});

test("HTML과 마크다운 기호는 해석하지 않는다", () => {
  assert.deepEqual(
    parseRichText("<img src=x onerror=alert(1)> `<b>` **bold** - item"),
    [t("<img src=x onerror=alert(1)> "), ic("<b>"), t(" **bold** - item")],
  );
});
