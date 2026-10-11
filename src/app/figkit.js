/* =========================================================
 * 示意图绘制工具：用少量函数拼出 SVG 字符串。
 * 颜色全部走 CSS 变量（见 styles.css 的 --f-* 系列），深浅色主题自动适配。
 * 标注文字由“序号 + 名称”两段组成：做题时只显示序号，看答案/查手册时显示名称。
 * ========================================================= */
const FK = {
  /* 引线标注：(x1,y1) 在结构上，(x2,y2) 为文字端；side: r 右 / l 左 / t 上 / b 下 */
  co(n, x1, y1, x2, y2, name, side) {
    side = side || (x2 >= x1 ? "r" : "l");
    return `<g class="co"><line class="ld" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>` +
      `<circle class="dot" cx="${x1}" cy="${y1}" r="1.7"/>` +
      FK.lbl(n, x2, y2, name, side) + `</g>`;
  },
  /* 只有文字的标注 */
  lbl(n, x, y, name, side) {
    side = side || "r";
    let tx = x, ty = y + 4, anc = "start";
    if (side === "r") tx = x + 3;
    else if (side === "l") { tx = x - 3; anc = "end"; }
    else if (side === "t") { ty = y - 4; anc = "middle"; }
    else if (side === "b") { ty = y + 14; anc = "middle"; }
    else if (side === "c") { anc = "middle"; }
    const num = n === "" || n == null ? "" : `<tspan class="n">${circ(n)}</tspan>`;
    const nm = name ? `<tspan class="nm">${name}</tspan>` : "";
    return `<text class="lb" x="${tx}" y="${ty}" text-anchor="${anc}">${num}${nm}</text>`;
  },
  /* 普通文字 */
  txt(x, y, s, cls, anchor, size) {
    return `<text class="${cls || "tx"}" x="${x}" y="${y}" text-anchor="${anchor || "middle"}"${size ? ` font-size="${size}"` : ""}>${s}</text>`;
  },
  /* 带箭头的线段（箭头用多边形绘制，不依赖 marker，打印与隐藏切换都可靠） */
  arr(x1, y1, x2, y2, cls, head) {
    head = head || 7;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const bx = x2 - head * Math.cos(ang), by = y2 - head * Math.sin(ang);
    const w = head * 0.55;
    const p1 = [bx + w * Math.sin(ang), by - w * Math.cos(ang)];
    const p2 = [bx - w * Math.sin(ang), by + w * Math.cos(ang)];
    const c = cls || "ar";
    return `<g class="${c}"><line x1="${x1}" y1="${y1}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"/>` +
      `<polygon points="${x2},${y2} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}"/></g>`;
  },
  /* 折线箭头：points 为 [[x,y],...]，最后一段带箭头 */
  parr(points, cls, head) {
    const c = cls || "ar";
    const n = points.length;
    let s = `<g class="${c}"><polyline fill="none" points="${points.slice(0, n - 1).map(p => p.join(",")).join(" ")} ${points[n - 1].join(",")}"/></g>`;
    const [x1, y1] = points[n - 2], [x2, y2] = points[n - 1];
    return s + FK.arr(x1, y1, x2, y2, c, head);
  },
  /* 文字方框（用于流程图、食物网、循环图） */
  box(x, y, w, h, s, cls) {
    return `<g class="bx ${cls || ""}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>` +
      `<text class="bt" x="${x + w / 2}" y="${y + h / 2 + 4.5}" text-anchor="middle">${s}</text></g>`;
  },
  /* 坐标轴（曲线图用）：返回轴线与刻度；fx/fy 为数据到坐标的映射 */
  axes(o) {
    const { x0, y0, w, h, xt, yt, xl, yl } = o;
    let s = `<g class="ax"><line x1="${x0}" y1="${y0}" x2="${x0 + w}" y2="${y0}"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 - h}"/>`;
    s += FK.arr(x0 + w - 8, y0, x0 + w + 6, y0, "ar thin", 6) + FK.arr(x0, y0 - h + 8, x0, y0 - h - 6, "ar thin", 6);
    (xt || []).forEach(t => {
      s += `<line x1="${t.x}" y1="${y0}" x2="${t.x}" y2="${y0 + 4}"/>` + FK.txt(t.x, y0 + 16, t.s, "tk");
    });
    (yt || []).forEach(t => {
      s += `<line x1="${x0 - 4}" y1="${t.y}" x2="${x0}" y2="${t.y}"/>` + FK.txt(x0 - 7, t.y + 4, t.s, "tk", "end");
    });
    if (xl) s += FK.txt(x0 + w + 4, y0 + 30, xl, "tk", "end");
    if (yl) s += FK.txt(x0 + 4, y0 - h - 12, yl, "tk", "start");
    return s + `</g>`;
  }
};

/* 组装完整 SVG */
function figSvg(f) {
  const vb = f.vb || "0 0 400 300";
  const [, , w] = vb.split(/\s+/).map(Number);
  return `<svg class="figsvg" viewBox="${vb}" role="img" aria-label="${esc(f.title || "")}" style="max-width:${f.maxw || Math.max(260, Math.min(w * 1.15, 560))}px">${f.body}</svg>`;
}

/* 题目/手册中的插图块。names=true 时显示结构名称 */
function figHtml(id, opts) {
  const f = BANK.figs[id];
  if (!f) return "";
  opts = opts || {};
  const names = opts.names ? " names" : "";
  return `<figure class="fig${names}" data-fig="${esc(id)}">${figSvg(f)}` +
    `<figcaption>${esc(f.title || "")}${opts.toggle && f.labels ? ` <button type="button" class="linkbtn no-print" data-act="toggleNames">${opts.names ? "隐藏名称" : "显示名称"}</button>` : ""}` +
    `${opts.zoom !== false ? ` <button type="button" class="linkbtn no-print" data-act="zoomFig" data-fig="${esc(id)}">放大</button>` : ""}</figcaption></figure>`;
}
