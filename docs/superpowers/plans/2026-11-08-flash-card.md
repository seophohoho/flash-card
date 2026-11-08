# 플래시카드 웹 사이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문제 JSON(객관식·단답형·주관식)을 플래시카드로 한 장씩 넘겨 보는 정적 웹 사이트를 만든다.

**Architecture:** 빌드 없는 순수 ES 모듈이다. 화면과 상관없는 로직(검증, 덱 상태, 글 서식 해석, 스와이프 판정, 글자 배율 계산)은 DOM에 의존하지 않는 모듈로 분리해 `node --test`로 검증한다. DOM을 만지는 코드(렌더링, 입력 연결, 애니메이션, 글자 크기 맞춤)는 얇게 두고 브라우저에서 수동 점검한다.

**Tech Stack:** HTML, CSS, JavaScript(ES 모듈). 외부 라이브러리 없음. 개발용 테스트는 Node 내장 `node --test`(Node 20 이상). 배포는 Vercel 정적 사이트.

**Spec:** `docs/superpowers/specs/2026-11-08-flash-card-design.md`. 참고용 데모: `.superpowers/brainstorm/18153-1794106586/content/demo-throwaway-v3.html` (모양과 조작감의 기준이고, 코드는 그대로 쓰지 않는다).

## Global Constraints

- 프레임워크 없이 순수 HTML, CSS, JavaScript. 빌드 단계 없음. 외부 라이브러리 없음.
- 서버 코드 없음. 결과물은 정적 파일(HTML, CSS, JS, JSON)뿐이다.
- 문제 파일은 `questions.json` 하나. 페이지가 열리면 `fetch`로 자동으로 읽는다.
- `file://`에서는 `fetch`가 막히므로 로컬 개발에는 로컬 서버가 필요하다. 실행 방법은 README에 적는다.
- Vercel 설정: 프레임워크 "Other", 빌드 명령 비움. 빌드 명령과 설정이 필요 없어야 한다. `vercel.json`은 만들지 않는다.
- 저장소는 GitHub의 public 저장소다(계정 `seophohoho`, 이름 `flash-card`). `main`에 push하면 Vercel이 자동으로 배포한다. 저장소를 만들고 push하기 전에는 반드시 사용자에게 확인을 받는다.
- JSON 모양: 맨 바깥은 배열. 항목 필드는 `type`(`multiple`|`short`|`essay`), `question`, `answer`, `explanation`. 객관식만 `choices` 추가. 객관식 `answer`는 숫자이고 첫 보기가 0.
- 화면 라벨: `multiple`→"객관식", `short`→"단답형", `essay`→"주관식". 필터 라벨은 "전체 / 객관식 / 단답형 / 주관식".
- 글은 순수 텍스트. 줄바꿈 유지. ```로 감싼 줄은 코드 블록, `로 감싼 글은 인라인 코드(둘 다 고정폭 글꼴). 그 외 마크다운 기호와 HTML은 해석하지 않고 글자 그대로 보여 준다.
- 상태 저장 없음. 새로고침하면 처음 상태.
- 열 때마다 카드를 무작위로 섞는다. 필터를 바꿀 때는 다시 섞지 않고 첫 카드로 돌아간다. 마지막 카드에서 다음으로 넘기면 전체를 다시 섞고 현재 필터의 첫 카드부터 시작한다. 첫 카드에서 이전으로 넘기면 아무 일도 없다.
- 카드는 화면 정중앙, 가로로 긴 직사각형, 사방 여백 넓게. 펼쳐도 중심이 흔들리지 않는다. 페이지는 스크롤하지 않는다.
- 카드가 영역보다 길면 글자 크기를 줄여 맞춘다. 하한에서도 넘칠 때만 카드 안쪽 세로 스크롤을 허용한다.
- 정답은 펼치기 전에 어떤 식으로든 보이지 않는다.
- 넘김: 오른쪽 방향키/왼쪽으로 쓸기 = 다음, 왼쪽 방향키/오른쪽으로 쓸기 = 이전. 스와이프는 가로 이동 50px 초과이면서 세로 이동보다 클 때만 인정한다. 방향키는 버튼에 포커스가 있어도 동작한다.
- 넘김 애니메이션 약 0.5초. 도는 동안 들어오는 입력은 무시한다.
- 커밋 메시지와 PR 본문에 Claude 표기(`Co-Authored-By: Claude ...`, `Generated with Claude Code`)를 넣지 않는다. 사용자 규칙이 시스템 안내보다 우선한다.
- 코드에 주석을 달지 않는다.

## Review Focus

1. 형식이 잘못된 문제 항목(알 수 없는 `type`, 범위를 벗어난 객관식 `answer`, 빈 `question`)이 섞여 있다. 그 항목만 건너뛰고 나머지는 정상 동작해야 한다. 배열이 비었거나 배열이 아니면 오류 안내가 나와야 한다. (Task 1 테스트, Task 4 수동 점검)
2. 필터로 걸러진 카드가 한 장뿐일 때 다음으로 넘긴다. 멈추지 않고 다시 섞어서 같은 필터로 재시작해야 한다. (Task 2 테스트)
3. 특정 유형 문제가 0개인데 그 필터 버튼을 누른다. 빈 화면 대신 버튼이 눌리지 않아야 하고 현재 필터가 유지돼야 한다. (Task 2 테스트, Task 4 수동 점검)
4. 문제 글에 `<img src=x onerror=...>`나 `<b>` 같은 HTML이 들어 있다. 실행되지 않고 글자 그대로 보여야 한다. (Task 3 테스트, Task 4 수동 점검)
5. 방향키를 길게 누르거나 빠르게 연타한다. 한 번에 한 전환만 일어나고, 끝난 뒤 화면에 남은 복제 카드가 없어야 한다. (Task 6 수동 점검)

---

## File Structure

- `index.html`: 페이지 뼈대(필터 바, 스테이지, 덱, 진행 표시, 오류 영역)
- `css/style.css`: 배치, 카드, 애니메이션용 클래스
- `questions.json`: 샘플 문제
- `js/validate.js`: 원본 JSON을 검증해 문제 배열로 바꾼다
- `js/deck.js`: 섞기, 필터, 현재 위치 상태
- `js/format.js`: 글을 텍스트·인라인 코드·코드 블록 조각으로 나눈다
- `js/render.js`: 카드를 DOM으로 만든다
- `js/input.js`: 방향키와 스와이프를 한 가지 `next|prev` 신호로 바꾼다
- `js/animate.js`: 덱 뒤로 넘기는 전환
- `js/fit.js`: 글자 크기 맞춤
- `js/main.js`: 부팅과 연결
- `tests/*.test.js`: 위 순수 모듈의 테스트
- `package.json`, `.gitignore`, `README.md`

---

### Task 1: 프로젝트 준비와 문제 검증

**Files:**

- Create: `package.json`, `.gitignore`, `questions.json`, `js/validate.js`, `tests/validate.test.js`

**Interfaces:**

- Produces:
  - `type Question = { type: 'multiple'|'short'|'essay'; question: string; choices?: string[]; answer: number|string; explanation: string }`
  - `parseQuestions(raw: unknown): { questions: Question[]; skipped: number }` — `raw`가 배열이 아니면 `Error`(메시지에 "array" 포함)를 던진다.

- [ ] **Step 1: 저장소와 설정 파일을 만든다**

`git init`을 실행한다. `.gitignore`에 `.superpowers/`와 `node_modules/`를 넣는다. `package.json`은 `{"private": true, "type": "module", "scripts": {"test": "node --test"}}`로 만든다. 원격 저장소 연결과 push는 이 Task에서 하지 않고 Task 8에서 한다.

- [ ] **Step 2: 실패하는 테스트를 쓴다** — `tests/validate.test.js`

```js
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
```

- [ ] **Step 3: 실패 확인**

Run: `node --test`
Expected: FAIL (`js/validate.js`를 찾을 수 없다는 오류)

- [ ] **Step 4: `js/validate.js`에 `parseQuestions(raw: unknown): { questions: Question[]; skipped: number }`를 구현한다**

항목마다 위 테스트가 정한 규칙으로 검사하고, 통과한 항목은 `explanation`이 없으면 `""`로 채워 새 객체로 돌려준다. 입력은 바꾸지 않는다.

- [ ] **Step 5: `questions.json` 샘플을 만든다**

10개 이상, 세 유형 모두 포함. 다음을 반드시 넣는다: 인라인 코드가 든 보기, ```코드 블록이 든 정답, 600자쯤 되는 긴 주관식 정답, 80자 넘는 긴 보기, 글자 그대로 보여야 하는`<b>bold</b>`가 든 문제, 공백 없는 120자 문자열(긴 URL)이 든 해설, 데모의 샘플 문제 6개.

- [ ] **Step 6: 통과 확인**

Run: `node --test`
Expected: PASS (모든 테스트)

- [ ] **Step 7: 커밋**

```bash
git add package.json .gitignore questions.json js/validate.js tests/validate.test.js
git commit -m "feat: 문제 JSON 검증과 샘플 문제 추가"
```

---

### Task 2: 덱 상태 (섞기·필터·넘김)

**Files:**

- Create: `js/deck.js`, `tests/deck.test.js`

**Interfaces:**

- Consumes: `Question` (Task 1)
- Produces:
  - `type Filter = 'all'|'multiple'|'short'|'essay'`
  - `shuffle<T>(items: T[], rng?: () => number): T[]` — 피셔-예이츠(Fisher–Yates). 입력은 바꾸지 않는다.
  - `createDeck(questions: Question[], rng?: () => number): Deck`
  - `Deck`: `cards(): Question[]`(현재 필터로 걸러진 목록), `current(): Question`, `index(): number`, `total(): number`, `remaining(): number`(현재 카드 뒤에 남은 장수), `filter(): Filter`, `counts(): Record<Filter, number>`, `setFilter(f: Filter): boolean`, `next(): 'moved'|'restarted'`, `prev(): 'moved'|'stay'`

- [ ] **Step 1: 실패하는 테스트를 쓴다** — `tests/deck.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { shuffle, createDeck } from "../js/deck.js";

const q = (type, n) => ({
  type,
  question: `${type}${n}`,
  answer: "a",
  explanation: "",
});
const sample = () => [
  q("multiple", 1),
  q("multiple", 2),
  q("short", 1),
  q("short", 2),
];
const identityRng = () => 0.999999;

test("shuffle은 입력을 바꾸지 않고 같은 원소의 순열을 돌려준다", () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, Math.random);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
});

test("shuffle은 rng를 쓴다 (rng가 항상 최댓값 근처면 원래 순서)", () => {
  assert.deepEqual(shuffle([1, 2, 3, 4], identityRng), [1, 2, 3, 4]);
});

test("시작 상태: 전체 필터, index 0, total과 remaining", () => {
  const d = createDeck(sample(), identityRng);
  assert.equal(d.filter(), "all");
  assert.equal(d.index(), 0);
  assert.equal(d.total(), 4);
  assert.equal(d.remaining(), 3);
});

test("counts는 유형별 개수를 센다", () => {
  assert.deepEqual(createDeck(sample(), identityRng).counts(), {
    all: 4,
    multiple: 2,
    short: 2,
    essay: 0,
  });
});

test("setFilter는 걸러낸 순서를 유지하고 index를 0으로 돌린다", () => {
  const d = createDeck(sample(), identityRng);
  d.next();
  assert.equal(d.setFilter("short"), true);
  assert.equal(d.index(), 0);
  assert.deepEqual(
    d.cards().map((c) => c.question),
    ["short1", "short2"],
  );
});

test("문제가 0개인 필터로는 바뀌지 않고 false를 돌려준다", () => {
  const d = createDeck(sample(), identityRng);
  assert.equal(d.setFilter("essay"), false);
  assert.equal(d.filter(), "all");
});

test("next는 한 칸 이동하고 moved를 돌려준다", () => {
  const d = createDeck(sample(), identityRng);
  assert.equal(d.next(), "moved");
  assert.equal(d.index(), 1);
});

test("마지막 카드에서 next는 다시 섞고 첫 카드부터 restarted, 필터는 유지", () => {
  let calls = 0;
  const rng = () => {
    calls += 1;
    return 0.999999;
  };
  const d = createDeck(sample(), rng);
  d.setFilter("multiple");
  d.next();
  const before = calls;
  assert.equal(d.next(), "restarted");
  assert.ok(calls > before);
  assert.equal(d.index(), 0);
  assert.equal(d.filter(), "multiple");
});

test("카드가 한 장뿐인 필터에서도 next는 restarted", () => {
  const d = createDeck([q("multiple", 1), q("short", 1)], identityRng);
  d.setFilter("short");
  assert.equal(d.next(), "restarted");
  assert.equal(d.current().type, "short");
  assert.equal(d.total(), 1);
});

test("prev는 첫 카드에서 stay, 아니면 moved", () => {
  const d = createDeck(sample(), identityRng);
  assert.equal(d.prev(), "stay");
  d.next();
  assert.equal(d.prev(), "moved");
  assert.equal(d.index(), 0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/deck.test.js`
Expected: FAIL (`js/deck.js`를 찾을 수 없다는 오류)

- [ ] **Step 3: `js/deck.js`에 위 인터페이스를 구현한다**

내부에는 섞인 전체 목록과 현재 필터, index만 둔다. `cards()`는 섞인 목록을 필터로 거른 결과다. 재시작할 때는 전체 목록을 새로 섞고 필터와 `index = 0`을 적용한다.

- [ ] **Step 4: 통과 확인**

Run: `node --test`
Expected: PASS (Task 1 테스트 포함 전부)

- [ ] **Step 5: 커밋**

```bash
git add js/deck.js tests/deck.test.js
git commit -m "feat: 덱 상태(섞기·필터·넘김) 추가"
```

---

### Task 3: 글 서식 해석

**Files:**

- Create: `js/format.js`, `tests/format.test.js`

**Interfaces:**

- Produces:
  - `type Segment = { type: 'text'|'inline-code'|'code-block'; value: string }`
  - `parseRichText(text: string): Segment[]`

- [ ] **Step 1: 실패하는 테스트를 쓴다** — `tests/format.test.js`

````js
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
````

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/format.test.js`
Expected: FAIL (`js/format.js`를 찾을 수 없다는 오류)

- [ ] **Step 3: `js/format.js`에 `parseRichText(text: string): Segment[]`를 구현한다**

먼저 줄 단위로 ```펜스를 찾아 코드 블록과 나머지 글로 나눈다. 나머지 글에서는 같은 줄 안의`…` 쌍만 인라인 코드로 뗀다. 빈 text 조각은 만들지 않는다.

- [ ] **Step 4: 통과 확인**

Run: `node --test`
Expected: PASS (전부)

- [ ] **Step 5: 커밋**

```bash
git add js/format.js tests/format.test.js
git commit -m "feat: 글 서식(코드 블록·인라인 코드) 해석 추가"
```

---

### Task 4: 페이지 뼈대, 카드 렌더링, 필터·진행 표시

**Files:**

- Create: `index.html`, `css/style.css`, `js/render.js`, `js/main.js`, `README.md`

**Interfaces:**

- Consumes: `parseQuestions`, `createDeck`/`Deck`/`Filter`, `parseRichText`/`Segment`
- Produces:
  - `renderRichText(parent: HTMLElement, text: string): void` (`js/render.js`) — `parseRichText` 결과를 DOM으로 만든다. 글은 `textContent`나 텍스트 노드로만 넣고 `innerHTML`은 쓰지 않는다. 코드 블록은 `<pre><code>`, 인라인 코드는 `<code>`.
  - `renderCard(container: HTMLElement, question: Question, onToggle?: () => void): void` (`js/render.js`) — `container`의 내용을 비우고 카드 내용을 새로 만든다. 접힌 상태로 시작한다. "펼치기" 버튼을 누르면 정답과 해설이 나타나고 버튼 글자가 "▲ 접기"로 바뀐다. 객관식은 정답 보기에 `correct` 클래스가 붙고, 펼쳤을 때만 `shown`이 붙는다. `explanation`이 비면 해설 줄을 만들지 않는다. 객관식의 정답 표시는 `"{answer+1}. {choices[answer]}"`. 펼치거나 접을 때마다 `onToggle`을 부른다.
  - `main.js` 내부 함수(이후 Task가 이름을 그대로 쓴다): `showError(message: string): void`, `renderCurrent(): void`, `renderFilters(): void`, `renderProgress(): void`, `renderAll(): void`

- [ ] **Step 1: `index.html`을 만든다**

필터 바(`#filters`), 스테이지(`#stage`) 안에 덱(`#deck`: 유령 카드 `#g2`, `#g1`, 실제 카드 `#card`), 진행 표시(`#progress`), 오류 영역(`#error`)을 둔다. `<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">`와 `<script type="module" src="js/main.js">`를 넣는다.

- [ ] **Step 2: `css/style.css`를 만든다**

- `html, body`는 `overflow: hidden`, `overscroll-behavior-x: none`.
- `#stage`는 `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center`, 패딩 `14vh 10vw`(폭 600px 이하에서는 `18vh 7vw 14vh`), `touch-action: pan-y`, `user-select: none`.
- `#deck`는 `position: relative; width: min(720px, 100%)`. 유령 카드는 `position: absolute; inset: 0`에 `translateY(12px) scale(.965)`와 `translateY(24px) scale(.93)`.
- 카드 안쪽 크기는 모두 `em`으로 쓴다(Task 7이 카드의 `font-size` 하나로 전체를 줄이기 때문이다). 데모의 색과 모양을 따른다.
- 접힌 상태에서 `.answer`는 `display: none`. 모든 글에 `overflow-wrap: anywhere`, 본문에 `white-space: pre-wrap`, `code`와 `pre`는 고정폭 글꼴.
- 객관식 보기 목록은 두 열, 폭 600px 이하에서는 한 열.
- 필터 버튼은 위쪽 가운데, 비활성 버튼은 흐리게. 진행 표시는 아래쪽 가장자리의 작은 글씨.

- [ ] **Step 3: `js/render.js`를 구현한다**

위 Interfaces대로 `renderRichText`와 `renderCard`를 만든다. 유형 라벨(객관식/단답형/주관식)을 카드 위에 보여 준다.

- [ ] **Step 4: `js/main.js`를 구현한다**

부팅: `fetch('questions.json')` → `parseQuestions` → `createDeck`. 읽기에 실패하거나, JSON이 깨졌거나, 배열이 아니거나, 통과한 문제가 0개이면 `showError('문제를 불러오지 못했습니다')`를 부르고 멈춘다(카드는 보이지 않는다). `renderFilters`는 `deck.counts()`로 버튼 4개를 만들고 문제 수를 작게 표시한다. 개수가 0인 버튼은 `disabled`이고, 현재 필터 버튼에는 `active` 클래스를 준다. 버튼을 누르면 `deck.setFilter(f)`가 `true`일 때 `renderAll()`을 부르고 버튼에서 `blur()`한다. `renderProgress`는 `"{index+1} / {total}"`을 쓴다. `renderCurrent`는 `renderCard(#card, deck.current(), …)`를 부르고 `deck.remaining()`이 1 미만이면 `#g1`, 2 미만이면 `#g2`를 숨긴다. 이 단계에서는 카드를 넘기는 입력이 아직 없다.

- [ ] **Step 5: `README.md`를 쓴다**

로컬 실행(`python3 -m http.server 8000` 후 `http://localhost:8000`), 테스트 실행(`node --test`), `questions.json` 모양(`questions-format.md`를 가리킨다) 순서로 적는다. 배포 섹션은 Task 8에서 추가한다.

- [ ] **Step 6: 수동 점검**

Run: `python3 -m http.server 8000` 후 브라우저에서 `http://localhost:8000`을 연다.
Expected (모두 만족):

- 카드 한 장이 화면 정중앙에 있고 좌우 여백이 화면 폭의 10% 이상이다.
- 접힌 상태에서 정답과 해설이 보이지 않고, 객관식 보기에도 강조가 없다.
- "펼치기"를 누르면 정답과 해설이 나오고 버튼이 "▲ 접기"로 바뀐다. 객관식은 정답 보기가 초록색이다. 다시 누르면 원래대로 접힌다.
- 펼치기 전후로 카드의 세로 중심(`getBoundingClientRect()` 기준)이 1px 이상 움직이지 않는다.
- 필터 버튼 4개에 개수가 보이고, 누르면 해당 유형만 보이며 진행 표시가 그 묶음 기준(`1 / n`)으로 바뀐다. 유형이 0개면 버튼이 눌리지 않는다.
- `<b>bold</b>`가 든 문제가 태그 글자 그대로 보이고, 긴 URL 해설이 카드 밖으로 넘치지 않는다.
- `questions.json`을 `[]`로, 그다음 깨진 JSON으로 바꿔 새로고침하면 둘 다 오류 안내가 나온다. 확인 후 원래대로 되돌린다.

- [ ] **Step 7: 커밋**

```bash
git add index.html css/style.css js/render.js js/main.js README.md
git commit -m "feat: 카드 렌더링, 필터, 진행 표시 추가"
```

---

### Task 5: 키보드·스와이프 입력과 넘김

**Files:**

- Create: `js/input.js`, `tests/input.test.js`
- Modify: `js/main.js`

**Interfaces:**

- Consumes: `Deck.next()`, `Deck.prev()`, `renderAll()` (Task 4)
- Produces:
  - `classifySwipe(dx: number, dy: number): 'next'|'prev'|null` — `|dx| > 50` 이면서 `|dx| > |dy|`일 때만 인정하고, `dx < 0`이면 `'next'`, 아니면 `'prev'`.
  - `bindInput(swipeTarget: HTMLElement, onNavigate: (dir: 'next'|'prev') => void): void` — `document`의 `keydown`에서 `ArrowRight`=next, `ArrowLeft`=prev. `swipeTarget`의 `touchstart`/`touchend`로 스와이프를 판정한다(`touchstart`는 `passive: true`).
  - `main.js`: `navigate(dir: 'next'|'prev'): void`

- [ ] **Step 1: 실패하는 테스트를 쓴다** — `tests/input.test.js`

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/input.test.js`
Expected: FAIL (`js/input.js`를 찾을 수 없다는 오류)

- [ ] **Step 3: `js/input.js`에 `classifySwipe`와 `bindInput`을 구현한다**

`input.js`는 모듈을 불러올 때 `document`나 `window`를 만지면 안 된다(Node에서 테스트가 돌아야 한다). DOM 접근은 `bindInput` 안에서만 한다.

- [ ] **Step 4: `main.js`에 `navigate(dir)`를 만들고 `bindInput`으로 연결한다**

`navigate('next')`는 `deck.next()`를, `navigate('prev')`는 `deck.prev()`를 부르고, 결과가 `'stay'`이면 아무것도 하지 않는다. 그 외에는 `renderAll()`을 부른다. 부팅이 끝난 뒤 `bindInput(#stage, navigate)`를 한 번 부른다. 이 단계에서는 애니메이션이 없다.

- [ ] **Step 5: 통과 확인**

Run: `node --test`
Expected: PASS (전부)

- [ ] **Step 6: 수동 점검**

Expected (모두 만족):

- → 키는 다음 카드, ← 키는 이전 카드로 간다.
- 필터 버튼을 눌러 포커스가 갔다 온 뒤에도 방향키가 동작하고, "펼치기" 버튼에 포커스가 있어도 동작한다.
- 크롬 개발자 도구의 기기 모드에서 왼쪽으로 쓸면 다음, 오른쪽으로 쓸면 이전으로 간다. 거의 세로로만 쓸면 넘어가지 않는다.
- 첫 카드에서 ←는 아무 일도 하지 않는다.
- 마지막 카드에서 →를 누르면 순서가 새로 섞여 첫 카드부터 다시 시작한다. 필터가 걸려 있으면 필터는 그대로다.
- 넘어가면 새 카드는 접힌 상태로 시작한다.

- [ ] **Step 7: 커밋**

```bash
git add js/input.js tests/input.test.js js/main.js
git commit -m "feat: 방향키와 스와이프로 카드 넘기기"
```

---

### Task 6: 덱 뒤로 넘기는 애니메이션

**Files:**

- Create: `js/animate.js`, `tests/animate.test.js`
- Modify: `js/main.js`, `css/style.css`

**Interfaces:**

- Consumes: `navigate`, `renderCurrent` (Task 4, 5)
- Produces:
  - `slideShift(dir: 'next'|'prev', cardWidth: number, viewportWidth: number): number` — `next`는 음수, `prev`는 양수. 크기는 `Math.min(cardWidth * 0.62, viewportWidth * 0.55)`.
  - `playTransition(cardEl: HTMLElement, dir: 'next'|'prev', swap: () => void): Promise<void>` — 지금 카드를 복제해 `position: fixed`로 같은 자리에 겹치고(`leaving` 클래스), `swap()`을 불러 실제 카드를 다음 카드로 바꾼 뒤 전환을 재생한다. 복제 카드는 쓸어 넘긴 방향으로 약 260ms 동안 살짝 기울며 밀려나고(회전 약 7도, 방향은 `next`가 왼쪽), 이어서 약 260ms 동안 덱 뒤쪽 위치로 작아지며 사라진다. 실제 카드는 그동안 `translateY(18px) scale(.95)`에서 원래 자리로 올라온다. 끝나면 복제 카드를 DOM에서 지우고 Promise를 끝낸다.

- [ ] **Step 1: 실패하는 테스트를 쓴다** — `tests/animate.test.js`

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/animate.test.js`
Expected: FAIL (`js/animate.js`를 찾을 수 없다는 오류)

- [ ] **Step 3: `js/animate.js`를 구현한다**

`slideShift`는 DOM에 의존하지 않는다(모듈 불러올 때 `document`를 만지지 않는다). `playTransition`은 Web Animations API(`element.animate`)를 쓰고, 두 번째 구간이 시작될 때 복제 카드의 `z-index`를 실제 카드보다 낮춘다. `.leaving` 스타일을 `css/style.css`에 추가한다.

- [ ] **Step 4: `main.js`의 `navigate`를 고친다**

`busy` 플래그를 둔다. `busy`이면 즉시 돌아간다. 아니면 `deck.next()`/`deck.prev()`를 부르고, `'stay'`이면 애니메이션 없이 돌아간다. 그 외에는 `busy = true`로 두고 `await playTransition(#card, dir, swap)`을 부른다. `swap`은 `renderCurrent()`와 `renderProgress()`를 부른다. 끝나면 `busy = false`. 마지막 카드에서 넘기는 재시작도 같은 경로를 탄다. 필터 버튼 클릭은 `busy`이면 무시한다.

- [ ] **Step 5: 통과 확인**

Run: `node --test`
Expected: PASS (전부)

- [ ] **Step 6: 수동 점검**

Expected (모두 만족):

- 카드 뒤에 남은 카드가 겹쳐 보이고, 넘기면 맨 위 카드가 방향대로 기울며 밀려난 뒤 덱 뒤로 들어가고 다음 카드가 올라온다. 전체가 약 0.5초다.
- 이전(←, 오른쪽으로 쓸기)은 반대 방향으로 같은 효과가 난다.
- 마지막 카드에서 다음으로 넘기는 재시작도 같은 애니메이션이 나온다.
- 남은 카드가 2장 미만이면 뒤쪽 유령 카드가 줄어들거나 사라진다.
- → 키를 길게 누르거나 빠르게 연타해도 한 번에 한 전환만 일어난다.
- 전환이 끝난 뒤 개발자 도구 콘솔에서 `document.querySelectorAll('.leaving').length`가 `0`이다.

- [ ] **Step 7: 커밋**

```bash
git add js/animate.js tests/animate.test.js js/main.js css/style.css
git commit -m "feat: 덱 뒤로 넘기는 카드 전환 애니메이션"
```

---

### Task 7: 긴 카드 글자 크기 자동 축소와 최종 점검

**Files:**

- Create: `js/fit.js`, `tests/fit.test.js`
- Modify: `js/main.js`, `css/style.css`

**Interfaces:**

- Consumes: `renderCard(…, onToggle)` (Task 4), `renderCurrent` (Task 4)
- Produces:
  - `MIN_SCALE = 0.6` (`js/fit.js`에서 export)
  - `pickScale(contentHeight: number, availableHeight: number, minScale?: number): number` — 내용이 들어가면 `1`, 아니면 `availableHeight / contentHeight`. 결과는 항상 `minScale` 이상 `1` 이하.
  - `fitCard(cardEl: HTMLElement, availableHeight: number): void` — 카드의 글자 배율을 정한다. 카드의 `font-size`를 `calc(1rem * var(--scale))` 형태로 두고 `--scale`만 바꾼다. `MIN_SCALE`에서도 넘치면 카드에 `scrollable` 클래스를 붙이고 `max-height`를 `availableHeight`로 두어 카드 안쪽 세로 스크롤을 허용한다. 넘치지 않으면 `scrollable`을 뗀다.
  - `getAvailableHeight(stageEl: HTMLElement): number` — 스테이지 높이에서 위아래 패딩을 뺀 값.

- [ ] **Step 1: 실패하는 테스트를 쓴다** — `tests/fit.test.js`

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/fit.test.js`
Expected: FAIL (`js/fit.js`를 찾을 수 없다는 오류)

- [ ] **Step 3: `js/fit.js`를 구현한다**

`pickScale`은 DOM에 의존하지 않는다. `fitCard`는 배율을 1로 되돌려 높이를 재고 `pickScale`로 정한 뒤 적용한다. 글이 줄바꿈되기 때문에 높이는 배율에 정확히 비례하지 않는다. 적용한 뒤 다시 재서 아직 넘치면 몇 번 더 줄이는 식으로 반복한다(최대 5번쯤, 구체적인 방식은 만드는 사람이 정한다).

- [ ] **Step 4: 통과 확인**

Run: `node --test`
Expected: PASS (전부)

- [ ] **Step 5: `main.js`와 `css/style.css`에 연결한다**

`renderCurrent` 끝, `renderCard`의 `onToggle`, `window`의 `resize`와 `orientationchange`에서 `fitCard(#card, getAvailableHeight(#stage))`를 부른다. 카드 스타일에 `font-size: calc(1rem * var(--scale, 1))`와 `.card.scrollable { overflow-y: auto }`를 둔다. 폭 600px 이하에서 쓰는 글자 크기도 `--scale`을 곱하는 방식으로 맞춘다.

- [ ] **Step 6: 수동 점검**

Expected (모두 만족):

- 샘플의 긴 주관식을 폭 360px 정도(기기 모드)에서 펼치면 글자가 줄어 카드가 위아래로 잘리지 않고 화면 여백 안에 들어온다. 접으면 글자가 다시 커진다.
- 창 크기를 줄였다 늘리거나 기기 모드에서 회전하면 다시 맞춰진다.
- 일부러 `questions.json`에 3000자짜리 정답을 넣으면 글자가 하한(`MIN_SCALE`)에서 멈추고, 그때만 카드 안쪽에서 스크롤된다. 카드 자체는 잘리지 않는다. 확인 후 원래대로 되돌린다.
- 글자가 줄어든 카드에서도 카드가 화면 정중앙에 있다.

- [ ] **Step 7: 최종 점검**

`docs/superpowers/specs/2026-11-08-flash-card-design.md`의 "목표", "안티 목표", "화면과 동작"을 위에서 아래로 읽으며 각 항목을 실제 화면에서 하나씩 확인한다. Run: `node --test` / Expected: PASS (전부). 어긋난 항목이 있으면 고친 뒤 다시 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add js/fit.js tests/fit.test.js js/main.js css/style.css
git commit -m "feat: 긴 카드 글자 크기 자동 축소"
```

---

### Task 8: GitHub public 저장소와 Vercel 자동 배포

**Files:**

- Modify: `README.md` (배포 섹션 추가), `.gitignore` (`.vercel/` 추가)

**Interfaces:**

- Consumes: Task 1~7의 결과가 모두 로컬 커밋으로 들어 있어야 한다.
- Produces: GitHub public 저장소 `seophohoho/flash-card`, 공개 배포 URL, `main`에 push하면 자동으로 배포되는 연결.

- [ ] **Step 1: 사용자에게 확인을 받는다**

저장소를 public으로 만들면 소스, `questions.json`, `docs/`(설계 문서와 이 계획)가 누구에게나 보인다. 사용자에게 "계정 `seophohoho`, 이름 `flash-card`, public으로 만들고 push합니다"라고 알리고 승인을 받은 뒤에 다음 단계로 간다. 승인이 없으면 여기서 멈춘다.

- [ ] **Step 2: 남은 파일을 커밋하고 브랜치를 `main`으로 맞춘다**

```bash
node --test
git add docs questions-format.md
git commit -m "docs: 설계 문서와 구현 계획 추가"
git branch -M main
git status
```

Expected: `node --test` PASS, `git status`가 "nothing to commit, working tree clean"이고 브랜치가 `main`이다. `.superpowers/`는 `.gitignore`에 있어 커밋되지 않는다.

- [ ] **Step 3: 저장소를 만들고 push한다**

```bash
gh auth status
gh repo create flash-card --public --source=. --remote=origin --push
git ls-remote origin main
```

Expected: `gh auth status`에 계정 `seophohoho`가 활성으로 나온다. 저장소 URL이 출력되고, `git ls-remote`의 해시가 `git rev-parse HEAD`와 같다.

- [ ] **Step 4: Vercel에 저장소를 연결한다**

Vercel CLI는 프로젝트에 설치하지 않고 `npx vercel`로만 쓴다(`package.json`을 바꾸지 않는다). 로그인은 브라우저 인증이라 사용자가 `! npx vercel login`을 직접 실행한다. 로그인 뒤 순서는 다음과 같다.

```bash
npx vercel link --yes --project flash-card
npx vercel git connect
npx vercel --prod
```

프로젝트 설정은 Framework Preset "Other", Build Command와 Output Directory는 비움이다. `.gitignore`에 `.vercel/`이 없으면 추가한다. `vercel git connect`가 Vercel GitHub 앱이 설치돼 있지 않다고 실패하면, 사용자가 `https://vercel.com/new`에서 `seophohoho/flash-card`를 Import하고 GitHub 앱 설치를 승인하는 방법으로 대신한다. 그 경우에도 위 설정값은 같다.

- [ ] **Step 5: 첫 배포를 확인한다**

```bash
npx vercel ls
curl -sI <배포 URL>
curl -s <배포 URL>/questions.json
```

Expected: 최신 배포 상태가 Ready(Production)이고, 첫 `curl`이 `200`이며, 두 번째 `curl`이 `questions.json` 내용을 돌려준다. 브라우저로 배포 URL을 열면 카드가 보이고 방향키로 넘겨진다.

- [ ] **Step 6: push하면 자동 배포되는지 확인한다**

`README.md`에 "배포" 섹션을 추가한다: 저장소 주소, 배포 URL, "`main`에 push하면 Vercel이 자동으로 배포한다", 배포 상태 확인 방법(`npx vercel ls` 또는 Vercel 대시보드). 그 뒤 커밋하고 push한다.

```bash
git add README.md .gitignore
git commit -m "docs: README에 배포 섹션 추가"
git push
npx vercel ls
```

Expected: 몇 분 안에 `npx vercel ls`에 방금 push한 커밋의 새 Production 배포가 나타나고 Ready가 된다. 이 push는 사용자가 따로 손대지 않아도 배포가 일어난다는 증거다.
