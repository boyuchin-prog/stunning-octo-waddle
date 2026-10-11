/* 七下第四单元第一章：女性生殖系统、胎儿与胎盘、青春期身高增长曲线 */
(function () {
  const { co, txt, axes } = FK;

  /* ---------- 女性生殖系统 ---------- */
  let f = "";
  // 子宫
  f += `<path class="k c-pink" d="M170 70 C170 50 250 50 250 70 C252 110 236 140 222 156 L198 156 C184 140 168 110 170 70 Z"/>`;
  f += `<path class="k c-cyto" d="M186 76 C186 66 234 66 234 76 C234 104 224 126 214 140 L206 140 C196 126 186 104 186 76 Z"/>`;
  // 阴道
  f += `<path class="k c-pink" d="M200 156 L220 156 L224 214 L196 214 Z"/>`;
  f += `<path class="st thin" d="M210 158 V212"/>`;
  // 输卵管
  f += `<path class="k c-pink" d="M172 72 C140 56 106 52 82 66 C70 74 66 88 72 98 L80 94 C78 84 84 76 92 72 C112 64 140 70 170 84 Z"/>`;
  f += `<path class="k c-pink" d="M248 72 C280 56 314 52 338 66 C350 74 354 88 348 98 L340 94 C342 84 336 76 328 72 C308 64 280 70 250 84 Z"/>`;
  // 伞部
  f += `<path class="st" d="M72 98 l-6 8 M76 100 l-2 10 M80 98 l3 9 M348 98 l6 8 M344 100 l2 10 M340 98 l-3 9"/>`;
  // 卵巢
  f += `<ellipse class="k c-yel" cx="98" cy="116" rx="22" ry="13"/><ellipse class="k c-yel" cx="322" cy="116" rx="22" ry="13"/>`;
  f += `<path class="st thin" d="M114 106 L150 82 M306 106 L270 82"/>`;
  f += co(1, 322, 116, 380, 140, "卵巢", "r");
  f += co(2, 300, 62, 380, 40, "输卵管", "r");
  f += co(3, 228, 100, 380, 92, "子宫", "r");
  f += co(4, 222, 196, 380, 196, "阴道", "r");
  BANK.fig("female", {
    title: "女性生殖系统示意图", vb: "40 24 420 206", ch: "u4c1", kp: "人的生殖系统",
    body: f,
    labels: [
      { n: 1, name: "卵巢", fn: "产生卵细胞并分泌雌性激素" },
      { n: 2, name: "输卵管", fn: "输送卵细胞，是受精的场所" },
      { n: 3, name: "子宫", fn: "胚胎和胎儿发育的场所" },
      { n: 4, name: "阴道", fn: "精子进入和胎儿产出的通道" }
    ]
  });

  /* ---------- 子宫内的胎儿 ---------- */
  let p = "";
  p += `<path class="k c-pink" d="M80 60 C80 10 300 10 300 60 C306 160 260 230 200 236 C120 236 74 160 80 60 Z"/>`;
  p += `<path class="k c-wat" d="M98 66 C98 30 282 30 282 66 C286 150 248 212 192 216 C130 214 94 150 98 66 Z"/>`;
  // 胎盘
  p += `<path class="k c-red" d="M216 38 C246 36 272 46 280 66 C262 70 236 64 216 56 Z"/>`;
  // 脐带
  p += `<path class="st thick s-red" d="M240 60 C230 90 200 92 196 116 C194 130 184 132 176 136"/>`;
  // 胎儿（简化：头、身体、蜷缩的四肢）
  p += `<circle class="k c-bone" cx="150" cy="170" r="32"/>`;
  p += `<path class="k c-bone" d="M174 150 C206 128 236 150 226 182 C220 202 196 208 178 200 C168 194 168 170 174 150 Z"/>`;
  p += `<path class="st" d="M200 196 C214 206 224 196 222 186 M190 150 C188 168 174 176 166 186"/>`;
  p += co(1, 290, 120, 340, 120, "子宫", "r");
  p += co(2, 262, 54, 340, 40, "胎盘", "r");
  p += co(3, 218, 88, 340, 84, "脐带", "r");
  p += co(4, 150, 170, 40, 200, "胎儿", "l");
  p += co(5, 120, 90, 40, 80, "羊水", "l");
  BANK.fig("fetus", {
    title: "子宫内胎儿发育示意图", vb: "-20 4 420 240", ch: "u4c1", kp: "胚胎发育",
    body: p,
    labels: [
      { n: 1, name: "子宫" },
      { n: 2, name: "胎盘", fn: "胎儿与母体进行物质交换的器官" },
      { n: 3, name: "脐带", fn: "连接胎儿与胎盘，内有血管" },
      { n: 4, name: "胎儿" },
      { n: 5, name: "羊水", fn: "胎儿生活的液体环境，起缓冲保护作用" }
    ]
  });

  /* ---------- 青春期身高增长速度 ---------- */
  let g = "";
  const X0 = 50, Y0 = 190, W = 400, H = 150;
  const fx = a => X0 + (a / 20) * W, fy = v => Y0 - (v / 12) * H;
  g += axes({ x0: X0, y0: Y0, w: W, h: H, xt: [0, 4, 8, 12, 16, 20].map(a => ({ x: fx(a), s: String(a) })), yt: [0, 4, 8, 12].map(v => ({ y: fy(v), s: String(v) })), xl: "年龄（岁）", yl: "身高增长速度（厘米/年）" });
  const curve = (pk, amp) => {
    const pts = [];
    for (let a = 1; a <= 19; a += 0.25) {
      const base = 7.5 * Math.exp(-a / 2.2) + 4.6 * Math.exp(-Math.pow(a - 6, 2) / 40) + 0.2;
      const spurt = amp * Math.exp(-Math.pow(a - pk, 2) / 2.2);
      const tail = a > pk + 3 ? Math.exp(-(a - pk - 3) * 0.6) : 1;
      pts.push([fx(a), fy(Math.max(0.2, (base + spurt) * tail))]);
    }
    return pts.map(p => p.map(v => v.toFixed(1)).join(" ")).join(" L");
  };
  g += `<path class="curve s-red" d="M${curve(11.5, 4.6)}"/>`;
  g += `<path class="curve s-blue" d="M${curve(13.5, 6.2)}"/>`;
  g += txt(fx(11.2), fy(8.6), "女", "tx b") + txt(fx(14.2), fy(10.2), "男", "tx b");
  BANK.fig("growth", { title: "男女身高增长速度曲线（示意）", vb: "0 20 480 210", ch: "u4c1", kp: "青春期", body: g, drill: false });
})();
