/* 七下第四单元第三章：呼吸系统、肺泡与毛细血管、呼吸运动模型、肺内气压曲线 */
(function () {
  const { co, txt, arr, axes } = FK;

  /* ---------- 呼吸系统 ---------- */
  let r = "";
  // 头部轮廓（侧面）与鼻腔、咽、喉
  r += `<path class="k c-wht" d="M150 110 C136 100 128 80 132 58 C138 26 170 8 204 10 C240 12 262 36 262 66 C262 84 256 96 250 104 L246 120 C238 124 228 124 220 120 L214 132 L176 132 C172 124 164 118 150 110 Z"/>`;
  r += `<path class="k c-pink" d="M140 70 C150 62 176 60 196 66 L200 80 C182 78 160 80 146 84 Z"/>`;          // 鼻腔
  r += `<path class="k c-pink" d="M196 66 C206 70 210 82 208 96 L204 132 L190 132 L192 96 C194 86 194 78 196 66 Z"/>`; // 咽
  r += `<rect class="k c-pink" x="186" y="132" width="24" height="22" rx="4"/>`;                                  // 喉
  // 气管（软骨环）
  r += `<rect class="k c-wht" x="190" y="154" width="16" height="70"/>`;
  for (let y = 160; y < 222; y += 8) r += `<line class="st thin" x1="190" y1="${y}" x2="206" y2="${y}"/>`;
  // 肺
  r += `<path class="k c-pink" d="M184 236 C150 226 106 250 98 310 C92 360 112 396 150 398 C176 400 186 380 186 350 Z"/>`;
  r += `<path class="k c-pink" d="M212 236 C246 226 290 250 298 310 C304 360 284 396 246 398 C220 400 210 380 210 350 Z"/>`;
  // 支气管及分支
  r += `<path class="st thick" d="M198 224 L198 234 L170 262 M198 234 L226 262"/>`;
  r += `<path class="st" d="M170 262 L150 292 M170 262 L176 300 M150 292 L132 316 M150 292 L156 330 M226 262 L246 292 M226 262 L220 300 M246 292 L264 316 M246 292 L240 330"/>`;
  // 膈
  r += `<path class="st thick" d="M80 404 C130 372 266 372 316 404"/>`;
  r += co(1, 160, 76, 80, 60, "鼻", "l");
  r += co(2, 202, 104, 300, 92, "咽", "r");
  r += co(3, 210, 142, 300, 140, "喉", "r");
  r += co(4, 206, 196, 300, 190, "气管", "r");
  r += co(5, 226, 256, 330, 238, "支气管", "r");
  r += co(6, 120, 330, 60, 330, "肺", "l");
  r += co(7, 290, 392, 330, 412, "膈", "r");
  BANK.fig("respsys", {
    title: "人体呼吸系统示意图", vb: "20 0 380 430", maxw: 360, ch: "u4c3", kp: "呼吸系统的组成",
    body: r,
    labels: [
      { n: 1, name: "鼻", fn: "鼻毛和黏液清洁空气，毛细血管温暖空气" },
      { n: 2, name: "咽", fn: "食物和气体的共同通道" },
      { n: 3, name: "喉", fn: "既是气体的通道，又是发声的器官" },
      { n: 4, name: "气管", fn: "有C形软骨支架，内壁纤毛和黏液能形成痰" },
      { n: 5, name: "支气管" },
      { n: 6, name: "肺", fn: "呼吸系统的主要器官，是气体交换的场所" },
      { n: 7, name: "膈", fn: "收缩时顶部下降，使胸廓上下径增大" }
    ]
  });

  /* ---------- 肺泡与毛细血管 ---------- */
  let a = "";
  a += `<path class="st" style="stroke:var(--f-pink);stroke-width:18" d="M64 14 L120 70"/><path class="st" d="M52 22 L104 76 M76 6 L130 62"/>`;
  a += `<circle class="k c-pink" cx="170" cy="120" r="68"/>`;
  a += `<path class="st" style="stroke-width:16" d="M40 214 C100 214 140 196 170 192 C220 186 250 160 264 120 C272 96 290 80 320 76"/>`;
  a += `<path class="st" style="stroke:var(--f-blue);stroke-width:13" d="M40 214 C100 214 140 196 170 192"/>`;
  a += `<path class="st" style="stroke:var(--f-red);stroke-width:13" d="M170 192 C220 186 250 160 264 120 C272 96 290 80 320 76"/>`;
  a += FK.arr(60, 232, 110, 228, "ar mut thin", 6) + txt(66, 248, "血流方向", "tx sm", "start");
  a += FK.arr(180, 146, 190, 186, "ar red thick", 8) + txt(198, 164, "a", "tx b", "start");
  a += FK.arr(226, 172, 212, 134, "ar blue thick", 8) + txt(236, 150, "b", "tx b", "start");
  a += co(1, 140, 100, 70, 120, "肺泡", "l");
  a += co(2, 290, 84, 330, 120, "毛细血管", "r");
  a += co(3, 92, 42, 150, 24, "细支气管", "r");
  BANK.fig("alveolus", { drill: false,
    title: "肺泡与毛细血管之间的气体交换示意图", vb: "0 0 420 256", ch: "u4c3", kp: "肺内的气体交换",
    body: a,
    labels: [
      { n: 1, name: "肺泡", fn: "壁很薄，只由一层上皮细胞构成" },
      { n: 2, name: "毛细血管", fn: "包绕在肺泡外面，与肺泡进行气体交换" },
      { n: 3, name: "细支气管" }
    ]
  });

  /* ---------- 模拟呼吸运动的模型 ---------- */
  let m = "";
  const model = (x0, inhale) => {
    const by = inhale ? 196 : 164;  // 橡皮膜位置
    let s = `<path class="k c-wht" d="M${x0} 186 V90 C${x0} 50 ${x0 + 120} 50 ${x0 + 120} 90 V186"/>`;
    s += `<rect class="k c-gry" x="${x0 + 54}" y="38" width="12" height="60"/><path class="st" d="M${x0 + 60} 96 L${x0 + 40} 112 M${x0 + 60} 96 L${x0 + 80} 112"/>`;
    const rr = inhale ? 22 : 14;
    s += `<circle class="k c-pink" cx="${x0 + 34}" cy="${120 + rr * 0.4}" r="${rr}"/><circle class="k c-pink" cx="${x0 + 86}" cy="${120 + rr * 0.4}" r="${rr}"/>`;
    s += `<path class="k c-yel" d="M${x0} 186 C${x0 + 30} ${by} ${x0 + 90} ${by} ${x0 + 120} 186 Z"/>`;
    s += `<path class="st" d="M${x0 + 60} ${by - 4} V${by + 22}"/>`;
    s += inhale ? arr(x0 + 60, by + 2, x0 + 60, by + 26, "ar", 7) : arr(x0 + 60, by + 26, x0 + 60, by + 2, "ar", 7);
    return s;
  };
  m += model(20, true) + model(220, false);
  m += txt(80, 252, "甲", "tx b", "middle", 15) + txt(280, 252, "乙", "tx b", "middle", 15);
  m += co(1, 80, 50, 120, 26, "气管", "r");
  m += co(2, 40, 130, -4, 112, "肺", "l");
  m += co(3, 140, 150, 168, 132, "胸廓", "r");
  m += co(4, 100, 190, 168, 210, "膈", "r");
  BANK.fig("belljar", {
    title: "模拟膈肌运动的模型（玻璃管、气球、钟罩、橡皮膜）", vb: "-40 14 420 250", ch: "u4c3", kp: "呼吸运动",
    body: m,
    labels: [{ n: 1, name: "气管" }, { n: 2, name: "肺" }, { n: 3, name: "胸廓" }, { n: 4, name: "膈" }]
  });

  /* ---------- 一次呼吸中肺内气压与外界气压的差 ---------- */
  let p = "";
  const X0 = 60, Y0 = 110, W = 380, H = 80;
  p += axes({ x0: X0, y0: Y0 + 70, w: W, h: 160, xt: [], yt: [], xl: "时间", yl: "肺内气压与外界气压差" });
  p += `<line class="st" x1="${X0}" y1="${Y0}" x2="${X0 + W}" y2="${Y0}"/>` + txt(X0 - 8, Y0 + 4, "0", "tk", "end");
  const pts = [];
  for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([X0 + 20 + t * 320, Y0 + 50 * Math.sin(t * Math.PI * 2)]); }
  p += `<path class="curve s-blue" d="M${pts.map(q => q.map(v => v.toFixed(1)).join(" ")).join(" L")}"/>`;
  [["A", 0], ["B", 0.5], ["C", 1]].forEach(([k, t]) => {
    const x = X0 + 20 + t * 320;
    p += `<circle class="c-line" cx="${x}" cy="${Y0}" r="3.5"/>` + txt(x, Y0 - 9, k, "tx b");
  });
  BANK.fig("lungpress", { title: "一次呼吸过程中肺内气压与外界气压差的变化", vb: "0 20 470 200", ch: "u4c3", kp: "呼吸运动", body: p, drill: false });
})();
