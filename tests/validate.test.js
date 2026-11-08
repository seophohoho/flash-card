import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseQuestions } from "../js/validate.js";

const multiple = {
  type: "multiple",
  question: "Q",
  choices: ["a", "b"],
  answer: 1,
  explanation: "e",
};
const short = { type: "short", question: "Q", answer: "GET", explanation: "" };
const essay = { type: "essay", question: "Q", answer: "A" };

test("세 유형을 받아들이고 explanation 기본값은 빈 문자열", () => {
  const { questions, skipped } = parseQuestions([multiple, short, essay]);
  assert.equal(questions.length, 3);
  assert.equal(skipped, 0);
  assert.equal(questions[2].explanation, "");
});

test("배열이 아니면 던진다", () => {
  assert.throws(() => parseQuestions({ questions: [] }), /array/i);
  assert.throws(() => parseQuestions(null), /array/i);
});

test("빈 배열은 빈 결과", () => {
  assert.deepEqual(parseQuestions([]), { questions: [], skipped: 0 });
});

test("알 수 없는 type은 건너뛴다", () => {
  const r = parseQuestions([{ ...short, type: "ox" }, short]);
  assert.equal(r.questions.length, 1);
  assert.equal(r.skipped, 1);
});

test("객관식 answer가 choices 범위 밖이거나 정수가 아니면 건너뛴다", () => {
  for (const answer of [-1, 2, "1", 1.5]) {
    assert.equal(parseQuestions([{ ...multiple, answer }]).skipped, 1);
  }
});

test("객관식 choices가 없거나 2개 미만이면 건너뛴다", () => {
  assert.equal(
    parseQuestions([{ ...multiple, choices: undefined }]).skipped,
    1,
  );
  assert.equal(
    parseQuestions([{ ...multiple, choices: ["a"], answer: 0 }]).skipped,
    1,
  );
});

test("단답형·주관식 answer가 비어 있거나 문자열이 아니면 건너뛴다", () => {
  assert.equal(parseQuestions([{ ...short, answer: "" }]).skipped, 1);
  assert.equal(parseQuestions([{ ...essay, answer: 1 }]).skipped, 1);
});

test("question이 비어 있으면 건너뛴다", () => {
  assert.equal(parseQuestions([{ ...short, question: "  " }]).skipped, 1);
});

test("해설 끝의 출처 줄은 source로 옮기고 해설에서 뺀다", () => {
  const { questions } = parseQuestions([
    { ...short, explanation: "본문\n\n출처: a.pdf p.3" },
    { ...multiple, explanation: "출처: b.pdf p.1~2" },
    short,
  ]);
  assert.equal(questions[0].explanation, "본문");
  assert.equal(questions[0].source, "a.pdf p.3");
  assert.equal(questions[1].explanation, "");
  assert.equal(questions[1].source, "b.pdf p.1~2");
  assert.equal(questions[2].source, null);
});

test("샘플 questions.json은 전부 통과하고 세 유형을 모두 가진다", () => {
  const raw = JSON.parse(
    readFileSync(new URL("../questions.json", import.meta.url), "utf8"),
  );
  const { questions, skipped } = parseQuestions(raw);
  assert.equal(skipped, 0);
  assert.ok(questions.length >= 10);
  for (const t of ["multiple", "short", "essay"]) {
    assert.ok(questions.some((q) => q.type === t));
  }
});
