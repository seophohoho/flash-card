import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseBlocks, parseInline, splitParts } from "../js/markdown.js";

test("제목과 문단", () => {
  assert.deepEqual(parseBlocks("## 제목\n\n글 한 줄\n이어지는 줄"), [
    { type: "heading", level: 2, text: "제목" },
    { type: "paragraph", text: "글 한 줄 이어지는 줄" },
  ]);
});

test("중첩 목록", () => {
  const [list] = parseBlocks("- a\n  - b\n  - c\n- d");
  assert.equal(list.items.length, 2);
  assert.equal(list.items[0].children[0].items.length, 2);
});

test("번호 목록", () => {
  const [list] = parseBlocks("1. a\n2. b");
  assert.equal(list.ordered, true);
});

test("표", () => {
  const [table] = parseBlocks("| a | `x|y` |\n|---|---|\n| 1 | 2 |");
  assert.deepEqual(table.header, ["a", "`x|y`"]);
  assert.deepEqual(table.rows, [["1", "2"]]);
});

test("코드 블록과 mermaid", () => {
  const blocks = parseBlocks("```mermaid\nflowchart LR\n A-->B\n```\n\n```\nplain\n```");
  assert.equal(blocks[0].lang, "mermaid");
  assert.equal(blocks[1].lang, "");
});

test("문단 뒤에 바로 오는 목록", () => {
  const blocks = parseBlocks("복습\n- a\n- b");
  assert.deepEqual(blocks.map((b) => b.type), ["paragraph", "list"]);
});

test("인라인", () => {
  assert.deepEqual(parseInline("a **b** `c`<br/>d"), [
    { type: "text", value: "a " },
    { type: "bold", value: "b" },
    { type: "text", value: " " },
    { type: "code", value: "c" },
    { type: "br" },
    { type: "text", value: "d" },
  ]);
});

test("실제 요약 파일은 3편으로 나뉘고 다이어그램 35개", () => {
  const md = readFileSync(new URL("../summary/flink.md", import.meta.url), "utf8");
  const parts = splitParts(md);
  assert.equal(parts.length, 3);
  const blocks = parts.flatMap((p) => parseBlocks(p.markdown));
  assert.equal(blocks.filter((b) => b.type === "code" && b.lang === "mermaid").length, 35);
  assert.equal(blocks.filter((b) => b.type === "table").length > 5, true);
});

test("Spark 요약 파일은 3편으로 나뉘고 다이어그램 11개", () => {
  const md = readFileSync(new URL("../summary/spark.md", import.meta.url), "utf8");
  const parts = splitParts(md);
  assert.equal(parts.length, 3);
  const blocks = parts.flatMap((p) => parseBlocks(p.markdown));
  assert.equal(blocks.filter((b) => b.type === "code" && b.lang === "mermaid").length, 11);
  assert.equal(blocks.filter((b) => b.type === "table").length > 5, true);
});
