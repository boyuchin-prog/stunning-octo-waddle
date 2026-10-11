// 题库校验：结构、答案、图片引用、解析中是否误用选项字母、重复题干等。
// 用法：node tools/validate.mjs [--quiet]
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const quiet = process.argv.includes("--quiet");
const rd = p => readFileSync(join(ROOT, p), "utf8");
const list = d => readdirSync(join(ROOT, d)).filter(f => f.endsWith(".js")).sort().map(f => `${d}/${f}`);
const files = ["src/app/core.js", "src/app/figkit.js", "data/chapters.js", ...list("data/figures"), ...list("data/questions"), ...list("data/handbook")];

const ctx = { window: {}, document: undefined, console };
vm.createContext(ctx);
const code = files.map(f => `/* ${f} */\n` + rd(f)).join("\n") + "\n;globalThis.__BANK = BANK;";
vm.runInContext(code, ctx, { filename: "bundle.js" });
const BANK = ctx.__BANK;

const errs = [], warns = [];
const E = (q, m) => errs.push(`${q.id || q}: ${m}`);
const W = (q, m) => warns.push(`${q.id || q}: ${m}`);
for (const e of BANK.errors) errs.push(e);

const letterRef = /(^|[^A-Za-z])(?:[A-D]项|选项[A-D]|[A-D]选项|[A-D]、[A-D]两项|[（(][A-D][)）]|[A-D]正确|[A-D]错误|故选[A-D]|答案[为是选]?[A-D])/;
const norm = s => String(s).replace(/<[^>]+>/g, "").replace(/[\s　，。、；：！？“”‘’（）()【】《》,.;:!?'"·…—\-_]/g, "");
const stems = new Map();

function checkChoice(q, o, a, where) {
  if (!Array.isArray(o) || o.length < 3) return E(q, `${where}选项不足`);
  if (o.some(x => x == null || String(x).trim() === "")) E(q, `${where}有空选项`);
  if (new Set(o.map(norm)).size !== o.length) E(q, `${where}选项重复`);
  if (!Number.isInteger(a) || a < 0 || a >= o.length) E(q, `${where}答案下标无效`);
  if (!q.pool && o.length !== 4) W(q, `${where}选项数为 ${o.length}`);
  if (!q.ns && o.some(x => /以上|都对$|都不对$|均正确$|均错误$|都正确$|都错误$/.test(x))) W(q, `${where}含“以上/都”类选项但未设 ns`);
}

for (const q of BANK.qs) {
  if (q.auto) continue;
  if (!BANK.chMap[q.ch]) E(q, "章节无效");
  if (![1, 2, 3].includes(q.d)) E(q, "难度应为 1/2/3");
  if (!q.kp) E(q, "缺少考点 kp");
  if (q.fig && !BANK.figs[q.fig]) E(q, `图片 ${q.fig} 不存在`);
  if (q.t === "s") {
    checkChoice(q, q.o, q.a, "");
    if (!q.e) E(q, "缺少解析");
  } else if (q.t === "j") {
    if (typeof q.a !== "boolean") E(q, "判断题答案应为 true/false");
    if (!q.e) E(q, "缺少解析");
  } else if (q.t === "c") {
    if (!["识图", "实验", "资料", "综合"].includes(q.ct)) E(q, "非选择题类型 ct 无效");
    if (!Array.isArray(q.subs) || !q.subs.length) E(q, "缺少小题");
    else {
      q.subs.forEach((s, i) => {
        const w = `第${i + 1}小题`;
        if (!(s.p > 0)) E(q, `${w}缺少分值`);
        if (s.t === "s") checkChoice(q, s.o, s.a, w);
        else if (s.t === "j") { if (typeof s.a !== "boolean") E(q, `${w}判断答案无效`); }
        else if (s.t === "f") { if (!Array.isArray(s.a) || !s.a.length || s.a.some(x => typeof x !== "string" || !x.trim())) E(q, `${w}填空答案应为非空字符串数组`); }
        else if (s.t === "o") { if (typeof s.a !== "string" || !s.a.trim()) E(q, `${w}简答参考答案缺失`); }
        else E(q, `${w}题型无效`);
        if (s.e && letterRef.test(s.e)) W(q, `${w}解析可能引用了选项字母：${s.e.slice(0, 30)}`);
      });
      const p = q.subs.reduce((t, s) => t + (s.p || 0), 0);
      if (![6, 8, 10, 12].includes(p)) W(q, `总分 ${p} 不在 6/8/10/12 中`);
    }
    const txt = (q.title || "") + (q.m || "") + q.subs.map(s => s.q).join("");
    if (/图/.test(txt) && /下图|图中|如图|据图|右图|左图/.test(txt) && !q.fig && !/<svg|<table/.test(q.m || "")) W(q, "提到图但没有 fig");
  } else E(q, `题型 ${q.t} 无效`);
  if (q.t !== "c") {
    if (/下图|图中|如图|据图/.test(q.q) && !q.fig) W(q, "题干提到图但没有 fig");
    if (q.e && letterRef.test(q.e)) W(q, `解析可能引用了选项字母：${q.e.slice(0, 40)}`);
    const k = norm(q.q) + "|" + (q.o ? q.o.map(norm).sort().join("|") : String(q.a));
    if (stems.has(k)) E(q, `与 ${stems.get(k)} 重复`);
    stems.set(k, q.id);
  }
}

/* 速查手册引用的图 */
for (const [ch, d] of Object.entries(BANK.hb)) {
  if (!BANK.chMap[ch]) errs.push(`手册章节 ${ch} 无效`);
  for (const s of d.secs || []) if (s.fig && !BANK.figs[s.fig]) errs.push(`手册 ${ch} 引用的图 ${s.fig} 不存在`);
}
/* 图的标注 */
for (const f of BANK.figList) {
  if (f.ch && !BANK.chMap[f.ch]) errs.push(`图 ${f.id} 的章节无效`);
  if (f.labels) {
    const names = f.labels.map(l => l.name);
    if (new Set(names).size !== names.length) errs.push(`图 ${f.id} 有重复的结构名称`);
    const ns = f.labels.map(l => String(l.n));
    if (new Set(ns).size !== ns.length) errs.push(`图 ${f.id} 有重复的序号`);
  }
}

/* 统计 */
const rows = [];
let tot = { s: 0, j: 0, c: 0, cp: 0 };
const ansDist = [0, 0, 0, 0];
for (const c of BANK.chapters) {
  const qs = BANK.byCh[c.id].filter(q => !q.auto);
  const n = t => qs.filter(q => q.t === t).length;
  const cp = qs.filter(q => q.t === "c").reduce((t, q) => t + q.p, 0);
  rows.push(`${c.id.padEnd(5)} ${c.name.padEnd(14, "　")} 单选${String(n("s")).padStart(4)} 判断${String(n("j")).padStart(4)} 非选${String(n("c")).padStart(3)}（${cp}分） 手册${BANK.hb[c.id] ? "✓" : "—"}`);
  tot.s += n("s"); tot.j += n("j"); tot.c += n("c"); tot.cp += cp;
  qs.filter(q => q.t === "s").forEach(q => { if (q.a < 4) ansDist[q.a]++; });
}
if (!quiet) {
  console.log(rows.join("\n"));
  console.log(`合计：单选 ${tot.s}，判断 ${tot.j}，非选择 ${tot.c}（${tot.cp}分），示意图 ${BANK.figList.length} 幅`);
  const ct = {}; BANK.qs.filter(q => q.t === "c").forEach(q => ct[q.ct] = (ct[q.ct] || 0) + 1);
  console.log("非选择题类型：", JSON.stringify(ct));
  console.log(`原始答案位置分布 A/B/C/D：${ansDist.join(" / ")}（做题时会打乱）`);
}
if (warns.length) console.log(`\n提醒 ${warns.length} 条：\n` + warns.join("\n"));
if (errs.length) { console.log(`\n错误 ${errs.length} 条：\n` + errs.join("\n")); process.exitCode = 1; }
else console.log("\n校验通过");
