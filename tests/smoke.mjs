// 冒烟测试：在无头浏览器中打开离线版，走一遍主要页面和做题流程，检查脚本错误。
// 用法：node tests/smoke.mjs [截图目录]
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "file://" + join(ROOT, "dist", "生物会考冲A.html");
const SHOTS = process.argv[2] || "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const errors = [];
const browser = await chromium.launch();

async function run(name, viewport, fn, opts) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: (opts && opts.dark) ? "dark" : "light" });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`[${name}] console: ${m.text()}`); });
  await page.goto(FILE);
  await page.waitForSelector(".page, .immersive");
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}-${n}.png`), fullPage: !!(opts && opts.full) }); };
  await fn(page, shot);
  // 页面不应横向滚动
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) errors.push(`[${name}] 页面横向溢出 ${overflow}px`);
  await ctx.close();
}

const flow = async (page, shot) => {
  await shot("home");
  await page.click('a[href="#practice"]:visible');
  await page.waitForSelector(".chlist");
  await shot("practice");
  await page.click('a[href="#ch/u1c2"]');
  await page.waitForSelector(".actions");
  await shot("chapter");
  await page.click('[data-act="chSeq"]');
  await page.waitForSelector(".qcard");
  await shot("q-before");
  await page.click('.qcard .opt >> nth=0');
  await page.waitForSelector(".ana");
  await shot("q-after");
  // 连续答 5 题
  for (let i = 0; i < 5; i++) {
    await page.click('[data-act="next"]');
    await page.waitForSelector(".qcard");
    const opt = await page.$('.qcard .opts .opt:not([disabled])');
    if (opt) await opt.click();
  }
  await page.click('[data-act="sheet"]');
  await page.waitForSelector(".sheet");
  await shot("sheet");
  await page.keyboard.press("Escape");
  await page.click('[data-act="quit"]');
  await page.waitForSelector(".summary");
  await page.click('[data-act="leaveRun"]');
  // 非选择题
  await page.goto(FILE + "#ch/u1c2");
  await page.waitForSelector(".actions");
  await page.click('[data-act="chCase"]');
  await page.waitForSelector(".subs");
  await page.click('.sub .opt >> nth=0');
  await page.fill('.sub .fillin', "④");
  await page.click('[data-act="subFill"]');
  await shot("case");
  // 错题本、模考、手册、组卷、设置
  for (const h of ["#wrong/all", "#exam", "#hb", "#special", "#teacher", "#me", "#about", "#search"]) {
    await page.goto(FILE + h);
    await page.waitForSelector(".page");
    await shot(h.replace(/[#/]/g, "_"));
  }
  await page.fill("#searchInput", "细胞膜");
  await page.waitForTimeout(400);
  await shot("search-res");
  // 模考：开始并交卷
  await page.goto(FILE + "#exam");
  await page.click('[data-act="startMock"][data-kind="full"]');
  await page.waitForSelector(".runbody");
  await shot("exam");
  await page.click('.qcard .opt >> nth=1');
  await page.click('[data-act="sheet"]');
  await page.click('.sheet ~ .row-end [data-act="submitExam"]');
  await page.click('[data-act="confirmOk"]');
  await page.waitForTimeout(300);
  if (await page.$('[data-act="finishExam"]')) await page.click('.row-end [data-act="finishExam"]');
  await page.waitForSelector(".result");
  await shot("result");
  // 组卷
  await page.goto(FILE + "#teacher");
  await page.click('[data-act="tMake"]');
  await page.waitForSelector(".paper");
  await shot("paper");
};

await run("phone", { width: 390, height: 844 }, flow);
await run("desktop", { width: 1280, height: 860 }, flow);
await run("phone-dark", { width: 390, height: 844 }, async (page, shot) => {
  await shot("home");
  await page.goto(FILE + "#ch/u1c2");
  await page.click('[data-act="chCase"]');
  await page.waitForSelector(".subs");
  await shot("case");
}, { dark: true });

await browser.close();
if (errors.length) { console.log("发现问题：\n" + errors.join("\n")); process.exitCode = 1; }
else console.log("smoke ok");
