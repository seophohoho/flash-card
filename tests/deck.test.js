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
