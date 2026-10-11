// 组卷规则测试：全真模考必须满足 25 道单选（按册 6/8/6/5）、非选择题 5～7 道且合计 50 分、
// 非选择题每册 1～2 道且不重复同一章。用法：node tests/exam-compose.mjs [次数]
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = p => readFileSync(join(ROOT, p), "utf8");
const list = d => readdirSync(join(ROOT, d)).filter(f => f.endsWith(".js")).sort().map(f => `${d}/${f}`);
const files = ["src/app/core.js", "src/app/figkit.js", "data/chapters.js", ...list("data/figures"), ...list("data/questions"), "src/app/exam.js"];
const ctx = { window: {}, console, Store: { rec: () => null } };
vm.createContext(ctx);
vm.runInContext(files.map(rd).join("\n") + "\n;globalThis.__X = { BANK, Exam, EXAM_SPEC };", ctx);
const { BANK, Exam, EXAM_SPEC } = ctx.__X;

const runs = Number(process.argv[2]) || 300;
const fails = [];
const bookCaseHist = {};
for (let i = 0; i < runs; i++) {
  const m = Exam.makeMock({ full: true, seed: 1000 + i });
  const mcq = m.mcq.map(id => BANK.qMap[id]), cases = m.cases.map(id => BANK.qMap[id]);
  const tag = `seed ${1000 + i}`;
  if (mcq.length !== EXAM_SPEC.mcqCount) fails.push(`${tag}: 单选 ${mcq.length} 道`);
  if (new Set(m.mcq).size !== m.mcq.length) fails.push(`${tag}: 单选有重复`);
  const perBook = {};
  mcq.forEach(q => { const b = BANK.chMap[q.ch].book; perBook[b] = (perBook[b] || 0) + 1; });
  for (const [b, n] of Object.entries(EXAM_SPEC.bookQuota)) if ((perBook[b] || 0) !== n) fails.push(`${tag}: ${b} 单选 ${perBook[b] || 0} 道（应 ${n}）`);
  const pts = cases.reduce((s, q) => s + q.p, 0);
  if (pts !== EXAM_SPEC.casePoints) fails.push(`${tag}: 非选择题 ${pts} 分`);
  if (cases.length < EXAM_SPEC.caseCountMin || cases.length > EXAM_SPEC.caseCountMax) fails.push(`${tag}: 非选择题 ${cases.length} 道`);
  const chs = cases.map(q => q.ch);
  if (new Set(chs).size !== chs.length) fails.push(`${tag}: 非选择题同章重复`);
  const cb = {};
  cases.forEach(q => { const b = BANK.chMap[q.ch].book; cb[b] = (cb[b] || 0) + 1; });
  if (Object.values(cb).some(n => n > 2)) fails.push(`${tag}: 某册非选择题超过 2 道 ${JSON.stringify(cb)}`);
  if (["7a", "7b", "8a", "8b"].some(b => !cb[b])) fails.push(`${tag}: 有一册没有非选择题 ${JSON.stringify(cb)}`);
  const key = ["7a", "7b", "8a", "8b"].map(b => cb[b] || 0).join("-");
  bookCaseHist[key] = (bookCaseHist[key] || 0) + 1;
}
console.log(`组卷 ${runs} 次；非选择题按册分布（七上-七下-八上-八下）：`, bookCaseHist);
if (fails.length) { console.log(fails.slice(0, 20).join("\n")); console.log(`失败 ${fails.length} 处`); process.exit(1); }
console.log("组卷规则全部满足");
