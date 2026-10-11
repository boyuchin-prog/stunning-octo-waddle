/* 七下第四单元第五章：泌尿系统、肾单位 */
(function () {
  const { co, txt, arr } = FK;

  /* ---------- 泌尿系统 ---------- */
  let u = "";
  // 主动脉、下腔静脉（示意）
  u += `<rect class="k c-red" x="196" y="20" width="12" height="260"/><rect class="k c-blue" x="212" y="20" width="12" height="260"/>`;
  // 肾脏（蚕豆形）
  const kid = (cx, flip) => {
    const s = flip ? -1 : 1;
    return `<path class="k c-brn" d="M${cx} 70 C${cx + s * 40} 66 ${cx + s * 50} 110 ${cx + s * 46} 140 C${cx + s * 42} 176 ${cx + s * 10} 190 ${cx - s * 8} 176 C${cx - s * 20} 166 ${cx - s * 6} 150 ${cx - s * 8} 130 C${cx - s * 10} 112 ${cx - s * 22} 104 ${cx - s * 16} 88 C${cx - s * 12} 76 ${cx - s * 6} 70 ${cx} 70 Z"/>`;
  };
  u += kid(120, true) + kid(300, false);
  u += `<path class="st thick s-red" d="M196 120 H136 M224 120 H286"/>`;
  // 输尿管
  u += `<path class="st thick" style="stroke:var(--f-yel);stroke-width:5" d="M122 150 C130 200 170 240 190 286 M298 150 C290 200 250 240 230 286"/>`;
  // 膀胱、尿道
  u += `<path class="k c-yel" d="M170 286 C170 270 250 270 250 286 C254 320 236 340 210 342 C184 340 166 320 170 286 Z"/>`;
  u += `<rect class="k c-yel" x="204" y="340" width="12" height="40"/>`;
  u += co(1, 312, 120, 380, 110, "肾脏", "r");
  u += co(2, 276, 210, 380, 210, "输尿管", "r");
  u += co(3, 238, 316, 380, 316, "膀胱", "r");
  u += co(4, 210, 372, 380, 372, "尿道", "r");
  BANK.fig("urinary", {
    title: "人体泌尿系统示意图", vb: "40 10 420 380", maxw: 380, ch: "u4c5", kp: "泌尿系统",
    body: u,
    labels: [
      { n: 1, name: "肾脏", fn: "形成尿液的器官" },
      { n: 2, name: "输尿管", fn: "把尿液输送到膀胱" },
      { n: 3, name: "膀胱", fn: "暂时储存尿液" },
      { n: 4, name: "尿道", fn: "把尿液排出体外" }
    ]
  });

  /* ---------- 肾单位 ---------- */
  let n = "";
  // 入球小动脉 → 肾小球 → 出球小动脉
  n += `<path class="st" style="stroke:var(--f-red);stroke-width:7" d="M20 80 C60 80 80 84 100 92"/>`;
  n += `<path class="k c-wht" d="M86 60 C86 30 158 24 168 58 C176 84 162 116 136 122 C112 126 88 110 86 86 Z"/>`;   // 肾小囊外壁
  n += `<circle class="k c-red" cx="128" cy="78" r="26"/>`;
  n += `<path class="st thin" style="stroke:var(--f-wht)" d="M108 72 q10 -14 20 0 q10 14 20 0 M110 86 q10 -12 18 0 q8 12 18 0"/>`;
  n += `<path class="st" style="stroke:var(--f-red);stroke-width:6" d="M104 100 C80 120 60 140 60 170"/>`;
  // 肾小管（盘曲），外面包绕毛细血管
  const tub = "M160 108 C200 120 220 96 250 110 C280 124 262 150 232 152 C200 154 196 178 226 188 C258 198 300 186 320 160 L320 280 C320 300 300 300 296 280 L296 196";
  n += `<path class="st" style="stroke:var(--f-yel);stroke-width:12" d="${tub}"/>`;
  n += `<path class="st" d="${tub}" style="stroke-width:1.2"/>`;
  n += `<path class="st" style="stroke:var(--f-red);stroke-width:2.5" d="M60 170 C60 210 120 220 170 206 C220 192 250 214 260 240 C270 270 300 300 340 300"/>`;
  n += `<path class="st" style="stroke:var(--f-blue);stroke-width:5" d="M340 300 C380 300 400 290 420 290"/>`;
  // 集合管
  n += `<path class="st" style="stroke:var(--f-yel);stroke-width:10" d="M380 40 V320"/>`;
  n += `<path class="st" style="stroke:var(--f-yel);stroke-width:8" d="M320 160 C340 150 360 150 380 160"/>`;
  n += arr(380, 300, 380, 340, "ar", 7);
  n += co(1, 40, 80, 20, 40, "入球小动脉", "r");
  n += co(2, 128, 78, 170, 20, "肾小球", "r");
  n += co(3, 92, 70, 20, 120, "肾小囊", "l");
  n += co(4, 72, 150, 20, 190, "出球小动脉", "l");
  n += co(5, 320, 230, 440, 220, "肾小管", "r");
  n += co(6, 120, 214, 60, 280, "肾小管外的毛细血管", "l");
  n += co(7, 410, 290, 440, 300, "肾静脉（方向）", "r");
  n += co(8, 380, 80, 430, 70, "集合管", "r");
  BANK.fig("nephron", {
    title: "肾单位结构示意图", vb: "-110 6 700 340", maxw: 580, ch: "u4c5", kp: "尿的形成",
    body: n,
    labels: [
      { n: 1, name: "入球小动脉", fn: "把血液送入肾小球，内流动脉血" },
      { n: 2, name: "肾小球", fn: "毛细血管球，起过滤（滤过）作用" },
      { n: 3, name: "肾小囊", fn: "收集过滤出来的液体，其中的液体叫原尿" },
      { n: 4, name: "出球小动脉", fn: "离开肾小球的小动脉，内仍流动脉血" },
      { n: 5, name: "肾小管", fn: "重吸收全部葡萄糖、大部分水和部分无机盐" },
      { n: 6, name: "肾小管外的毛细血管" },
      { n: 7, name: "肾静脉（方向）" },
      { n: 8, name: "集合管" }
    ]
  });
})();
