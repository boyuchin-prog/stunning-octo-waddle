// 示意图预览：把所有示意图渲染成 PNG，便于逐张检查。
// 用法：node tools/figpreview.mjs <输出目录> [图名过滤] [--dark]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || join(ROOT, "dist", "figs");
const filter = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : "";
const dark = process.argv.includes("--dark");
mkdirSync(out, { recursive: true });

const rd = p => readFileSync(join(ROOT, p), "utf8");
const figs = readdirSync(join(ROOT, "data/figures")).filter(f => f.endsWith(".js")).sort();
const js = ["src/app/core.js", "src/app/figkit.js", "data/chapters.js", ...figs.map(f => "data/figures/" + f)].map(rd).join("\n");
const html = `<!doctype html><html lang="zh-CN"${dark ? ' data-theme="dark"' : ""}><head><meta charset="utf-8"><style>${rd("src/styles.css")}
body{padding:16px} .cell{display:inline-block;vertical-align:top;margin:8px;padding:8px;background:var(--surface);border:1px solid var(--line);width:620px}</style></head>
<body><div id="g"></div><script>(function(){${js}
const g=document.getElementById('g');
BANK.figList.filter(f=>!${JSON.stringify(filter)}||f.id.includes(${JSON.stringify(filter)})).forEach(f=>{
  const d=document.createElement('div');d.className='cell';d.id='c-'+f.id;
  d.innerHTML=figHtml(f.id,{names:true,zoom:false})+figHtml(f.id,{names:false,zoom:false});
  g.appendChild(d);
});
window.__figs=BANK.figList.map(f=>f.id);
})();</script></body></html>`;
const page = join(out, "_figs.html");
writeFileSync(page, html);

const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 700, height: 900 }, deviceScaleFactor: 1.5 });
const errors = [];
p.on("pageerror", e => errors.push(e.message));
await p.goto("file://" + page);
const ids = await p.evaluate(() => Array.from(document.querySelectorAll(".cell")).map(e => e.id));
for (const id of ids) {
  await p.locator("#" + id).screenshot({ path: join(out, id.slice(2) + (dark ? "-dark" : "") + ".png") });
}
await browser.close();
console.log(`rendered ${ids.length} figures to ${out}`);
if (errors.length) { console.log("ERRORS:\n" + errors.join("\n")); process.exitCode = 1; }
