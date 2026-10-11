/* 七下第三单元第二章：叶片结构、气孔、光合作用实验步骤、呼吸作用实验、曲线 */
(function () {
  const { co, txt, arr, lbl, axes } = FK;

  /* ---------- 叶片横切面 ---------- */
  let L = "";
  // 角质层+上表皮
  L += `<rect class="k c-wht" x="20" y="40" width="400" height="16"/>`;
  for (let x = 20; x < 420; x += 26) L += `<line class="st thin" x1="${x}" y1="40" x2="${x}" y2="56"/>`;
  // 栅栏组织
  for (let x = 22; x < 418; x += 18) L += `<rect class="k c-cyto" x="${x}" y="58" width="15" height="44" rx="6"/>` +
    `<circle class="c-chl" cx="${x + 5}" cy="68" r="2.4"/><circle class="c-chl" cx="${x + 10}" cy="80" r="2.4"/><circle class="c-chl" cx="${x + 5}" cy="92" r="2.4"/>`;
  // 海绵组织
  [[34, 116], [70, 126], [104, 114], [140, 128], [176, 116], [272, 120], [308, 130], [344, 116], [380, 128], [406, 114], [52, 148], [92, 154], [130, 150], [292, 152], [334, 154], [372, 150]].forEach(([x, y]) =>
    L += `<ellipse class="k c-cyto" cx="${x}" cy="${y}" rx="15" ry="10"/><circle class="c-chl" cx="${x - 4}" cy="${y}" r="2.2"/>`);
  // 叶脉（导管、筛管）
  L += `<ellipse class="k c-wht" cx="224" cy="134" rx="40" ry="28"/>`;
  L += `<circle class="k c-wat" cx="212" cy="124" r="7"/><circle class="k c-wat" cx="230" cy="122" r="6"/><circle class="k c-wat" cx="220" cy="138" r="5"/>`;
  L += `<circle class="k c-yel" cx="214" cy="150" r="4"/><circle class="k c-yel" cx="226" cy="152" r="4"/><circle class="k c-yel" cx="238" cy="148" r="4"/>`;
  // 下表皮与气孔
  L += `<path class="k c-wht" d="M20 168 H178 M20 168 V184 H178 V168 Z"/>`;
  L += `<path class="k c-wht" d="M206 168 H420 V184 H206 Z"/>`;
  for (let x = 20; x < 178; x += 26) L += `<line class="st thin" x1="${x}" y1="168" x2="${x}" y2="184"/>`;
  for (let x = 232; x < 420; x += 26) L += `<line class="st thin" x1="${x}" y1="168" x2="${x}" y2="184"/>`;
  L += `<ellipse class="k c-leaf" cx="186" cy="176" rx="8" ry="9"/><ellipse class="k c-leaf" cx="198" cy="176" rx="8" ry="9"/>`;
  L += co(1, 120, 48, 470, 40, "上表皮", "r");
  L += co(2, 400, 80, 470, 80, "栅栏组织", "r");
  L += co(3, 380, 128, 470, 122, "海绵组织", "r");
  L += co(4, 330, 176, 470, 176, "下表皮", "r");
  L += co(5, 192, 182, 192, 214, "气孔", "b");
  L += co(6, 244, 140, 470, 150, "叶脉", "r").replace(/<text[\s\S]*<\/text>/, "") + lbl(6, 470, 150, "叶脉", "r");
  L += co(7, 186, 172, 120, 214, "保卫细胞", "b");
  L += `<path class="st thin dash" d="M20 56 H420 M20 104 H420 M20 166 H420"/>`;
  BANK.fig("leaf", {
    title: "叶片结构示意图（横切面）", vb: "0 26 564 210", ch: "u3c2", kp: "叶片的结构",
    body: L,
    labels: [
      { n: 1, name: "上表皮", fn: "细胞无色透明，排列紧密，起保护作用" },
      { n: 2, name: "栅栏组织", fn: "靠近上表皮，细胞排列整齐，含叶绿体较多" },
      { n: 3, name: "海绵组织", fn: "靠近下表皮，细胞排列疏松，含叶绿体较少" },
      { n: 4, name: "下表皮" },
      { n: 5, name: "气孔", fn: "气体进出叶片和水分散失的门户" },
      { n: 6, name: "叶脉", fn: "内有导管和筛管，运输物质并起支持作用" },
      { n: 7, name: "保卫细胞", fn: "控制气孔的张开和闭合" }
    ]
  });

  /* ---------- 气孔的张开与闭合 ---------- */
  let s = "";
  const guard = (cx, open) => {
    const d = open ? 19 : 13, rx = open ? 19 : 14;
    const cells = `<ellipse class="k c-leaf" cx="${cx - d}" cy="90" rx="${rx}" ry="50"/><ellipse class="k c-leaf" cx="${cx + d}" cy="90" rx="${rx}" ry="50"/>`;
    const pore = `<ellipse class="k c-wht" cx="${cx}" cy="90" rx="${open ? 10 : 1.6}" ry="${open ? 36 : 34}"/>`;
    const chl = [-1, 1].map(sg => `<circle class="c-chl" cx="${cx + sg * (d + 4)}" cy="64" r="3"/><circle class="c-chl" cx="${cx + sg * (d + 7)}" cy="90" r="3"/><circle class="c-chl" cx="${cx + sg * (d + 4)}" cy="116" r="3"/>`).join("");
    return cells + pore + chl;
  };
  s += guard(110, true) + guard(320, false);
  s += txt(110, 170, "甲", "tx b", "middle", 15) + txt(320, 170, "乙", "tx b", "middle", 15);
  s += co(1, 86, 60, 40, 40, "保卫细胞", "l");
  s += co(2, 110, 100, 170, 128, "气孔", "r");
  BANK.fig("stoma", {
    title: "气孔张开（甲）和闭合（乙）示意图", vb: "-50 26 440 156", ch: "u3c2", kp: "气孔", body: s, drill: false,
    labels: [{ n: 1, name: "保卫细胞" }, { n: 2, name: "气孔" }]
  });

  /* ---------- 绿叶在光下制造有机物：实验步骤（打乱顺序） ---------- */
  let e = "";
  const panel = (i, x, y, body, cap) => `<g><rect class="k c-wht" x="${x}" y="${y}" width="130" height="118" rx="8"/>${body}` +
    lbl(i, x + 10, y + 16, "", "r") + txt(x + 65, y + 110, cap, "tx sm") + `</g>`;
  const leafShape = (cx, cy, fill, cover) => `<path class="k ${fill}" d="M${cx - 34} ${cy} C${cx - 20} ${cy - 26} ${cx + 20} ${cy - 26} ${cx + 34} ${cy} C${cx + 20} ${cy + 26} ${cx - 20} ${cy + 26} ${cx - 34} ${cy} Z"/>` +
    `<path class="st thin" d="M${cx - 34} ${cy} H${cx + 30}"/>` + (cover ? `<rect class="${cover}" x="${cx - 8}" y="${cy - 20}" width="16" height="40"/>` : "");
  // ① 滴加碘液
  e += panel(1, 10, 10, `<ellipse class="k c-gry" cx="75" cy="78" rx="44" ry="12"/>` + leafShape(75, 74, "c-wht") +
    `<path class="k c-wht" d="M86 22 h12 v26 l-6 8 l-6 -8z"/><circle class="k c-dark" cx="92" cy="62" r="2.5"/>`, "滴加碘液");
  // ② 暗处理
  e += panel(2, 150, 10, `<rect class="k c-dark" x="182" y="30" width="66" height="62"/><path class="k c-brn" d="M202 92 l4 -14 h18 l4 14z"/>` +
    `<path class="st" d="M215 78 V58 M215 66 l-10 -8 M215 62 l10 -8"/>`, "放在黑暗处一昼夜");
  // ③ 隔水加热（酒精脱色）
  e += panel(3, 290, 10, `<path class="k c-wat" d="M318 36 V84 Q318 92 326 92 H384 Q392 92 392 84 V36"/>` +
    `<path class="k c-yel" d="M342 50 V82 Q342 86 346 86 H364 Q368 86 368 82 V50"/><path class="k c-leaf" d="M348 76 q7 -16 14 0 q-7 6 -14 0z"/>` +
    `<path class="k c-org" d="M346 96 q9 -12 18 0 q-9 8 -18 0z"/>` + txt(355, 47, "酒精", "tx sm") + txt(328, 34, "清水", "tx sm", "start"), "隔水加热");
  // ④ 观察颜色
  e += panel(4, 430, 10, leafShape(495, 66, "c-blue", "c-wht"), "观察叶片颜色");
  // ⑤ 部分遮光
  e += panel(5, 10, 140, `<path class="st" d="M75 230 V170"/>` + leafShape(75, 186, "c-leaf", "c-dark"), "叶片部分遮光");
  // ⑥ 清水漂洗
  e += panel(6, 150, 140, `<ellipse class="k c-wat" cx="215" cy="206" rx="46" ry="14"/>` + leafShape(215, 200, "c-wht"), "用清水漂洗");
  // ⑦ 光照
  e += panel(7, 290, 140, `<circle class="k c-yel" cx="392" cy="166" r="11"/>` +
    [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * Math.PI / 4; return `<line class="st thin" x1="${(392 + 14 * Math.cos(a)).toFixed(1)}" y1="${(166 + 14 * Math.sin(a)).toFixed(1)}" x2="${(392 + 19 * Math.cos(a)).toFixed(1)}" y2="${(166 + 19 * Math.sin(a)).toFixed(1)}"/>`; }).join("") +
    `<path class="k c-brn" d="M350 232 l4 -14 h22 l4 14z"/><path class="st" d="M365 218 V188"/><path class="k c-leaf" d="M365 196 q-24 -14 -26 4 q14 6 26 -4z"/><path class="k c-leaf" d="M365 190 q22 -16 26 2 q-14 8 -26 -2z"/>`, "光照几小时");
  BANK.fig("starchexp", { title: "“绿叶在光下制造有机物”实验的主要步骤（顺序已打乱）", vb: "0 0 570 268", ch: "u3c2", kp: "光合作用的实验", body: e, drill: false });

  /* ---------- 呼吸作用实验 ---------- */
  let r = "";
  const jar = (x, seedCls, label) => `<path class="k c-wht" d="M${x} 60 V150 Q${x} 160 ${x + 10} 160 H${x + 70} Q${x + 80} 160 ${x + 80} 150 V60"/>` +
    `<rect class="k c-gry" x="${x - 4}" y="50" width="88" height="12" rx="3"/>` +
    Array.from({ length: 14 }, (_, k) => `<ellipse class="k ${seedCls}" cx="${x + 12 + (k % 7) * 9.5}" cy="${150 - Math.floor(k / 7) * 8}" rx="5" ry="3.6"/>`).join("") +
    txt(x + 40, 182, label, "tx");
  // 甲乙：蜡烛
  r += jar(20, "c-yel", "甲 萌发的种子") + jar(150, "c-brn", "乙 煮熟的种子");
  r += `<path class="st" d="M60 30 V100"/><rect class="k c-wht" x="54" y="100" width="12" height="20"/><path class="st thin" d="M60 100 v-5"/>`;
  r += `<path class="st" d="M190 30 V100"/><rect class="k c-wht" x="184" y="100" width="12" height="20"/><path class="k c-org" d="M190 99 q-5 -8 0 -16 q5 8 0 16z"/>`;
  r += txt(60, 22, "燃烧的蜡烛放入后", "tx sm") + txt(190, 22, "燃烧的蜡烛放入后", "tx sm");
  // 丙丁：澄清石灰水
  r += `<path class="k c-wht" d="M300 60 V150 Q300 160 310 160 H360 Q370 160 370 150 V60"/>` +
    Array.from({ length: 10 }, (_, k) => `<ellipse class="k c-yel" cx="${310 + (k % 5) * 12}" cy="${150 - Math.floor(k / 5) * 8}" rx="5" ry="3.6"/>`).join("");
  r += `<rect class="k c-gry" x="296" y="50" width="78" height="12" rx="3"/><path class="st" d="M350 50 V30 H430 V110"/>`;
  r += `<path class="k c-wht" d="M410 80 V150 Q410 160 420 160 H440 Q450 160 450 150 V80"/><path class="k c-gry" d="M411 112 H449 V150 Q449 159 440 159 H420 Q411 159 411 150 Z"/>`;
  r += txt(335, 182, "萌发的种子", "tx") + txt(430, 182, "澄清石灰水", "tx");
  r += txt(370, 22, "通入气体", "tx sm");
  BANK.fig("respexp", { title: "探究种子呼吸作用的实验装置", vb: "0 6 470 186", ch: "u3c2", kp: "呼吸作用的实验", body: r, drill: false });

  /* ---------- 大棚一天中二氧化碳浓度变化 ---------- */
  let g = "";
  const X0 = 50, Y0 = 190, W = 400, H = 150;
  const fx = t => X0 + (t / 24) * W, fy = v => Y0 - v * H;
  g += axes({ x0: X0, y0: Y0, w: W, h: H, xt: [0, 6, 12, 18, 24].map(t => ({ x: fx(t), s: String(t) })), yt: [], xl: "时间（时）", yl: "大棚内二氧化碳浓度" });
  const pts = [[0, 0.62], [3, 0.74], [6, 0.82], [8, 0.7], [10, 0.5], [12, 0.36], [14, 0.27], [16, 0.22], [18, 0.2], [20, 0.32], [22, 0.46], [24, 0.58]];
  g += `<path class="curve s-blue" d="M${pts.map(([t, v]) => `${fx(t).toFixed(1)} ${fy(v).toFixed(1)}`).join(" L")}"/>`;
  g += `<circle class="c-line" cx="${fx(6)}" cy="${fy(0.82)}" r="3.5"/>` + txt(fx(6), fy(0.82) - 9, "A", "tx b");
  g += `<circle class="c-line" cx="${fx(18)}" cy="${fy(0.2)}" r="3.5"/>` + txt(fx(18) + 2, fy(0.2) + 18, "B", "tx b");
  BANK.fig("co2day", { title: "某蔬菜大棚内一天中二氧化碳浓度的变化（密闭，晴天）", vb: "0 20 480 210", ch: "u3c2", kp: "光合作用与呼吸作用", body: g, drill: false });

  /* ---------- 光照强度与二氧化碳吸收量 ---------- */
  let c = "";
  const x0 = 60, y0 = 150, w = 360, h = 110;
  const cx = v => x0 + v * w, cy = v => y0 - v * h;
  c += axes({ x0, y0, w, h: h + 10, xt: [], yt: [{ y: cy(0), s: "0" }], xl: "光照强度", yl: "二氧化碳吸收量" });
  c += `<line class="st thin dash" x1="${x0}" y1="${cy(0)}" x2="${x0 + w}" y2="${cy(0)}"/>`;
  const curve = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; curve.push([cx(t), cy(-0.28 + 1.18 * (1 - Math.exp(-4.2 * t)))]); }
  c += `<path class="curve s-red" d="M${curve.map(p => p.map(v => v.toFixed(1)).join(" ")).join(" L")}"/>`;
  c += `<circle class="c-line" cx="${cx(0)}" cy="${cy(-0.28)}" r="3.5"/>` + txt(cx(0) + 12, cy(-0.28) + 4, "A", "tx b", "start");
  const tB = -Math.log(1 - 0.28 / 1.18) / 4.2;
  c += `<circle class="c-line" cx="${cx(tB)}" cy="${cy(0)}" r="3.5"/>` + txt(cx(tB) + 2, cy(0) + 18, "B", "tx b");
  c += `<circle class="c-line" cx="${cx(0.62)}" cy="${cy(-0.28 + 1.18 * (1 - Math.exp(-4.2 * 0.62)))}" r="3.5"/>` + txt(cx(0.62), cy(0.82) - 10, "C", "tx b");
  c += `<g class="ax"><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${cy(-0.36)}"/></g>`;
  BANK.fig("lightcurve", { title: "某植物在一定温度下，光照强度与二氧化碳吸收量的关系", vb: "0 6 470 204", ch: "u3c2", kp: "光合作用与呼吸作用", body: c, drill: false });
})();
