import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { splitSections, firstFence, findHighlights, parseProblem, buildExam } from "../scripts/exam-parse.js";

const pick = (code, ranges) => ranges.map(([a, b]) => code.slice(a, b));

test("splitSections: 펜스 안의 ## 는 절 제목이 아니다", () => {
  const md = "# 제목\n\n## 완성 코드\n\n```python\n## not heading\nx = 1\n```\n\n## 실행 출력\n\n```\n1\n```";
  const sections = splitSections(md);
  assert.deepEqual(sections.map((s) => s.title), ["", "완성 코드", "실행 출력"]);
  assert.match(sections[1].body, /## not heading/);
});

test("firstFence: 첫 코드 블록의 언어와 본문", () => {
  assert.deepEqual(firstFence("설명\n\n```python\na = 1\nb = 2\n```\n"), { lang: "python", text: "a = 1\nb = 2" });
  assert.equal(firstFence("코드 없음"), null);
});

test("findHighlights: 빈칸 하나가 채워진 부분만 잡는다", () => {
  const skeleton = "env = StreamExecutionEnvironment.____()\nenv.set_parallelism(1)";
  const code = "env = StreamExecutionEnvironment.get_execution_environment()\nenv.set_parallelism(1)";
  assert.deepEqual(pick(code, findHighlights(skeleton, code)), ["get_execution_environment"]);
});

test("findHighlights: 한 줄에 빈칸이 둘이면 둘 다 잡는다", () => {
  const skeleton = "a = 1\nresult = src.____(lambda x: x).____(1)\nb = 2";
  const code = "a = 1\nresult = src.key_by(lambda x: x).sum(1)\nb = 2";
  assert.deepEqual(pick(code, findHighlights(skeleton, code)), ["key_by", "sum"]);
});

test("findHighlights: 줄이 늘어난 경우 바뀐 줄 전체를 잡는다", () => {
  const skeleton = "a = 1\n____\nb = 2";
  const code = "a = 1\nx = 10\ny = 20\nb = 2";
  assert.deepEqual(pick(code, findHighlights(skeleton, code)), ["x = 10", "y = 20"]);
});

test("findHighlights: 스켈레톤에 빈칸 표시가 없으면 빈 배열", () => {
  assert.deepEqual(findHighlights("a = 1\nb = 2", "a = 1\nb = 3"), []);
});

test("findHighlights: 빈칸이 없는 줄이 바뀌어도 빈칸 구간이 아니면 잡지 않는다", () => {
  const skeleton = "import os\nx = ____\nprint(x)";
  const code = "import sys\nx = 5\nprint(x)";
  assert.deepEqual(pick(code, findHighlights(skeleton, code)), ["5"]);
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "exam-"));
  const dir = join(root, "data_engineering2_ws_2_1");
  mkdirSync(join(dir, "skeleton"), { recursive: true });
  writeFileSync(
    join(dir, "README.md"),
    "# II. Flink Datastream — 5884. filter 및 map 기반 주문 금액 데이터 처리 (Lv1)\n\n- 유형: 실습 (`ws_2_1`)\n- 제출기한: 2026.12.24 23:59\n\n## 목표\n\n목표 본문\n",
  );
  writeFileSync(join(dir, "skeleton", "skeleton.py"), "x = env.____()\nprint(x)\n");
  writeFileSync(
    join(dir, "ANSWER.md"),
    "# ws_2_1 정답\n\n## 빈칸 정답\n\n| 번호 | 정답 |\n|---|---|\n| 1 | `get` |\n\n## 완성 코드\n\n```python\nx = env.get()\nprint(x)\n```\n\n## 실제 실행 출력\n\n```\nOK\n```\n\n## 핵심 개념\n\n- 개념 하나\n\n## 서술 답안\n\n답안 본문\n",
  );
  return { root, dir };
}

test("parseProblem: 한 문제 폴더를 읽어 모든 필드를 채운다", () => {
  const { dir } = fixture();
  const warnings = [];
  const p = parseProblem(dir, (m) => warnings.push(m));
  assert.equal(p.id, "ws_2_1");
  assert.equal(p.kind, "실습");
  assert.equal(p.part, 2);
  assert.equal(p.partName, "Flink Datastream");
  assert.equal(p.number, "5884");
  assert.equal(p.title, "filter 및 map 기반 주문 금액 데이터 처리 (Lv1)");
  assert.match(p.description, /목표 본문/);
  assert.doesNotMatch(p.description, /제출기한/);
  assert.equal(p.code, "x = env.get()\nprint(x)");
  assert.deepEqual(pick(p.code, p.highlights), ["get"]);
  assert.equal(p.output, "OK");
  assert.match(p.concepts, /개념 하나/);
  assert.deepEqual(p.extra, [{ title: "서술 답안", markdown: "답안 본문" }]);
  assert.deepEqual(warnings, []);
});

test("parseProblem: 완성 코드나 출력이 없으면 경고하고 빈 값으로 둔다", () => {
  const { dir } = fixture();
  writeFileSync(join(dir, "ANSWER.md"), "# t\n\n## 핵심 개념\n\n개념\n");
  const warnings = [];
  const p = parseProblem(dir, (m) => warnings.push(m));
  assert.equal(p.code, "");
  assert.equal(p.output, "");
  assert.deepEqual(p.highlights, []);
  assert.equal(warnings.length, 2);
});

test("parseProblem: 스켈레톤에 빈칸이 없으면 정답 표의 값으로 강조한다", () => {
  const { dir } = fixture();
  writeFileSync(join(dir, "skeleton", "skeleton.py"), "x = env.get()\nprint(x)\n");
  const p = parseProblem(dir, () => {});
  assert.deepEqual(pick(p.code, p.highlights), ["get"]);
});

test("buildExam: 단원 순, 단원 안에서 실습 먼저 과제 나중", () => {
  const { root, dir } = fixture();
  const make = (name, title) => {
    const d = join(root, name);
    mkdirSync(join(d, "skeleton"), { recursive: true });
    writeFileSync(join(d, "README.md"), `# ${title}\n`);
    writeFileSync(join(d, "ANSWER.md"), "# a\n\n## 완성 코드\n\n```python\nx\n```\n\n## 실행 출력\n\n```\n1\n```\n");
  };
  make("data_engineering2_hw_1_2", "I. Flink 기초 — 5882. 가 (Lv2)");
  make("data_engineering2_ws_1_5", "I. Flink 기초 — 5881. 나 (Lv5)");
  make("data_engineering2_ws_1_1", "I. Flink 기초 — 5877. 다 (Lv1)");
  const { problems } = buildExam(root);
  assert.deepEqual(problems.map((p) => p.id), ["ws_1_1", "ws_1_5", "hw_1_2", "ws_2_1"]);
  assert.ok(dir);
});
