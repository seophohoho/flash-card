import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildExam } from "./exam-parse.js";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.argv[2] || resolve(here, "../../ws_hw"));
const target = resolve(process.argv[3] || resolve(here, "../exam/exam.json"));

const { problems, warnings } = buildExam(source);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify({ problems }, null, 1)}\n`);

console.log(`${problems.length}개 문제 -> ${target}`);
for (const message of warnings) console.warn(`경고: ${message}`);
