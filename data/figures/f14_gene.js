/* 八下第六单元第二章：染色体与基因、遗传系谱、性别遗传 */
(function () {
  const { co, txt, arr, cbox, lbl } = FK;

  /* ---------- 细胞核、染色体、DNA 和基因的关系 ---------- */
  let c = "";
  c += `<circle class="k c-cyto" cx="70" cy="130" r="56"/>`;
  c += `<circle class="k c-nuc" cx="76" cy="124" r="24"/>`;
  const miniX = (x, y, s) => `<path class="st" style="stroke:var(--f-pur);stroke-width:3" d="M${x - s} ${y - s} L${x + s} ${y + s} M${x + s} ${y - s} L${x - s} ${y + s}"/>`;
  c += miniX(68, 118, 5) + miniX(84, 130, 5) + miniX(72, 134, 4);
  c += arr(134, 130, 168, 130);
  // 放大的染色体（两条姐妹染色单体在着丝粒处相连）
  c += `<path class="k c-pur" d="M190 70 C200 66 208 72 210 82 L222 124 L216 132 L202 90 C198 78 192 74 190 70 Z"/>`;
  c += `<path class="k c-pur" d="M252 70 C242 66 234 72 232 82 L220 124 L226 132 L240 90 C244 78 250 74 252 70 Z"/>`;
  c += `<path class="k c-pur" d="M190 190 C200 194 208 188 210 178 L222 136 L216 128 L202 170 C198 182 192 186 190 190 Z"/>`;
  c += `<path class="k c-pur" d="M252 190 C242 194 234 188 232 178 L220 136 L226 128 L240 170 C244 182 250 186 252 190 Z"/>`;
  c += `<circle class="k c-dark" cx="221" cy="130" r="5"/>`;
  c += arr(266, 130, 298, 130);
  // DNA：先缠绕在蛋白质上，后展开成双螺旋
  c += `<path class="st" d="M306 130 q8 -14 16 0 q8 14 16 0 q8 -14 16 0"/>`;
  [314, 330, 346].forEach((x, i) => { c += `<circle class="k c-org" cx="${x}" cy="${130 + (i % 2 ? 6 : -6)}" r="7"/>`; });
  c += `<rect class="k c-yel" x="424" y="108" width="52" height="44" rx="4"/>`;
  // 双链：上下交替，形成螺旋的样子
  let h1 = "M354 130", h2 = "M354 130";
  for (let x = 354, k = 0; x < 530; x += 22, k++) { const u = k % 2 ? 152 : 108, v = k % 2 ? 108 : 152; h1 += ` C${x + 7} ${u} ${x + 15} ${u} ${x + 22} 130`; h2 += ` C${x + 7} ${v} ${x + 15} ${v} ${x + 22} 130`; }
  c += `<path class="st nf" style="stroke:var(--f-blue);stroke-width:2.2" d="${h1}"/><path class="st nf" style="stroke:var(--f-red);stroke-width:2.2" d="${h2}"/>`;
  for (let x = 360; x < 528; x += 11) c += `<line class="st thin s-mut" x1="${x}" y1="${130 - 9 * Math.abs(Math.sin((x - 354) / 22 * Math.PI))}" x2="${x}" y2="${130 + 9 * Math.abs(Math.sin((x - 354) / 22 * Math.PI))}"/>`;
  c += co(1, 84, 112, 130, 40, "细胞核", "r");
  c += co(2, 204, 84, 204, 30, "染色体", "t");
  c += co(3, 330, 124, 316, 200, "蛋白质", "b");
  c += co(4, 398, 142, 398, 200, "DNA", "b");
  c += co(5, 450, 112, 470, 50, "基因", "r");
  BANK.fig("chromo", {
    title: "细胞核、染色体、DNA和基因的关系示意图", vb: "6 0 534 224", maxw: 540, ch: "u6c2", kp: "基因在亲子代间的传递",
    body: c,
    labels: [
      { n: 1, name: "细胞核", fn: "遗传信息库，染色体存在于这里" },
      { n: 2, name: "染色体", fn: "容易被碱性染料染成深色，主要由DNA和蛋白质组成" },
      { n: 3, name: "蛋白质" },
      { n: 4, name: "DNA", fn: "主要的遗传物质，呈规则的双螺旋结构" },
      { n: 5, name: "基因", fn: "具有遗传效应的DNA片段，控制生物的性状" }
    ]
  });

  /* ---------- 白化病遗传系谱 ---------- */
  let p = "";
  const male = (x, y, ill) => `<rect class="k ${ill ? "c-dark" : "c-wht"}" x="${x - 12}" y="${y - 12}" width="24" height="24"/>`;
  const fem = (x, y, ill) => `<circle class="k ${ill ? "c-dark" : "c-wht"}" cx="${x}" cy="${y}" r="12.5"/>`;
  p += `<path class="st" d="M112 40 H168 M140 40 V80 M60 80 H220 M60 80 V98 M140 80 V98 M220 80 V98"/>`;
  p += male(100, 40) + fem(180, 40);
  p += male(60, 110) + fem(140, 110, true) + male(220, 110);
  p += `<path class="st" d="M232 110 H288 M260 110 V148 M260 148 V158"/>`;
  p += fem(300, 110) + male(260, 170, true);
  [[100, 40, 1], [180, 40, 2], [60, 110, 3], [140, 110, 4], [220, 110, 5], [300, 110, 6], [260, 170, 7]].forEach(([x, y, n]) => { p += txt(x + 20, y + 18, n, "tx sm", "start"); });
  p += txt(18, 44, "Ⅰ", "tx b", "middle", 14) + txt(18, 114, "Ⅱ", "tx b", "middle", 14) + txt(18, 174, "Ⅲ", "tx b", "middle", 14);
  // 图例
  const lx = 346;
  p += male(lx, 40) + txt(lx + 20, 44, "正常男性", "tx sm", "start");
  p += fem(lx, 74) + txt(lx + 20, 78, "正常女性", "tx sm", "start");
  p += male(lx, 108, true) + txt(lx + 20, 112, "患病男性", "tx sm", "start");
  p += fem(lx, 142, true) + txt(lx + 20, 146, "患病女性", "tx sm", "start");
  BANK.fig("pedigree", {
    title: "某家族白化病的遗传系谱图（基因用A、a表示）", vb: "0 18 440 180", maxw: 440, ch: "u6c2", kp: "基因的显性和隐性",
    body: p, drill: false
  });

  /* ---------- 人的性别遗传 ---------- */
  let s = "";
  const R = (x, y, w) => ({ x, y, w: w || 96, h: 30 });
  const fa = R(130, 36, 110), mo = R(350, 36, 110), sx = R(70, 126, 78), sy = R(190, 126, 78), ov = R(350, 126, 78), cg = R(130, 222, 110), cb = R(350, 222, 110);
  s += cbox(fa, "父亲 44+XY") + cbox(mo, "母亲 44+XX") + txt(240, 41, "×", "tx b", "middle", 16);
  s += cbox(sx, "22+X") + `<g class="bx"><rect x="${sy.x - 39}" y="${sy.y - 15}" width="78" height="30" rx="6"/></g>` + lbl(1, sy.x, sy.y, "22+Y", "c") + cbox(ov, "22+X");
  s += `<g class="bx"><rect x="${cg.x - 55}" y="${cg.y - 15}" width="110" height="30" rx="6"/></g>` + lbl(2, cg.x, cg.y, "44+XX（女）", "c") + cbox(cb, "44+XY（男）");
  s += `<path class="st" d="M120 51 L76 111 M140 51 L184 111 M350 51 V111"/>`;
  s += `<path class="st" d="M76 141 L124 207 M340 141 L140 207 M360 141 V207 M196 141 L340 207"/>`;
  s += txt(-64, 41, "亲代", "tx sm", "start") + txt(-64, 131, "生殖细胞", "tx sm", "start") + txt(-64, 227, "受精卵", "tx sm", "start");
  s += txt(70, 104, "精子", "tx sm") + txt(190, 104, "精子", "tx sm") + txt(392, 104, "卵细胞", "tx sm", "start");
  s += txt(240, 262, "比例　　1　　∶　　1", "tx");
  BANK.fig("sexchr", {
    title: "人的性别遗传示意图", vb: "-70 14 524 260", maxw: 480, ch: "u6c2", kp: "人的性别遗传",
    body: s, drill: false,
    labels: [{ n: 1, name: "22+Y" }, { n: 2, name: "44+XX（女）" }]
  });
})();
