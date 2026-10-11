/* 八上第五单元：食物网、物质循环、能量金字塔、鼠妇实验 */
(function () {
  const { txt, arr, parr, cbox, link, lbl } = FK;

  /* ---------- 草原生态系统食物网 ---------- */
  const N = {
    鹰: { x: 220, y: 30, w: 46, h: 26 },
    狐: { x: 220, y: 128, w: 46, h: 26 },
    蛇: { x: 392, y: 98, w: 46, h: 26 },
    兔: { x: 80, y: 192, w: 46, h: 26 },
    鼠: { x: 360, y: 192, w: 46, h: 26 },
    草: { x: 220, y: 272, w: 46, h: 26 }
  };
  let w = "";
  Object.keys(N).forEach(k => { w += cbox(N[k], k, k === "草" ? "hl" : ""); });
  [["草", "兔"], ["草", "鼠"], ["兔", "狐"], ["兔", "鹰"], ["鼠", "狐"], ["鼠", "鹰"], ["鼠", "蛇"], ["蛇", "鹰"]]
    .forEach(([a, b]) => { w += link(N[a], N[b]); });
  BANK.fig("foodweb", {
    title: "某草原生态系统的食物网示意图", vb: "40 6 410 290", maxw: 440, ch: "u5c1", kp: "食物链和食物网",
    body: w, drill: false
  });

  /* ---------- 生态系统中的物质循环 ---------- */
  let c = "";
  c += cbox({ x: 230, y: 34, w: 420, h: 32 }, "大气中的二氧化碳");
  const 甲 = { x: 60, y: 190, w: 64, h: 32 }, 乙 = { x: 230, y: 190, w: 64, h: 32 }, 丙 = { x: 400, y: 190, w: 64, h: 32 };
  c += cbox(甲, "甲", "hl") + cbox(乙, "乙") + cbox(丙, "丙");
  c += arr(48, 52, 48, 172) + arr(72, 172, 72, 52) + arr(230, 172, 230, 52) + arr(400, 172, 400, 52);
  c += arr(94, 190, 196, 190) + arr(264, 190, 366, 190);
  c += parr([[60, 208], [60, 236], [400, 236], [400, 208]]);
  c += lbl(1, 44, 112, "光合作用", "l") + lbl(2, 76, 112, "呼吸作用", "r") + lbl(3, 234, 112, "呼吸作用", "r") + lbl(4, 404, 112, "分解作用", "r");
  c += txt(145, 182, "捕食", "tx sm") + txt(230, 252, "遗体、遗物", "tx sm");
  BANK.fig("ecocycle", {
    title: "生态系统中的物质循环示意图（甲、乙、丙代表生态系统的生物成分）", vb: "-40 10 540 254", maxw: 520, ch: "u5c1", kp: "能量流动和物质循环",
    body: c, drill: false,
    labels: [{ n: 1, name: "光合作用" }, { n: 2, name: "呼吸作用" }, { n: 3, name: "呼吸作用" }, { n: 4, name: "分解作用" }]
  });

  /* ---------- 能量金字塔 ---------- */
  let p = "";
  const lv = [["丁", 300, "c-leaf"], ["丙", 220, "c-yel"], ["乙", 140, "c-org"], ["甲", 64, "c-red"]];
  lv.forEach(([s, wd, cls], i) => {
    const y = 210 - i * 46;
    p += `<rect class="k ${cls}" x="${200 - wd / 2}" y="${y}" width="${wd}" height="40" rx="3"/>`;
    p += txt(200, y + 25, s, "tx b", "middle", 15);
  });
  p += arr(380, 246, 380, 70, "ar mut") + txt(392, 160, "营养级逐级升高", "tx sm", "start");
  BANK.fig("epyramid", {
    title: "某生态系统中四种生物所含能量的相对值（能量金字塔）", vb: "30 64 460 194", maxw: 460, ch: "u5c1", kp: "能量流动和物质循环",
    body: p, drill: false
  });

  /* ---------- 探究光对鼠妇分布的影响 ---------- */
  let m = "";
  m += `<rect class="k c-soil" x="41" y="140" width="358" height="30"/>`;
  m += `<path class="st thick nf" d="M40 60 V170 H400 V60"/>`;
  m += `<rect class="k c-dark" x="34" y="50" width="186" height="10"/>`;          // 纸板
  m += `<rect class="k c-wat" x="220" y="53" width="186" height="5"/>`;           // 玻璃板
  [270, 312, 354].forEach(x => { m += arr(x + 20, 2, x, 44, "ar mut", 6); });
  const bug = (x, y) => `<ellipse class="k c-dark" cx="${x}" cy="${y}" rx="7" ry="4"/><path class="st thin" d="M${x - 4} ${y + 3} l-2 4 M${x} ${y + 4} v4 M${x + 4} ${y + 3} l2 4"/>`;
  [[204, 132], [220, 128], [236, 132], [212, 120], [228, 120]].forEach(([x, y]) => { m += bug(x, y); });
  m += txt(127, 44, "纸板", "tx") + txt(412, 60, "玻璃板", "tx", "start");
  m += txt(127, 104, "阴暗", "tx b", "middle", 15) + txt(330, 104, "明亮", "tx b", "middle", 15);
  m += txt(110, 160, "湿土", "tx sm") + txt(340, 160, "湿土", "tx sm");
  m += `<line class="ld" x1="220" y1="136" x2="220" y2="184"/>` + txt(220, 200, "鼠妇", "tx");
  BANK.fig("woodlouse", {
    title: "探究“光对鼠妇分布的影响”实验装置（侧面示意）", vb: "20 -6 450 214", maxw: 460, ch: "u5c1", kp: "生物与环境的关系",
    body: m, drill: false
  });
})();
