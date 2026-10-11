// 构建：把样式、题库、程序全部内联成一个可离线双击打开的 HTML 文件。
//   dist/生物会考冲A.html   —— 完整离线版（电脑双击 / 手机浏览器打开）
//   dist/artifact.html      —— 网页预览版（无 doctype 外壳，供在线发布）
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = p => readFileSync(join(ROOT, p), "utf8");
const list = dir => existsSync(join(ROOT, dir))
  ? readdirSync(join(ROOT, dir)).filter(f => f.endsWith(".js")).sort().map(f => `${dir}/${f}`)
  : [];

export const SCRIPT_ORDER = [
  "src/app/core.js",
  "src/app/figkit.js",
  "data/chapters.js",
  ...list("data/figures"),
  ...list("data/questions"),
  ...list("data/handbook"),
  "src/app/icons.js",
  "src/app/ui.js",
  "src/app/store.js",
  "src/app/engine.js",
  "src/app/exam.js",
  "src/app/views-main.js",
  "src/app/views-more.js",
  "src/app/main.js"
];

export function bundleJs() {
  const parts = SCRIPT_ORDER.map(p => `/* ---- ${p} ---- */\n${rd(p)}`);
  return `(function () {\n${parts.join("\n")}\n})();`;
}

function build() {
  const css = rd("src/styles.css");
  const js = bundleJs().replace(/<\/script/gi, "<\\/script");
  const title = "生物会考冲A";
  const boot = `<div id="app"><div class="boot" style="padding:2rem;font-family:sans-serif">正在加载题库……如果一直停在这里，请换用 Chrome、Edge、Safari 或 QQ 浏览器打开。</div></div>`;
  const noscript = `<noscript><p style="padding:2rem">需要开启 JavaScript 才能使用本程序。</p></noscript>`;

  const full = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="description" content="湖南八年级生物学会考离线刷题：人教版新教材章节练习、全真模考、错题本、开卷速查手册、老师组卷打印。">
<title>${title}</title>
<style>
${css}
</style>
</head>
<body>
${boot}
${noscript}
<script>
${js}
</script>
</body>
</html>
`;

  const artifact = `<title>${title}</title>
<style>
${css}
</style>
${boot}
<script>window.__ARTIFACT__ = true;</script>
<script>
${js}
</script>
`;

  mkdirSync(join(ROOT, "dist"), { recursive: true });
  writeFileSync(join(ROOT, "dist", `${title}.html`), full);
  writeFileSync(join(ROOT, "dist", "artifact.html"), artifact);
  const kb = n => (Buffer.byteLength(n) / 1024).toFixed(0) + " KB";
  console.log(`dist/${title}.html  ${kb(full)}`);
  console.log(`dist/artifact.html  ${kb(artifact)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
