/* =========================================================
 * 页面：开卷速查手册、考前必看、老师组卷与打印、课堂投屏、搜索、设置、说明
 * ========================================================= */

/* ---------- 开卷速查手册 ---------- */
function viewHandbook() {
  let h = pageHead("开卷速查手册", "会考开卷，但翻书很花时间。这里把每章必考的结论、易混对比和实验步骤压缩成一页，可打印出来按课本顺序带进考场（以当年考试允许携带的资料为准）。",
    UI.canPrint() ? `<button type="button" class="btn" data-act="printHb" data-ch="all">${icon("print")}打印全部</button>` : "");
  h += `<a class="tipcard" href="#tips"><b>考前必看：开卷答题策略与答题模板</b><small>时间怎么分配、实验题和资料题怎么写才能拿满分</small></a>`;
  for (const b of BANK.books) {
    h += `<section class="book"><h2 class="book-h">${esc(b.name)}</h2><ul class="chlist hb">`;
    for (const u of b.units) for (const c of u.chapters) {
      const has = !!BANK.hb[c.id];
      h += `<li>${has ? `<a href="#hbc/${c.id}">` : `<span class="dis">`}<span class="c-no">${esc(c.no)}</span><span class="c-t">${esc(c.name)}<small>${esc(u.name)}</small></span>${has ? "</a>" : "</span>"}</li>`;
    }
    h += `</ul></section>`;
  }
  return { html: h, title: "开卷速查手册" };
}

function hbChapterHtml(chId, forPrint) {
  const c = BANK.chMap[chId], d = BANK.hb[chId];
  if (!c || !d) return "";
  let h = `<article class="hbook" id="hb-${chId}">`;
  h += `<header class="hb-h"><p class="eyebrow">${esc(c.bookName)} · ${esc(c.unitName)}</p><h2>${esc(c.no)} ${esc(c.name)}</h2>${d.intro ? `<p class="hb-intro">${fmt(d.intro, true)}</p>` : ""}</header>`;
  for (const s of d.secs || []) {
    h += `<section class="hb-sec"><h3>${fmt(s.h, true)}</h3>`;
    if (s.fig && BANK.figs[s.fig]) h += figHtml(s.fig, { names: true, zoom: !forPrint });
    if (s.pts) h += `<ul>${s.pts.map(p => `<li>${fmt(p, true)}</li>`).join("")}</ul>`;
    if (s.tip) h += `<p class="hb-tip"><b>易错</b>${fmt(s.tip, true)}</p>`;
    h += `</section>`;
  }
  for (const t of d.tables || []) {
    h += `<section class="hb-sec"><h3>${fmt(t.h, true)}</h3><div class="tblwrap"><table class="tbl hbt"><thead><tr>${t.head.map(x => `<th>${fmt(x, true)}</th>`).join("")}</tr></thead><tbody>` +
      t.rows.map(r => `<tr>${r.map((x, i) => i === 0 ? `<th scope="row">${fmt(x, true)}</th>` : `<td>${fmt(x, true)}</td>`).join("")}</tr>`).join("") + `</tbody></table></div></section>`;
  }
  for (const e of d.exps || []) {
    h += `<section class="hb-sec exp"><h3><span class="exp-tag">实验</span>${fmt(e.h, true)}</h3>`;
    if (e.steps) h += `<ol class="steps">${e.steps.map(x => `<li>${fmt(x, true)}</li>`).join("")}</ol>`;
    if (e.notes) h += `<ul class="notes">${e.notes.map(x => `<li>${fmt(x, true)}</li>`).join("")}</ul>`;
    h += `</section>`;
  }
  if (d.traps && d.traps.length) {
    h += `<section class="hb-sec traps"><h3>易错易混清单</h3><ul>${d.traps.map(x => `<li>${fmt(x, true)}</li>`).join("")}</ul></section>`;
  }
  h += `</article>`;
  return h;
}

function viewHbChapter(chId) {
  const c = BANK.chMap[chId];
  if (!c || !BANK.hb[chId]) return viewNotFound();
  const idx = BANK.chapters.findIndex(x => x.id === chId);
  const prev = BANK.chapters.slice(0, idx).reverse().find(x => BANK.hb[x.id]);
  const next = BANK.chapters.slice(idx + 1).find(x => BANK.hb[x.id]);
  let h = `<nav class="crumb no-print"><a href="#hb">开卷速查手册</a><span>›</span>${esc(c.bookName)}</nav>`;
  h += `<div class="row wrap no-print hb-tools"><a class="btn" href="#ch/${chId}">${icon("practice")}练本章题目</a>${UI.canPrint() ? `<button type="button" class="btn" data-act="printHb" data-ch="${chId}">${icon("print")}打印本章</button>` : ""}</div>`;
  h += `<div class="print-area">${hbChapterHtml(chId)}</div>`;
  h += `<nav class="pager no-print">${prev ? `<a href="#hbc/${prev.id}">‹ ${esc(prev.name)}</a>` : "<span></span>"}${next ? `<a href="#hbc/${next.id}">${esc(next.name)} ›</a>` : "<span></span>"}</nav>`;
  return { html: h, title: c.name + " · 速查" };
}

function viewTips() {
  let h = `<nav class="crumb no-print"><a href="#hb">开卷速查手册</a><span>›</span>考前必看</nav>`;
  h += pageHead("考前必看", "开卷考试拼的是理解、速度和答题规范。下面这些方法在每次模考里都用得上。",
    UI.canPrint() ? `<button type="button" class="btn no-print" data-act="printPage">${icon("print")}打印</button>` : "");
  h += `<div class="print-area">${tipsHtml(false)}</div>`;
  return { html: h, title: "考前必看" };
}

function tipsHtml(withHead) {
  let h = `<article class="hbook">`;
  if (withHead) h += `<header class="hb-h"><p class="eyebrow">开卷答题策略与答题模板</p><h2>考前必看</h2></header>`;
  for (const t of BANK.tips) h += `<section class="hb-sec"><h3>${fmt(t.h, true)}</h3>${t.body}</section>`;
  return h + `</article>`;
}

/* ---------- 老师组卷 ---------- */
const TeacherForm = {
  state: null,
  init() {
    if (this.state) return this.state;
    this.state = {
      title: "八年级生物学 模拟测试卷", chs: BANK.chapters.map(c => c.id),
      mcqN: 25, mcqPt: 2, casePts: 50, minutes: 60, diff: "std", fresh: true
    };
    return this.state;
  }
};

function viewTeacher() {
  const f = TeacherForm.init();
  const papers = Store.papers();
  let h = pageHead("老师组卷", "选好范围和题量，一键生成试卷；可逐题替换，再分别打印试卷和答案解析。",
    `<a class="btn" href="#class">${icon("screen")}课堂投屏</a>`);
  h += `<section class="panel form"><div class="panel-h"><h2>组卷设置</h2>
    <span class="row"><button type="button" class="linkbtn" data-act="tPreset" data-p="full">全真结构</button><button type="button" class="linkbtn" data-act="tPreset" data-p="unit">单元小测</button><button type="button" class="linkbtn" data-act="tPreset" data-p="quick">10分钟小练</button></span></div>
    <label class="field"><span>试卷标题</span><input id="tTitle" type="text" value="${esc(f.title)}" maxlength="40"></label>
    <div class="grid3">
      <label class="field"><span>单选题数量</span><input id="tMcqN" type="number" min="0" max="60" value="${f.mcqN}"></label>
      <label class="field"><span>每题分值</span><input id="tMcqPt" type="number" min="1" max="5" value="${f.mcqPt}"></label>
      <label class="field"><span>非选择题总分</span><input id="tCasePts" type="number" min="0" max="80" step="2" value="${f.casePts}"></label>
      <label class="field"><span>考试时间（分钟）</span><input id="tMin" type="number" min="5" max="120" value="${f.minutes}"></label>
      <label class="field"><span>难度</span><select id="tDiff">
        <option value="easy"${f.diff === "easy" ? " selected" : ""}>基础（基础题为主）</option>
        <option value="std"${f.diff === "std" ? " selected" : ""}>标准（约6:3:1）</option>
        <option value="hard"${f.diff === "hard" ? " selected" : ""}>提高（中档题多）</option></select></label>
      <label class="field check"><input id="tFresh" type="checkbox"${f.fresh ? " checked" : ""}><span>优先选当前学生没做过的题</span></label>
    </div>
    <div class="field"><span>出题范围 <button type="button" class="linkbtn" data-act="tAll" data-v="1">全选</button> <button type="button" class="linkbtn" data-act="tAll" data-v="0">全不选</button></span>
    <div class="scope">`;
  for (const b of BANK.books) {
    h += `<fieldset><legend><button type="button" class="linkbtn" data-act="tBook" data-b="${b.id}">${esc(b.name)}</button></legend>`;
    for (const u of b.units) for (const c of u.chapters) {
      h += `<label class="chk"><input type="checkbox" class="tch" value="${c.id}"${f.chs.includes(c.id) ? " checked" : ""}><span>${esc(c.name)}</span></label>`;
    }
    h += `</fieldset>`;
  }
  h += `</div></div><div class="row-end"><button type="button" class="btn primary lg" data-act="tMake">生成试卷</button></div></section>`;
  if (papers.length) {
    h += `<section class="panel"><div class="panel-h"><h2>已保存的试卷</h2></div><ul class="hist">`;
    for (const p of papers) {
      h += `<li><a href="#paper/${p.id}"><span class="h-t"><b>${esc(p.title)}</b><small>${fmtTime(p.at)} · 单选 ${p.mcq.length} 题 · 非选择 ${p.cases.length} 题 · 满分 ${paperTotal(p)}</small></span></a>
        <button type="button" class="linkbtn" data-act="delPaper" data-id="${p.id}">删除</button></li>`;
    }
    h += `</ul></section>`;
  }
  return { html: h, title: "老师组卷" };
}

function paperTotal(p) { return p.mcq.length * p.mcqPt + sum(p.cases, id => (BANK.qMap[id] && BANK.qMap[id].p) || 0); }

/* 当前预览中的试卷（未保存前也可编辑） */
let CUR_PAPER = null;

function viewPaper(id) {
  let p = CUR_PAPER && CUR_PAPER.id === id ? CUR_PAPER : Store.papers().find(x => x.id === id);
  if (!p) return viewNotFound();
  CUR_PAPER = p;
  const saved = Store.papers().some(x => x.id === p.id);
  let h = `<nav class="crumb no-print"><a href="#teacher">老师组卷</a><span>›</span>试卷预览</nav>`;
  h += `<div class="paper-tools no-print">
    <div class="row wrap">
      ${UI.canPrint() ? `<button type="button" class="btn primary" data-act="printPaper" data-mode="q">${icon("print")}打印试卷</button>
      <button type="button" class="btn" data-act="printPaper" data-mode="a">${icon("print")}打印答案与解析</button>` : `<span class="hint">打印功能请在下载到本机的离线版中使用。</span>`}
      <button type="button" class="btn" data-act="savePaper">${saved ? "已保存" : "保存试卷"}</button>
      <button type="button" class="btn" data-act="classPaper">课堂投屏这套卷</button>
      <button type="button" class="btn" data-act="paperAsExam">学生在本机作答</button>
    </div>
    <label class="field check"><input type="checkbox" id="showKey" data-act="toggleKey"><span>在页面上显示答案</span></label>
    <p class="hint">每道题右侧的“换一题”会从同一章节换一道同类型的题。</p>
  </div>`;
  h += `<div class="print-area">${paperHtml(p, { edit: true })}${paperKeyHtml(p)}</div>`;
  return { html: h, title: p.title };
}

function optLayout(opts) {
  const len = Math.max(...opts.map(o => stripText(o).length));
  return len <= 6 ? "o4" : len <= 15 ? "o2" : "o1";
}

function paperHtml(p, opts) {
  opts = opts || {};
  const total = paperTotal(p);
  let n = 0;
  let h = `<section class="paper">
    <header class="p-head"><h1 class="p-title">${esc(p.title)}</h1>
    <p class="p-sub">（满分 ${total} 分，考试时间 ${p.minutes} 分钟）</p>
    <p class="p-info">学校__________　班级__________　姓名__________　考号__________</p></header>`;
  if (p.mcq.length) {
    h += `<p class="p-sec">一、选择题（本大题共 ${p.mcq.length} 小题，每小题 ${p.mcqPt} 分，共 ${p.mcq.length * p.mcqPt} 分。在每小题给出的四个选项中，只有一项是符合题目要求的）</p><ol class="p-qs">`;
    for (const id of p.mcq) {
      const q = BANK.qMap[id]; n++;
      if (!q) continue;
      const order = permFor(p.seed, id, q);
      const ops = order.map(i => q.o[i]);
      h += `<li class="p-q"><div class="p-stem"><span class="p-n">${n}.</span>${fmt(q.q, !q.custom)}（　　）</div>${q.fig ? figHtml(q.fig, { zoom: false }) : ""}
        <div class="p-opts ${optLayout(ops)}">${ops.map((o, k) => `<span>${LETTERS[k]}. ${fmt(o, !q.custom)}</span>`).join("")}</div>
        ${opts.edit ? `<span class="p-edit no-print"><button type="button" class="linkbtn" data-act="swapQ" data-qid="${esc(id)}">换一题</button><button type="button" class="linkbtn" data-act="dropQ" data-qid="${esc(id)}">删除</button></span>` : ""}</li>`;
    }
    h += `</ol>`;
  }
  if (p.cases.length) {
    const cp = sum(p.cases, id => (BANK.qMap[id] && BANK.qMap[id].p) || 0);
    h += `<p class="p-sec">${p.mcq.length ? "二" : "一"}、非选择题（本大题共 ${p.cases.length} 小题，共 ${cp} 分）</p><ol class="p-qs">`;
    for (const id of p.cases) {
      const q = BANK.qMap[id]; n++;
      if (!q) continue;
      h += `<li class="p-q case"><div class="p-stem"><span class="p-n">${n}.</span>（${q.p}分）${q.title ? fmt(q.title, !q.custom) : ""}</div>`;
      if (q.m) h += `<div class="p-mat">${fmt(q.m, !q.custom)}</div>`;
      if (q.fig) h += figHtml(q.fig, { zoom: false });
      h += `<ol class="p-subs">`;
      q.subs.forEach((sub, i) => {
        h += `<li><span class="p-sn">（${i + 1}）</span>${fmt(sub.q, !q.custom)}`;
        if (sub.t === "s") {
          const order = permFor(p.seed, `${id}#${i}`, sub);
          const ops = order.map(k => sub.o[k]);
          h += `（　　）<div class="p-opts ${optLayout(ops)}">${ops.map((o, k) => `<span>${LETTERS[k]}. ${fmt(o, !q.custom)}</span>`).join("")}</div>`;
        } else if (sub.t === "j") h += `（　　）`;
        else if (sub.t === "f" && !/_{4,}/.test(sub.q)) h += `<span class="blank"></span>`;
        else if (sub.t === "o") h += `<div class="p-lines"><i></i><i></i></div>`;
        h += `</li>`;
      });
      h += `</ol>${opts.edit ? `<span class="p-edit no-print"><button type="button" class="linkbtn" data-act="swapQ" data-qid="${esc(id)}">换一题</button><button type="button" class="linkbtn" data-act="dropQ" data-qid="${esc(id)}">删除</button></span>` : ""}</li>`;
    }
    h += `</ol>`;
  }
  h += `<p class="p-foot">本卷题目选自“${APP_NAME}”原创题库，供练习使用。</p></section>`;
  return h;
}

function paperKeyHtml(p) {
  let h = `<section class="paper key"><header class="p-head"><h1 class="p-title">${esc(p.title)} · 参考答案与解析</h1></header>`;
  if (p.mcq.length) {
    h += `<p class="p-sec">一、选择题（每小题 ${p.mcqPt} 分）</p><table class="keytbl"><tbody>`;
    const rows = [];
    for (let i = 0; i < p.mcq.length; i += 10) rows.push(p.mcq.slice(i, i + 10).map((id, k) => ({ id, n: i + k + 1 })));
    for (const r of rows) {
      h += `<tr>${r.map(x => `<th>${x.n}</th>`).join("")}</tr><tr>${r.map(x => {
        const q = BANK.qMap[x.id]; if (!q) return "<td>—</td>";
        const order = permFor(p.seed, x.id, q); return `<td>${LETTERS[order.indexOf(q.a)]}</td>`;
      }).join("")}</tr>`;
    }
    h += `</tbody></table><ol class="p-ana">`;
    p.mcq.forEach((id, k) => { const q = BANK.qMap[id]; if (q) h += `<li><b>${k + 1}.</b> ${fmt(q.e || "", !q.custom)}</li>`; });
    h += `</ol>`;
  }
  if (p.cases.length) {
    h += `<p class="p-sec">${p.mcq.length ? "二" : "一"}、非选择题</p><ol class="p-ana">`;
    p.cases.forEach((id, k) => {
      const q = BANK.qMap[id]; if (!q) return;
      h += `<li><b>${p.mcq.length + k + 1}.</b>（${q.p}分）<ol class="p-subans">`;
      q.subs.forEach((sub, i) => {
        let ans;
        if (sub.t === "s") { const order = permFor(p.seed, `${id}#${i}`, sub); ans = LETTERS[order.indexOf(sub.a)]; }
        else if (sub.t === "j") ans = sub.a ? "正确" : "错误";
        else if (sub.t === "f") ans = esc((sub.a || []).join(" 或 "));
        else ans = fmt(sub.a, true);
        h += `<li>（${i + 1}）${ans}（${sub.p}分）${sub.e ? `<span class="muted">　${fmt(sub.e, true)}</span>` : ""}</li>`;
      });
      h += `</ol>${q.e ? `<p class="muted">${fmt(q.e, !q.custom)}</p>` : ""}</li>`;
    });
    h += `</ol>`;
  }
  h += `</section>`;
  return h;
}

/* ---------- 课堂投屏 ---------- */
function viewClass() {
  const papers = Store.papers();
  let h = pageHead("课堂投屏", "大字号逐题展示，讲题时再点“显示答案”。适合用教室一体机或投影。");
  h += `<section class="panel"><div class="panel-h"><h2>按章节讲题</h2></div><div class="row wrap">
    <select id="clsCh" class="sel">${BANK.chapters.map(c => `<option value="${c.id}">${esc(c.bookName.replace("年级", ""))} · ${esc(c.no)} ${esc(c.name)}</option>`).join("")}</select>
    <select id="clsType" class="sel"><option value="all">全部题型</option><option value="s">只要单选</option><option value="c">只要非选择题</option><option value="j">只要判断</option></select>
    <select id="clsOrder" class="sel"><option value="seq">按题库顺序</option><option value="rand">随机抽 10 题</option></select>
    <button type="button" class="btn primary" data-act="classStart">开始投屏</button></div></section>`;
  if (papers.length) {
    h += `<section class="panel"><div class="panel-h"><h2>讲评已组试卷</h2></div><ul class="hist">`;
    for (const p of papers) h += `<li><button type="button" class="hist-b" data-act="classPaperId" data-id="${p.id}"><span class="h-t"><b>${esc(p.title)}</b><small>${fmtTime(p.at)} · 共 ${p.mcq.length + p.cases.length} 题</small></span></button></li>`;
    h += `</ul></section>`;
  }
  h += `<section class="note"><p>投屏时：键盘 ← → 翻题，空格键显示/隐藏答案，F 键全屏。</p></section>`;
  return { html: h, title: "课堂投屏" };
}

/* ---------- 搜索 ---------- */
function viewSearch() {
  const h = pageHead("搜索题目", "输入关键词，在题干、选项、解析和速查手册中查找。开卷考试前用它练习“快速定位知识点”也很有效。") +
    `<div class="searchbox"><input id="searchInput" type="search" placeholder="例如：线粒体、反射弧、蒸腾作用" autocomplete="off" autofocus>${icon("search")}</div><div id="searchRes" class="searchres"></div>`;
  return { html: h, title: "搜索", after() { const el = $("#searchInput"); if (el && Search.last) { el.value = Search.last; Search.run(Search.last); } } };
}
const Search = {
  last: "", timer: 0,
  run(kw) {
    this.last = kw;
    const box = $("#searchRes");
    if (!box) return;
    const k = norm(kw);
    if (k.length < 1) { box.innerHTML = ""; return; }
    const hits = [];
    for (const q of BANK.qs) {
      if (q.auto) continue;
      const text = q.t === "c" ? [q.title, q.m].concat(q.subs.map(s => s.q + " " + (Array.isArray(s.a) ? s.a.join(" ") : s.a))).join(" ") : [q.q].concat(q.o || []).join(" ");
      const all = norm(stripText(text + " " + (q.e || "") + " " + (q.kp || "")));
      if (all.includes(k)) hits.push(q);
      if (hits.length >= 80) break;
    }
    const hb = [];
    for (const ch of BANK.chapters) {
      const d = BANK.hb[ch.id];
      if (!d) continue;
      for (const s of d.secs || []) {
        const t = norm(stripText([s.h].concat(s.pts || [], s.tip || []).join(" ")));
        if (t.includes(k)) hb.push({ ch, s });
      }
    }
    let h = "";
    if (hb.length) {
      h += `<h3 class="sr-h">速查手册 ${hb.length} 处</h3><ul class="sr-list">${hb.slice(0, 20).map(x => `<li><a href="#hbc/${x.ch.id}"><b>${esc(stripText(x.s.h))}</b><small>${esc(x.ch.bookName)} · ${esc(x.ch.name)}</small></a></li>`).join("")}</ul>`;
    }
    h += `<h3 class="sr-h">题目 ${hits.length >= 80 ? "80+" : hits.length} 道</h3>`;
    if (!hits.length) h += `<p class="muted">没有找到包含“${esc(kw)}”的题目。</p>`;
    else {
      h += `<div class="row"><button type="button" class="btn sm" data-act="searchPractice">把这些题做一遍</button></div><ul class="sr-list">`;
      h += hits.slice(0, 50).map(q => `<li><button type="button" data-act="openQ" data-qid="${esc(q.id)}"><b>${esc(stripText(q.t === "c" ? (q.title || q.m) : q.q).slice(0, 80))}</b><small>${Engine.typeLabel(q)} · ${esc(BANK.chOf(q).name)}</small></button></li>`).join("");
      h += `</ul>`;
    }
    this.hits = hits.map(q => q.id);
    box.innerHTML = h;
  }
};

/* ---------- 我的与设置 ---------- */
function viewMe() {
  const st = Store.settings;
  const o = Store.overall();
  const custom = Store.customs();
  let h = pageHead("我的与设置", `当前学生：${esc(Store.curName())}　已做 ${o.done} 题，正确率 ${accText(o.acc)}`);
  h += `<section class="panel"><div class="panel-h"><h2>学生档案</h2><span class="hint">一台电脑多人用时，每人建一个档案，记录互不影响</span></div><ul class="plist">`;
  for (const p of Store.profiles.list) {
    const cur = p.id === Store.profiles.cur;
    h += `<li class="${cur ? "on" : ""}"><span class="p-n">${esc(p.name)}${cur ? `<small>当前</small>` : ""}</span>
      <span class="row">${cur ? "" : `<button type="button" class="btn sm" data-act="switchProfile" data-id="${p.id}">切换</button>`}
      <button type="button" class="linkbtn" data-act="renameProfile" data-id="${p.id}">改名</button>
      ${Store.profiles.list.length > 1 ? `<button type="button" class="linkbtn danger" data-act="delProfile" data-id="${p.id}">删除</button>` : ""}</span></li>`;
  }
  h += `</ul><div class="row-end"><button type="button" class="btn" data-act="addProfile">新建学生档案</button></div></section>`;

  h += `<section class="panel form"><div class="panel-h"><h2>设置</h2></div><div class="grid3">
    <label class="field"><span>会考日期（用于倒计时）</span><input id="setExamDate" type="date" value="${esc(st.examDate)}" data-set="examDate"></label>
    <label class="field"><span>界面主题</span><select id="setTheme" data-set="theme">
      <option value="auto"${st.theme === "auto" ? " selected" : ""}>跟随系统</option><option value="light"${st.theme === "light" ? " selected" : ""}>浅色</option><option value="dark"${st.theme === "dark" ? " selected" : ""}>深色</option></select></label>
    <label class="field"><span>字号</span><select id="setFont" data-set="font">
      <option value="s"${st.font === "s" ? " selected" : ""}>小</option><option value="m"${st.font === "m" ? " selected" : ""}>标准</option><option value="l"${st.font === "l" ? " selected" : ""}>大</option><option value="xl"${st.font === "xl" ? " selected" : ""}>特大</option></select></label>
    <label class="field check"><input id="setAutoNext" type="checkbox" data-set="autoNext"${st.autoNext ? " checked" : ""}><span>单选答对后自动跳到下一题</span></label>
  </div>
  <div class="field"><span>等第分数线（原始分，默认按娄底2025年发布的政策）</span><div class="row wrap gradeset">
    <label>A ≥ <input id="setGA" type="number" min="1" max="100" value="${st.grade.A}" data-grade="A"></label>
    <label>B ≥ <input id="setGB" type="number" min="1" max="100" value="${st.grade.B}" data-grade="B"></label>
    <label>C ≥ <input id="setGC" type="number" min="1" max="100" value="${st.grade.C}" data-grade="C"></label>
    <button type="button" class="linkbtn" data-act="gradeReset">恢复默认</button></div></div></section>`;

  h += `<section class="panel"><div class="panel-h"><h2>数据备份与恢复</h2><span class="hint">做题记录只保存在这台设备的浏览器里，换设备或清理浏览器前请先备份</span></div>
    <div class="row wrap">
      ${IS_ARTIFACT ? "" : `<button type="button" class="btn" data-act="backupFile">${icon("data")}导出备份文件</button>`}
      <button type="button" class="btn" data-act="backupCode">复制备份码</button>
      <label class="btn filebtn">从备份文件恢复<input type="file" id="restoreFile" accept=".json,application/json" data-act="restoreFile"></label>
      <button type="button" class="btn" data-act="restoreCode">粘贴备份码恢复</button>
      <button type="button" class="btn danger" data-act="resetData">清空当前学生的记录</button>
    </div></section>`;

  h += `<section class="panel"><div class="panel-h"><h2>导入自己的题目</h2><span class="hint">老师可以把手里的题目批量加进题库（只保存在本机）</span></div>
    <p class="muted">在 Excel 里按列整理：<b>章节</b>（如“认识细胞”）｜<b>题型</b>（单选/判断）｜<b>题干</b>｜<b>选项A</b>｜<b>选项B</b>｜<b>选项C</b>｜<b>选项D</b>｜<b>答案</b>（A~D 或 对/错）｜<b>解析</b>，选中这些行复制，粘贴到下面。判断题的选项列留空。</p>
    <textarea id="importText" rows="5" placeholder="从 Excel 复制后粘贴到这里（每行一题，列之间是制表符）"></textarea>
    <div class="row wrap"><button type="button" class="btn primary" data-act="importQs">导入</button>
      ${custom.length ? `<span class="muted">已导入 ${custom.length} 题</span><button type="button" class="linkbtn" data-act="exportCustom">复制为文本</button><button type="button" class="linkbtn danger" data-act="clearCustom">全部删除</button>` : ""}</div></section>`;
  h += `<section class="note"><p><a href="#about">关于本程序 · 内容依据 · 使用说明</a>　版本 ${APP_VERSION}</p></section>`;
  return { html: h, title: "我的与设置" };
}

/* 解析从 Excel 粘贴的题目 */
function parseImport(text) {
  const out = [], errs = [];
  const lines = String(text || "").split(/\r?\n/).map(l => l.replace(/\s+$/, "")).filter(l => l.trim());
  const findCh = s => {
    s = String(s || "").trim();
    if (BANK.chMap[s]) return s;
    const n = norm(s);
    const c = BANK.chapters.find(c => norm(c.name) === n) || BANK.chapters.find(c => n && (norm(c.name).includes(n) || n.includes(norm(c.name))));
    return c ? c.id : null;
  };
  lines.forEach((line, i) => {
    let cols = line.split("\t");
    if (cols.length < 4) cols = line.split(/[,，]/);
    cols = cols.map(c => c.trim());
    const [chS, typeS, stem, A, B, C, D, ansS, exp] = cols;
    if (i === 0 && /章节|题干/.test(line)) return;
    const ch = findCh(chS);
    if (!ch) { errs.push(`第${i + 1}行：找不到章节“${chS || ""}”`); return; }
    if (!stem) { errs.push(`第${i + 1}行：题干为空`); return; }
    const isJudge = /判断/.test(typeS || "");
    const id = "X:" + uid() + i;
    if (isJudge) {
      const a = /^(对|√|✓|正确|T|true|是|Y)$/i.test(ansS || "") ? true : /^(错|×|✗|错误|F|false|否|N)$/i.test(ansS || "") ? false : null;
      if (a == null) { errs.push(`第${i + 1}行：判断题答案应为“对”或“错”`); return; }
      out.push({ id, ch, t: "j", d: 2, kp: "自定义", q: stem, a, e: exp || "" });
    } else {
      const opts = [A, B, C, D].filter(x => x != null && x !== "");
      const ai = LETTERS.indexOf(String(ansS || "").trim().toUpperCase());
      if (opts.length < 2 || ai < 0 || ai >= opts.length) { errs.push(`第${i + 1}行：选项或答案不完整`); return; }
      out.push({ id, ch, t: "s", d: 2, kp: "自定义", q: stem, o: opts, a: ai, e: exp || "" });
    }
  });
  return { out, errs };
}

/* ---------- 关于 ---------- */
function viewAbout() {
  const s = BANK.stats();
  let h = `<nav class="crumb"><a href="#me">我的与设置</a><span>›</span>关于</nav>`;
  h += pageHead(`关于${APP_NAME}`, "面向湖南省（娄底市）八年级学生的生物学学业水平考试（会考）离线刷题程序。");
  h += `<section class="panel prose">
    <h3>内容依据</h3>
    <ul>
      <li>知识范围：《义务教育生物学课程标准（2022年版）》与人教版《义务教育教科书·生物学》七年级上册至八年级下册（2024年版新教材）。章节名称按新教材编排，新教材已删去的“动物的运动和行为”“生物技术”等内容不再出题。</li>
      <li>试卷结构：湖南省教育考试院《湖南省初中学业水平考试试卷结构（2025年修订）》，2026年起生物学为开卷笔试，60分钟，满分100分；单项选择题25题共50分，非选择题5~7题共50分。</li>
      <li>等第划分：娄底市2025年发布的中考中招政策调整事项。生物学、地理为考查科目，卷面100分，按A/B/C/D等第作为普通高中录取的入围依据。</li>
    </ul>
    <h3>关于题目</h3>
    <p>全部题目、解析、示意图和速查手册均为原创编写，按近年湖南各地会考的常见题型、考点和设问方式命制，不是任何一年的真题，也没有照搬市面教辅。如发现错误，可在“导入自己的题目”中补充，或告诉老师。</p>
    <h3>使用建议</h3>
    <ol>
      <li>第一轮：按章节顺序练习，每章做完看一遍“开卷速查手册”。</li>
      <li>每天：做“每日一练”和到期错题，10~15分钟即可。</li>
      <li>考前一个月：每周做1~2套全真模拟，按成绩单的失分分布回到对应章节补练。</li>
      <li>考前一周：把速查手册打印出来，按课本顺序整理好，练习“查得快”。</li>
    </ol>
    <h3>题库统计</h3>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>章节</th><th class="r">单选</th><th class="r">判断</th><th class="r">非选择</th><th class="r">识图训练</th></tr></thead><tbody>
    ${BANK.chapters.map(c => { const qs = BANK.byCh[c.id].filter(q => !q.custom); const n = t => qs.filter(q => !q.auto && q.t === t).length; return `<tr><td>${esc(c.bookName.replace("年级", ""))} · ${esc(c.name)}</td><td class="r num">${n("s")}</td><td class="r num">${n("j")}</td><td class="r num">${n("c")}</td><td class="r num">${qs.filter(q => q.auto).length}</td></tr>`; }).join("")}
    <tr><th>合计</th><th class="r num">${s.s}</th><th class="r num">${s.j}</th><th class="r num">${s.c}</th><th class="r num">${s.auto}</th></tr></tbody></table></div>
    <p class="muted">版本 ${APP_VERSION}。程序完全离线运行，不联网、不收集任何信息。</p>
  </section>`;
  return { html: h, title: "关于" };
}
