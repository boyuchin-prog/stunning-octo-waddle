// 导出开卷速查手册 PDF（A4，可直接打印发给学生）：dist/开卷速查手册.pdf
// 用法：先 node tools/build.mjs，再 node tools/handbook-pdf.mjs
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto("file://" + join(ROOT, "dist", "生物会考冲A.html") + "#hb");
await page.evaluate(() => { window.print = () => {}; });
await page.click('[data-act="printHb"][data-ch="all"]');
await page.waitForTimeout(300);
await page.emulateMedia({ media: "print" });
const out = join(ROOT, "dist", "开卷速查手册.pdf");
await page.pdf({ path: out, format: "A4", preferCSSPageSize: true });
await browser.close();
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("dist/开卷速查手册.pdf");
