/* 七上第一单元：显微镜、细胞、细胞分裂、草履虫 */
(function () {
  const { co, lbl, txt, arr } = FK;

  /* ---------- 显微镜 ---------- */
  let m = "";
  // 镜座
  m += `<path class="k c-gry" d="M70 352 h250 a8 8 0 0 1 8 8 v12 a6 6 0 0 1 -6 6 h-254 a6 6 0 0 1 -6 -6 v-12 a8 8 0 0 1 8 -8z"/>`;
  // 镜柱
  m += `<rect class="k c-gry" x="236" y="300" width="30" height="54"/>`;
  // 镜臂
  m += `<path class="k c-gry" d="M170 78 h40 q12 0 18 10 l40 82 q4 8 4 18 v118 h-36 v-110 q0 -6 -3 -12 l-34 -70 h-29 z"/>`;
  // 粗、细准焦螺旋
  m += `<circle class="k c-dark" cx="254" cy="222" r="17"/><circle class="k c-wht" cx="254" cy="222" r="6"/>`;
  m += `<circle class="k c-dark" cx="254" cy="268" r="10"/><circle class="k c-wht" cx="254" cy="268" r="3.5"/>`;
  // 镜筒与目镜
  m += `<rect class="k c-wht" x="132" y="42" width="34" height="132"/>`;
  m += `<rect class="k c-gry" x="137" y="16" width="24" height="28" rx="2"/><rect class="k c-dark" x="134" y="12" width="30" height="6" rx="2"/>`;
  // 转换器
  m += `<path class="k c-gry" d="M120 174 h58 l-8 16 h-42 z"/>`;
  // 物镜（一个对准通光孔，一个斜向一侧）
  m += `<rect class="k c-wht" x="141" y="190" width="16" height="26" rx="2"/><rect class="k c-dark" x="143" y="214" width="12" height="4"/>`;
  m += `<g transform="rotate(30 138 188)"><rect class="k c-wht" x="131" y="188" width="13" height="19" rx="2"/></g>`;
  // 载物台、压片夹、通光孔
  m += `<rect class="k c-gry" x="66" y="232" width="176" height="12" rx="2"/>`;
  m += `<ellipse class="k c-line" cx="149" cy="238" rx="7" ry="2.6"/>`;
  m += `<path class="k c-dark" d="M84 232 v-4 h34 l6 -3 v3 l-6 4z"/><path class="k c-dark" d="M214 232 v-4 h-34 l-6 -3 v3 l6 4z"/>`;
  // 遮光器
  m += `<ellipse class="k c-wht" cx="149" cy="252" rx="44" ry="6"/><ellipse class="k nf" cx="132" cy="252" rx="4" ry="1.6"/><ellipse class="k nf" cx="166" cy="252" rx="6" ry="2"/>`;
  // 反光镜及支架
  m += `<path class="st" d="M121 304 q0 16 28 16 q28 0 28 -16"/>`;
  m += `<ellipse class="k c-wat" cx="149" cy="306" rx="26" ry="9"/><ellipse class="k c-wht" cx="149" cy="306" rx="19" ry="5"/>`;
  m += `<path class="st" d="M177 308 h59"/>`;
  // 标注：左侧
  m += co(1, 140, 22, 70, 22, "目镜", "l");
  m += co(2, 133, 100, 70, 100, "镜筒", "l");
  m += co(3, 122, 180, 70, 160, "转换器", "l");
  m += co(4, 130, 200, 70, 200, "物镜", "l");
  m += co(5, 96, 228, 50, 224, "压片夹", "l");
  m += co(6, 149, 238, 50, 262, "通光孔", "l");
  m += co(7, 112, 254, 50, 286, "遮光器", "l");
  m += co(8, 128, 310, 50, 316, "反光镜", "l");
  m += co(9, 90, 366, 50, 366, "镜座", "l");
  // 右侧
  m += co(10, 266, 330, 330, 330, "镜柱", "r");
  m += co(11, 264, 268, 330, 284, "细准焦螺旋", "r");
  m += co(12, 270, 218, 330, 200, "粗准焦螺旋", "r");
  m += co(13, 230, 120, 330, 120, "镜臂", "r");
  m += co(14, 222, 240, 330, 244, "载物台", "r");

  BANK.fig("microscope", {
    title: "光学显微镜结构示意图", vb: "-34 0 466 392", ch: "u1c2", kp: "显微镜的结构",
    body: m,
    labels: [
      { n: 1, name: "目镜" }, { n: 2, name: "镜筒" },
      { n: 3, name: "转换器", fn: "转动它可以换用不同倍数的物镜" },
      { n: 4, name: "物镜" },
      { n: 5, name: "压片夹", fn: "固定玻片标本" },
      { n: 6, name: "通光孔", fn: "让光线通过" },
      { n: 7, name: "遮光器", fn: "用大小不同的光圈调节进入的光量" },
      { n: 8, name: "反光镜", fn: "把光线反射到通光孔（有平面镜和凹面镜）" },
      { n: 9, name: "镜座", fn: "稳定镜身" },
      { n: 10, name: "镜柱" },
      { n: 11, name: "细准焦螺旋", fn: "小幅度升降镜筒，使物像更清晰" },
      { n: 12, name: "粗准焦螺旋", fn: "大幅度升降镜筒" },
      { n: 13, name: "镜臂", fn: "取放显微镜时握住的部位" },
      { n: 14, name: "载物台", fn: "放置玻片标本" }
    ]
  });

  /* ---------- 动植物细胞 ---------- */
  let c = "";
  // 甲：植物细胞
  c += `<rect class="k c-wall" x="70" y="30" width="160" height="200" rx="10"/>`;
  c += `<rect class="k c-cyto" x="78" y="38" width="144" height="184" rx="7"/>`;
  c += `<path class="k c-vac" d="M110 86 q40 -20 86 0 q20 38 6 88 q-44 20 -96 4 q-14 -48 4 -92z"/>`;
  c += `<circle class="k c-nuc" cx="104" cy="196" r="16"/><circle class="k c-pur" cx="108" cy="192" r="4"/>`;
  [[200, 56], [96, 70], [208, 138], [170, 206], [92, 130]].forEach(([x, y], i) =>
    c += `<ellipse class="k c-chl" cx="${x}" cy="${y}" rx="10" ry="5.5" transform="rotate(${i * 37} ${x} ${y})"/>`);
  [[146, 56], [204, 196]].forEach(([x, y]) => c += `<ellipse class="k c-mito" cx="${x}" cy="${y}" rx="7" ry="4"/>`);
  c += txt(150, 256, "甲", "tx b", "middle", 15);
  // 乙：动物细胞
  c += `<path class="k c-cyto" d="M390 56 q60 -22 92 22 q20 40 0 92 q-20 46 -78 38 q-54 -10 -60 -62 q-4 -66 46 -90z"/>`;
  c += `<circle class="k c-nuc" cx="418" cy="128" r="20"/><circle class="k c-pur" cx="422" cy="124" r="5"/>`;
  [[380, 96], [466, 158]].forEach(([x, y]) => c += `<ellipse class="k c-mito" cx="${x}" cy="${y}" rx="7.5" ry="4"/>`);
  c += txt(420, 256, "乙", "tx b", "middle", 15);
  // 标注（甲）
  c += co(1, 70, 60, 58, 52, "细胞壁", "l");
  c += co(2, 78, 112, 58, 112, "细胞膜", "l");
  c += co(4, 92, 196, 58, 196, "细胞核", "l");
  c += co(3, 205, 58, 244, 44, "叶绿体", "r");
  c += co(5, 170, 128, 244, 110, "液泡", "r");
  c += co(6, 214, 166, 244, 160, "细胞质", "r");
  c += co(7, 208, 198, 244, 212, "线粒体", "r");
  // 标注（乙），与甲中相同的结构用相同序号
  c += co(2, 484, 96, 506, 84, "细胞膜", "r");
  c += co(4, 436, 132, 506, 128, "细胞核", "r");
  c += co(6, 452, 186, 506, 214, "细胞质", "r");
  c += co(7, 472, 160, 506, 170, "线粒体", "r");

  BANK.fig("cells", {
    title: "植物细胞（甲）和动物细胞（乙）结构示意图", vb: "0 0 576 270", ch: "u1c2", kp: "植物细胞与动物细胞",
    body: c,
    labels: [
      { n: 1, name: "细胞壁", fn: "保护和支持细胞" },
      { n: 2, name: "细胞膜", fn: "控制物质进出细胞" },
      { n: 3, name: "叶绿体", fn: "进行光合作用的场所" },
      { n: 4, name: "细胞核", fn: "含有遗传物质，是细胞生命活动的控制中心" },
      { n: 5, name: "液泡", fn: "内含细胞液，溶解着糖分等多种物质" },
      { n: 6, name: "细胞质", fn: "流动着，加快细胞与外界的物质交换" },
      { n: 7, name: "线粒体", fn: "进行呼吸作用、释放能量的场所" }
    ]
  });

  /* ---------- 植物细胞分裂过程 ---------- */
  let d = "";
  const cell = (x, inner) => `<rect class="k c-wall" x="${x}" y="40" width="100" height="120" rx="6"/><rect class="k c-cyto" x="${x + 5}" y="45" width="90" height="110" rx="4"/>` + inner;
  d += cell(10, `<circle class="k c-nuc" cx="60" cy="100" r="16"/><path class="st thin" d="M53 94 l6 10 M62 92 l-3 14 M67 96 l-4 9"/>`);
  d += arr(118, 100, 146, 100);
  d += cell(150, `<circle class="k c-nuc" cx="200" cy="72" r="13"/><circle class="k c-nuc" cx="200" cy="128" r="13"/><path class="st thin" d="M195 68 l5 8 M203 66 l-2 10 M195 124 l5 8 M203 122 l-2 10"/>`);
  d += arr(258, 100, 286, 100);
  d += cell(290, `<circle class="k c-nuc" cx="340" cy="72" r="13"/><circle class="k c-nuc" cx="340" cy="128" r="13"/><path class="k c-wall" d="M295 98 h90 v4 h-90z"/>`);
  d += txt(60, 184, "A", "tx b", "middle", 14) + txt(200, 184, "B", "tx b", "middle", 14) + txt(340, 184, "C", "tx b", "middle", 14);
  BANK.fig("division", { title: "植物细胞分裂过程示意图", vb: "0 30 400 166", ch: "u1c3", kp: "细胞分裂", body: d, drill: false });

  /* ---------- 草履虫 ---------- */
  let p = "";
  const outline = "M58 102 C58 66 120 44 206 44 C292 44 354 66 354 102 C354 138 292 160 206 160 C150 160 118 150 98 140 C80 134 58 128 58 102Z";
  // 纤毛
  for (let i = 0; i < 46; i++) {
    const t = i / 46 * Math.PI * 2;
    const cx = 206 + 148 * Math.cos(t), cy = 102 + 58 * Math.sin(t);
    const ex = 206 + 159 * Math.cos(t), ey = 102 + 65 * Math.sin(t);
    p += `<line class="st thin" x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"/>`;
  }
  p += `<path class="k c-cyto" d="${outline}"/>`;
  // 口沟
  p += `<path class="st" d="M100 138 C126 120 160 108 198 112"/><path class="st thin" d="M104 142 C132 128 164 118 196 118"/>`;
  // 伸缩泡与收集管（前后各一）
  [[110, 84], [300, 92]].forEach(([x, y]) => {
    for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; p += `<line class="st thin" x1="${x}" y1="${y}" x2="${(x + 20 * Math.cos(t)).toFixed(1)}" y2="${(y + 14 * Math.sin(t)).toFixed(1)}"/>`; }
    p += `<circle class="k c-wat" cx="${x}" cy="${y}" r="6"/>`;
  });
  // 细胞核（大核、小核）
  p += `<ellipse class="k c-nuc" cx="214" cy="80" rx="26" ry="14"/><circle class="k c-pur" cx="246" cy="74" r="5"/>`;
  // 食物泡
  [[170, 126], [240, 128], [268, 112], [196, 136]].forEach(([x, y]) => p += `<circle class="k c-yel" cx="${x}" cy="${y}" r="6"/>`);
  // 胞肛
  p += `<path class="st" d="M306 146 q6 -6 12 -2"/>`;
  p += co(1, 352, 140, 380, 168, "纤毛", "r");
  p += co(2, 330, 76, 380, 44, "表膜", "r");
  p += co(3, 150, 118, 120, 180, "口沟", "b");
  p += co(4, 240, 128, 236, 186, "食物泡", "b");
  p += co(5, 312, 146, 330, 186, "胞肛", "b");
  p += co(6, 300, 92, 380, 104, "伸缩泡", "r");
  p += co(7, 120, 76, 96, 30, "收集管", "t");
  p += co(8, 214, 80, 200, 22, "细胞核", "t");
  p += co(9, 270, 92, 290, 24, "细胞质", "t");
  BANK.fig("paramecium", {
    title: "草履虫结构示意图", vb: "0 0 460 206", ch: "u1c3", kp: "单细胞生物",
    body: p,
    labels: [
      { n: 1, name: "纤毛", fn: "摆动使草履虫在水中旋转前进" },
      { n: 2, name: "表膜", fn: "摄入氧、排出二氧化碳（进行呼吸）" },
      { n: 3, name: "口沟", fn: "细菌和微小的浮游植物等食物由此进入" },
      { n: 4, name: "食物泡", fn: "消化食物、吸收营养" },
      { n: 5, name: "胞肛", fn: "排出不能消化的食物残渣" },
      { n: 6, name: "伸缩泡", fn: "把体内多余的水分和废物排出体外" },
      { n: 7, name: "收集管" },
      { n: 8, name: "细胞核" },
      { n: 9, name: "细胞质" }
    ]
  });

  /* ---------- 人体结构层次 ---------- */
  let L = "";
  const { box } = FK;
  L += box(4, 84, 62, 32, "受精卵");
  L += arr(68, 100, 104, 100) + txt(86, 92, "a", "tx b");
  L += box(106, 84, 62, 32, "细胞群");
  L += arr(170, 100, 204, 100) + txt(187, 92, "b", "tx b");
  ["上皮组织", "肌肉组织", "神经组织", "结缔组织"].forEach((t, i) => {
    L += box(206, 18 + i * 44, 76, 30, t);
    L += arr(284, 33 + i * 44, 318, 100, "ar thin", 6);
  });
  L += box(320, 84, 50, 32, "胃");
  L += arr(372, 100, 392, 100);
  L += box(394, 84, 76, 32, "消化系统");
  L += arr(472, 100, 492, 100);
  L += box(494, 84, 50, 32, "人体");
  L += txt(345, 140, "器官", "tx sm") + txt(432, 140, "系统", "tx sm") + txt(519, 140, "个体", "tx sm");
  BANK.fig("levels", { title: "人体结构层次示意图", vb: "0 10 550 186", ch: "u1c3", kp: "动物体的结构层次", body: L, drill: false });
})();
