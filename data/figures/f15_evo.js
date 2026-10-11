/* 八下第六单元第三章：米勒实验、生物进化树、地层中的化石 */
(function () {
  const { co, txt, arr, cbox, link, lbl } = FK;

  /* ---------- 米勒模拟实验装置 ---------- */
  let m = "";
  m += `<path class="st thick nf" d="M90 212 V100 H262"/>`;                                   // 上方导管
  m += `<path class="st thick nf" d="M320 158 V296 H150 Q128 296 120 272"/>`;                 // 回流导管
  m += `<rect class="k c-wat" x="306" y="182" width="28" height="70" rx="4"/>`;              // 冷凝器外套
  m += `<path class="st thick nf" d="M320 182 V252"/>`;
  m += arr(352, 240, 336, 240, "ar mut", 6) + arr(304, 192, 286, 192, "ar mut", 6);
  m += txt(356, 244, "冷水", "tx sm", "start");
  m += `<circle class="k c-wht" cx="320" cy="100" r="58"/>`;                                 // 大烧瓶
  m += `<path class="st" d="M280 30 L306 88 M360 30 L334 88"/><circle class="c-line" cx="306" cy="88" r="3"/><circle class="c-line" cx="334" cy="88" r="3"/>`;
  m += `<path class="st nf" style="stroke:var(--f-red);stroke-width:1.6" d="M309 89 l5 -6 l4 9 l5 -9 l4 7 l4 -2"/>`;
  m += `<circle class="k c-wht" cx="90" cy="246" r="36"/>`;                                  // 小烧瓶
  m += `<path class="k c-wat" d="M55 252 A36 36 0 0 0 125 252 Z"/>`;
  [[80, 262], [96, 270], [104, 258]].forEach(([x, y]) => { m += `<circle class="st nf" cx="${x}" cy="${y}" r="3"/>`; });
  m += `<path class="k c-org" d="M78 316 C76 300 88 294 90 284 C92 294 104 300 102 316 Z"/>`;  // 火焰
  m += `<circle class="k c-yel" cx="320" cy="296" r="9"/>`;                                  // 取样处
  m += arr(170, 90, 204, 90, "ar mut", 6) + arr(262, 306, 228, 306, "ar mut", 6);
  m += co(1, 284, 38, 236, 30, "正负电极", "l");
  m += co(2, 322, 124, 412, 70, "原始大气", "r");
  m += co(3, 334, 214, 412, 200, "冷凝器", "r");
  m += co(4, 90, 266, 160, 236, "沸水", "r");
  m += co(5, 329, 298, 412, 292, "取样活塞", "r");
  BANK.fig("miller", {
    title: "米勒模拟原始地球条件的实验装置示意图", vb: "20 10 480 316", maxw: 480, ch: "u6c3", kp: "生命的起源",
    body: m,
    labels: [
      { n: 1, name: "正负电极", fn: "进行火花放电，模拟原始地球上的闪电" },
      { n: 2, name: "原始大气", fn: "含甲烷、氨、氢、水蒸气等，没有氧气" },
      { n: 3, name: "冷凝器", fn: "使水蒸气冷凝，模拟降雨" },
      { n: 4, name: "沸水", fn: "加热后产生水蒸气，模拟原始海洋" },
      { n: 5, name: "取样活塞", fn: "从这里取样，检测到了氨基酸等有机小分子" }
    ]
  });

  /* ---------- 生物进化树 ---------- */
  const T = {
    生命: { x: 300, y: 366, w: 92, h: 26, s: "原始生命" },
    藻类: { x: 170, y: 310, w: 92, h: 26, s: "原始藻类" },
    苔藓: { x: 70, y: 236, w: 112, h: 26, s: "原始苔藓植物" },
    蕨类: { x: 220, y: 236, w: 116, h: 26, n: 1, s: "原始蕨类植物" },
    种子: { x: 220, y: 160, w: 112, h: 26, s: "原始种子植物" },
    裸子: { x: 116, y: 86, w: 112, h: 26, s: "原始裸子植物" },
    被子: { x: 276, y: 86, w: 116, h: 26, n: 2, s: "原始被子植物" },
    单细胞: { x: 446, y: 310, w: 120, h: 26, s: "原始单细胞动物" },
    无脊椎: { x: 446, y: 254, w: 120, h: 26, s: "原始无脊椎动物" },
    鱼: { x: 446, y: 198, w: 104, h: 26, n: 3, s: "原始鱼类" },
    两栖: { x: 446, y: 142, w: 104, h: 26, n: 4, s: "原始两栖类" },
    爬行: { x: 446, y: 86, w: 104, h: 26, s: "原始爬行类" },
    鸟: { x: 384, y: 30, w: 104, h: 26, n: 5, s: "原始鸟类" },
    哺乳: { x: 520, y: 30, w: 104, h: 26, s: "原始哺乳类" }
  };
  let t = "";
  [["生命", "藻类"], ["生命", "单细胞"], ["藻类", "苔藓"], ["藻类", "蕨类"], ["蕨类", "种子"], ["种子", "裸子"], ["种子", "被子"],
    ["单细胞", "无脊椎"], ["无脊椎", "鱼"], ["鱼", "两栖"], ["两栖", "爬行"], ["爬行", "鸟"], ["爬行", "哺乳"]]
    .forEach(([a, b]) => { t += link(T[a], T[b]); });
  Object.values(T).forEach(r => {
    if (r.n) t += `<g class="bx hl"><rect x="${r.x - r.w / 2}" y="${r.y - r.h / 2}" width="${r.w}" height="${r.h}" rx="6"/></g>` + lbl(r.n, r.x, r.y, r.s, "c");
    else t += cbox(r, r.s);
  });
  BANK.fig("evotree", {
    title: "生物进化树示意图（部分）", vb: "4 10 590 372", maxw: 560, ch: "u6c3", kp: "生物进化的历程",
    dq: "图中{n}代表的生物类群是",
    body: t,
    labels: Object.values(T).filter(r => r.n).sort((a, b) => a.n - b.n).map(r => ({ n: r.n, name: r.s }))
  });

  /* ---------- 地层中的化石 ---------- */
  let s = "";
  [["甲", 20, "c-soil"], ["乙", 84, "c-bone"], ["丙", 148, "c-gry"]].forEach(([k, y, cls]) => {
    s += `<rect class="k ${cls}" x="50" y="${y}" width="300" height="64"/>` + txt(30, y + 37, k, "tx b", "middle", 15);
  });
  // 丙：三叶虫、藻类
  const tri = (x, y) => `<ellipse class="k c-wht" cx="${x}" cy="${y}" rx="15" ry="11"/><path class="st thin" d="M${x - 5} ${y - 10} V${y + 10} M${x + 5} ${y - 10} V${y + 10} M${x - 15} ${y} H${x + 15}"/>`;
  s += tri(110, 180) + tri(250, 176) + `<path class="st" style="stroke:var(--f-chl);stroke-width:2" d="M180 206 q-6 -10 0 -20 q6 -10 0 -20 M190 206 q6 -10 0 -18"/>`;
  // 乙：鱼、蕨类叶
  const fish = (x, y) => `<path class="k c-wht" d="M${x - 22} ${y} C${x - 10} ${y - 12} ${x + 10} ${y - 12} ${x + 18} ${y} C${x + 10} ${y + 12} ${x - 10} ${y + 12} ${x - 22} ${y} Z M${x + 18} ${y} L${x + 30} ${y - 9} L${x + 30} ${y + 9} Z"/><circle class="c-line" cx="${x - 12}" cy="${y - 2}" r="1.8"/>`;
  s += fish(110, 116) + fish(280, 112);
  s += `<path class="st" style="stroke:var(--f-chl);stroke-width:1.6" d="M190 140 V96 M190 132 l-10 -6 M190 132 l10 -6 M190 120 l-10 -6 M190 120 l10 -6 M190 108 l-8 -5 M190 108 l8 -5"/>`;
  // 甲：鸟、开花植物
  s += `<ellipse class="k c-wht" cx="110" cy="54" rx="18" ry="9"/><circle class="k c-wht" cx="128" cy="44" r="6"/><path class="k c-wht" d="M134 44 l8 2 l-8 2 Z M94 52 l-12 -6 l2 10 Z M106 50 l10 -16 l6 14 Z"/>`;
  s += `<path class="st" style="stroke:var(--f-chl);stroke-width:1.6" d="M270 78 V44 M270 62 q-10 -2 -12 -10 M270 58 q10 -2 12 -10"/>`;
  [[0, -7], [7, 0], [0, 7], [-7, 0]].forEach(([dx, dy]) => { s += `<circle class="k c-pink" cx="${270 + dx}" cy="${38 + dy}" r="5"/>`; });
  s += `<circle class="k c-yel" cx="270" cy="38" r="3.5"/>`;
  s += arr(370, 208, 370, 24, "ar mut") + txt(380, 120, "地层越来越新", "tx sm", "start");
  BANK.fig("strata", {
    title: "某地三个地层中发现的化石示意图（地层未发生变动）", vb: "10 12 460 206", maxw: 440, ch: "u6c3", kp: "生物进化的证据",
    body: s, drill: false
  });
})();
