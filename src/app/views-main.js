/* =========================================================
 * 页面：外框、首页、章节练习、专项突破、做题、模考、错题本
 * 每个视图函数返回 { html, title, immersive?, after? }
 * ========================================================= */
const NAV = [
  { h: "#home", t: "首页", i: "home", tab: true },
  { h: "#practice", t: "章节练习", tt: "练习", i: "practice", tab: true },
  { h: "#special", t: "专项突破", i: "target" },
  { h: "#exam", t: "模拟考试", tt: "模考", i: "exam", tab: true },
  { h: "#wrong", t: "错题本", tt: "错题", i: "wrong", tab: true, badge: () => Store.dueList().length },
  { h: "#hb", t: "开卷速查手册", tt: "手册", i: "book", tab: true },
  { sep: true },
  { h: "#teacher", t: "老师组卷", i: "teacher" },
  { h: "#class", t: "课堂投屏", i: "screen" },
  { h: "#search", t: "搜索题目", i: "search" },
  { h: "#me", t: "我的与设置", i: "user" }
];

function shell(view, route) {
  if (view.immersive) return `<div class="immersive">${view.html}</div>`;
  const cur = "#" + route.split("/")[0];
  const active = h => cur === h || (h === "#practice" && ["#ch", "#kp"].includes(cur)) || (h === "#hb" && ["#hbc", "#tips"].includes(cur)) ||
    (h === "#exam" && cur === "#result") || (h === "#teacher" && cur === "#paper");
  const side = NAV.map(n => n.sep ? `<hr>` :
    `<a href="${n.h}" class="nav-i${active(n.h) ? " on" : ""}">${icon(n.i)}<span>${n.t}</span>${n.badge && n.badge() ? `<span class="badge">${n.badge()}</span>` : ""}</a>`).join("");
  const tabs = NAV.filter(n => n.tab).map(n =>
    `<a href="${n.h}" class="tab-i${active(n.h) ? " on" : ""}">${icon(n.i)}<span>${n.tt || n.t}</span>${n.badge && n.badge() ? `<span class="dotb"></span>` : ""}</a>`).join("");
  return `<div class="shell">
  <aside class="side no-print">
    <a class="brand" href="#home">${icon("leaf", "logo")}<span><b>${APP_NAME}</b><small>湖南八年级生物学会考</small></span></a>
    <nav class="side-nav">${side}</nav>
    <button type="button" class="side-foot" data-act="profiles">${icon("user")}<span>当前学生：${esc(Store.curName())}</span></button>
  </aside>
  <div class="main">
    <header class="topbar no-print">
      <a class="brand-m" href="#home">${icon("leaf", "logo")}<b>${APP_NAME}</b></a>
      <span class="grow"></span>
      <a class="iconbtn" href="#search" aria-label="搜索">${icon("search")}</a>
      <a class="iconbtn" href="#me" aria-label="我的与设置">${icon("user")}</a>
    </header>
    ${!LS.ok ? `<div class="banner warn no-print">当前浏览器无法保存做题记录（可能是隐私模式）。关闭页面后记录会丢失，可在“我的与设置”里导出备份。</div>` : ""}
    <main class="page" id="page">${view.html}</main>
  </div>
  <nav class="tabbar no-print">${tabs}</nav>
</div>`;
}

function pageHead(title, sub, extra) {
  return `<div class="ph"><div class="ph-t"><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div>${extra ? `<div class="ph-x">${extra}</div>` : ""}</div>`;
}
function bar(ratio, cls) {
  const w = Math.round(clamp(ratio || 0, 0, 1) * 100);
  return `<span class="bar ${cls || ""}"><i style="width:${w}%"></i></span>`;
}
function accText(acc) { return acc == null ? "—" : Math.round(acc * 100) + "%"; }
function accCls(acc) { return acc == null ? "" : acc >= 0.85 ? "good" : acc >= 0.7 ? "mid" : "low"; }

/* ---------- 首页 ---------- */
function viewHome() {
  const o = Store.overall();
  const due = Store.dueList().length;
  const wrongN = Store.wrongList().length;
  const st = Store.data.streak || { n: 0 };
  const today = Store.todayCount();
  const daily = Daily.get();
  const dailyDone = daily && daily.done;
  const exams = Store.data.exams.slice(0, 3);
  const avg = exams.length ? Math.round(sum(exams, e => e.score100) / exams.length * 10) / 10 : null;
  const resume = Persist.peek();
  let countdown = "";
  if (Store.settings.examDate) {
    const d = dayNo(Store.settings.examDate) - dayNo();
    countdown = d >= 0 ? `<div class="cd"><span class="cd-n">${d}</span><span class="cd-t">天后会考<br><small>${esc(Store.settings.examDate)}</small></span></div>`
      : `<div class="cd"><span class="cd-t">会考日期已过，可在设置里修改</span></div>`;
  } else {
    countdown = `<a class="cd set" href="#me">设置会考日期，显示倒计时 →</a>`;
  }
  const weak = Store.weakChapters(3);
  const s = BANK.stats();

  let h = "";
  if (resume) {
    const rs = resume.s;
    h += `<div class="banner info"><span>你有一组未完成的${rs.mode === "exam" ? "模拟考试" : "练习"}：${esc(rs.title)}（第 ${rs.idx + 1}/${rs.ids.length} 题）</span>
      <span class="row"><button type="button" class="btn sm primary" data-act="resume">继续</button><button type="button" class="btn sm" data-act="dropResume">放弃</button></span></div>`;
  }
  h += `<section class="hero">
    <div class="hero-main">
      <p class="eyebrow">${esc(Store.curName())} · 今日学习</p>
      <h1 class="hero-t">${dailyDone ? "今天的每日一练已完成" : "先做今天的每日一练"}</h1>
      <p class="hero-s">10 道题：到期错题优先，其余从你最薄弱的章节里挑。今天已做 <b class="num">${today}</b> 题，连续学习 <b class="num">${st.n || 0}</b> 天。</p>
      <div class="row wrap">
        <button type="button" class="btn primary lg" data-act="daily">${dailyDone ? "再来一组" : "开始每日一练"}</button>
        ${due ? `<button type="button" class="btn lg" data-act="reviewDue">复习到期错题（${due}）</button>` : ""}
      </div>
    </div>
    <div class="hero-side">${countdown}</div>
  </section>`;

  h += `<section class="kpis">
    <div class="kpi"><span class="kpi-l">已做题目</span><span class="kpi-v num">${o.done}<small> / ${o.total}</small></span>${bar(o.done / Math.max(1, o.total))}</div>
    <div class="kpi"><span class="kpi-l">总正确率</span><span class="kpi-v num ${accCls(o.acc)}">${accText(o.acc)}</span><span class="kpi-n">共作答 ${o.a} 次</span></div>
    <div class="kpi"><span class="kpi-l">错题本</span><span class="kpi-v num">${wrongN}</span><span class="kpi-n">${due ? `${due} 道今天该复习` : "暂无到期错题"}</span></div>
    <div class="kpi"><span class="kpi-l">最近模考</span><span class="kpi-v num">${avg == null ? "—" : avg}</span><span class="kpi-n">${avg == null ? `<a href="#exam">做一套全真模拟</a>` : `近 ${exams.length} 次平均 · 预估 <b class="grade-${Store.grade(avg)}">${Store.grade(avg)} 等</b>`}</span></div>
  </section>`;

  h += `<div class="cols">
  <section class="panel">
    <div class="panel-h"><h2>优先补这几章</h2><a href="#practice" class="linkbtn">全部章节</a></div>
    <ul class="weak">${weak.map(w => `<li><a href="#ch/${w.ch.id}">
      <span class="w-t"><b>${esc(w.ch.name)}</b><small>${esc(w.ch.bookName)} · ${esc(w.ch.unitName.split(" ")[0])}</small></span>
      <span class="w-s">${w.st.a >= 5 ? `正确率 <b class="${accCls(w.st.acc)}">${accText(w.st.acc)}</b>` : `已做 ${Math.round(w.st.cover * 100)}%`}</span>
      ${bar(w.st.a >= 5 ? w.st.acc : w.st.cover, w.st.a >= 5 ? accCls(w.st.acc) : "")}</a></li>`).join("")}</ul>
    <p class="hint">${o.a < 30 ? "做题越多，这里的判断越准。先把每章顺序练一遍。" : "按正确率从低到高排列，先补短板最容易提分。"}</p>
  </section>
  <section class="panel">
    <div class="panel-h"><h2>常用功能</h2></div>
    <div class="quick">
      <a href="#practice">${icon("practice")}<b>章节练习</b><small>按课本顺序刷题</small></a>
      <a href="#special">${icon("target")}<b>专项突破</b><small>识图·实验·资料分析</small></a>
      <a href="#exam">${icon("exam")}<b>全真模考</b><small>25单选+非选择题</small></a>
      <a href="#hb">${icon("book")}<b>开卷速查</b><small>可打印带进考场</small></a>
      <a href="#teacher">${icon("teacher")}<b>老师组卷</b><small>一键出卷打印</small></a>
      <a href="#class">${icon("screen")}<b>课堂投屏</b><small>大字讲题</small></a>
    </div>
  </section>
  </div>`;

  h += `<section class="note">
    <p><b>2026年起湖南生物学会考改为开卷</b>：60分钟，满分100分，单项选择题25题×2分，非选择题5~7题共50分。娄底按原始分划等第：A≥80，B 70~79，C 60~69，D&lt;60（另有按区域排名划分，取较高等第）。示范性高中一般要求生物、地理都达到B等及以上。</p>
    <p class="muted">题库共 ${s.all} 题（单选 ${s.s}、判断 ${s.j}、非选择题 ${s.c}，另含识图训练 ${s.auto} 题、示意图 ${s.fig} 幅），均为依据2022年版课程标准与人教版2024新教材原创编写。<a href="#about">说明与依据</a></p>
  </section>`;
  return { html: h, title: "首页" };
}

/* ---------- 每日一练 ---------- */
const Daily = {
  get() {
    const d = Store.data.daily;
    if (d && d.day === dayNo()) return d;
    return null;
  },
  make() {
    const today = dayNo();
    const ids = [];
    const due = shuffle(Store.dueList()).slice(0, 5);
    ids.push(...due);
    const weak = Store.weakChapters(4).map(w => w.ch.id);
    const rand = rng(newSeed());
    const pool = BANK.qs.filter(q => weak.includes(q.ch) && q.t !== "c" && !ids.includes(q.id));
    const unseen = pool.filter(q => !Store.rec(q.id));
    ids.push(...pickN(unseen.length >= 10 - ids.length ? unseen : pool, 10 - ids.length, rand).map(q => q.id));
    if (ids.length < 10) {
      const rest = BANK.qs.filter(q => q.t !== "c" && !ids.includes(q.id));
      ids.push(...pickN(rest, 10 - ids.length, rand).map(q => q.id));
    }
    Store.data.daily = { day: today, ids, done: false };
    Store.save();
    return Store.data.daily;
  }
};

/* ---------- 章节练习 ---------- */
function viewPractice() {
  let h = pageHead("章节练习", "按人教版新教材的顺序排列。条形表示做过的比例，右侧是正确率。");
  for (const b of BANK.books) {
    h += `<section class="book"><h2 class="book-h">${esc(b.name)}</h2>`;
    for (const u of b.units) {
      h += `<div class="unit"><h3 class="unit-h">${esc(u.name)}</h3><ul class="chlist">`;
      for (const c of u.chapters) {
        const st = Store.chapterStat(c.id);
        h += `<li><a href="#ch/${c.id}"><span class="c-no">${esc(c.no)}</span><span class="c-t">${esc(c.name)}<small>${st.total} 题${st.wrong ? ` · 错题 ${st.wrong}` : ""}</small></span>
          ${bar(st.cover)}<span class="c-acc ${accCls(st.acc)}">${accText(st.acc)}</span></a></li>`;
      }
      h += `</ul></div>`;
    }
    h += `</section>`;
  }
  return { html: h, title: "章节练习" };
}

function viewChapter(chId) {
  const c = BANK.chMap[chId];
  if (!c) return viewNotFound();
  const qs = BANK.byCh[chId];
  const st = Store.chapterStat(chId);
  const cnt = { s: 0, j: 0, c: 0, auto: 0 };
  qs.forEach(q => { if (q.auto) cnt.auto++; else cnt[q.t]++; });
  const seqKey = "ch:" + chId;
  const seqAt = Store.getSeq(seqKey);
  const kps = Store.kpStats(chId).filter(k => !k.kp.startsWith("识图") || true);
  let h = `<nav class="crumb"><a href="#practice">章节练习</a><span>›</span>${esc(c.bookName)}</nav>`;
  h += pageHead(`${esc(c.no)} ${esc(c.name)}`, `${esc(c.bookName)} · ${esc(c.unitName)}`,
    BANK.hb[chId] ? `<a class="btn" href="#hbc/${chId}">${icon("book")}本章速查</a>` : "");
  h += `<section class="kpis sm">
    <div class="kpi"><span class="kpi-l">题量</span><span class="kpi-v num">${st.total}</span><span class="kpi-n">单选${cnt.s} · 判断${cnt.j} · 非选择${cnt.c}${cnt.auto ? `（另有识图训练${cnt.auto}）` : ""}</span></div>
    <div class="kpi"><span class="kpi-l">已做</span><span class="kpi-v num">${Math.round(st.cover * 100)}%</span>${bar(st.cover)}</div>
    <div class="kpi"><span class="kpi-l">正确率</span><span class="kpi-v num ${accCls(st.acc)}">${accText(st.acc)}</span></div>
    <div class="kpi"><span class="kpi-l">本章错题</span><span class="kpi-v num">${st.wrong}</span></div>
  </section>`;
  h += `<section class="actions">
    <button type="button" class="act-card primary" data-act="chSeq" data-ch="${chId}"><b>${seqAt > 0 && seqAt < qs.length ? `继续顺序练习` : "顺序练习"}</b><small>${seqAt > 0 && seqAt < qs.length ? `从第 ${seqAt + 1} 题接着做` : "从第 1 题开始，记住进度"}</small></button>
    <button type="button" class="act-card" data-act="chRandom" data-ch="${chId}"><b>随机 10 题</b><small>打乱顺序抽查</small></button>
    <button type="button" class="act-card" data-act="chUnseen" data-ch="${chId}"><b>只做没做过的</b><small>还剩 ${st.total - st.done} 题</small></button>
    <button type="button" class="act-card" data-act="chWrong" data-ch="${chId}"${st.wrong ? "" : " disabled"}><b>本章错题</b><small>${st.wrong} 题</small></button>
    <button type="button" class="act-card" data-act="chCase" data-ch="${chId}"${cnt.c ? "" : " disabled"}><b>非选择题</b><small>识图·实验·资料 ${cnt.c} 题</small></button>
    <button type="button" class="act-card" data-act="chFig" data-ch="${chId}"${cnt.auto ? "" : " disabled"}><b>识图训练</b><small>${cnt.auto} 题</small></button>
  </section>`;
  if (kps.length) {
    h += `<section class="panel"><div class="panel-h"><h2>考点掌握情况</h2><span class="hint">点考点名称可单独练</span></div><ul class="kplist">`;
    for (const k of kps.sort((a, b) => b.total - a.total)) {
      const acc = k.a ? k.c / k.a : null;
      h += `<li><button type="button" data-act="kp" data-ch="${chId}" data-kp="${esc(k.kp)}"><span class="kp-t">${esc(k.kp)}</span><span class="kp-n">${k.done}/${k.total}</span>${bar(k.done / k.total)}<span class="c-acc ${accCls(acc)}">${accText(acc)}</span></button></li>`;
    }
    h += `</ul></section>`;
  }
  return { html: h, title: c.name };
}

/* ---------- 专项突破 ---------- */
function viewSpecial() {
  const cases = BANK.qs.filter(q => q.t === "c");
  const byCt = groupBy(cases, q => q.ct);
  const judges = BANK.qs.filter(q => q.t === "j");
  const tagged = t => BANK.qs.filter(q => q.tags && q.tags.includes(t) && q.t !== "c");
  let h = pageHead("专项突破", "非选择题占50分，是拉开等第的关键；识图和实验题有固定套路，专门练效果最好。");
  h += `<section class="panel"><div class="panel-h"><h2>非选择题专练</h2></div><div class="tiles">`;
  for (const ct of ["识图", "实验", "资料", "综合"]) {
    const n = (byCt.get(ct) || []).length;
    h += `<button type="button" class="tile" data-act="spCase" data-ct="${ct}"${n ? "" : " disabled"}><b>${CASE_NAME[ct]}</b><small>${n} 题</small></button>`;
  }
  h += `</div></section>`;
  h += `<section class="panel"><div class="panel-h"><h2>易错与高频</h2></div><div class="tiles">
    <button type="button" class="tile" data-act="spJudge"${judges.length ? "" : " disabled"}><b>易错判断题</b><small>${judges.length} 题 · 每次随机 20 题</small></button>
    <button type="button" class="tile" data-act="spTag" data-tag="易错"><b>易错单选题</b><small>${tagged("易错").length} 题</small></button>
    <button type="button" class="tile" data-act="spTag" data-tag="实验"><b>实验相关单选</b><small>${tagged("实验").length} 题</small></button>
    <button type="button" class="tile" data-act="spTag" data-tag="情境"><b>生活情境题</b><small>${tagged("情境").length} 题</small></button>
    <button type="button" class="tile" data-act="spMix"><b>全册随机 20 题</b><small>综合检测</small></button>
  </div></section>`;
  const figs = BANK.figList.filter(f => f.labels && f.ch && BANK.qs.some(q => q.fig === f.id));
  h += `<section class="panel"><div class="panel-h"><h2>识图训练</h2><span class="hint">每幅图的所有结构名称与功能，以及用到这幅图的大题</span></div><div class="figgrid">`;
  for (const b of BANK.books) {
    const fs = figs.filter(f => BANK.chMap[f.ch].book === b.id).sort((x, y) => BANK.chMap[x.ch].order - BANK.chMap[y.ch].order);
    if (!fs.length) continue;
    h += `<h3 class="fg-h">${esc(b.name)}</h3>`;
    for (const f of fs) {
      const n = BANK.qs.filter(q => q.fig === f.id).length;
      h += `<button type="button" class="figtile" data-act="spFig" data-fig="${esc(f.id)}"><span class="ft-img">${figSvg(f)}</span><span class="ft-t">${esc(f.title)}<small>${n} 题</small></span></button>`;
    }
  }
  h += `</div></section>`;
  return { html: h, title: "专项突破" };
}

/* ---------- 做题（练习/模考/回看/投屏共用） ---------- */
function viewRun() {
  const s = Engine.sess;
  if (!s) return { html: `<div class="empty"><p>没有进行中的练习。</p><a class="btn primary" href="#practice">去选一章练习</a></div>`, title: "练习", immersive: false };
  const qid = s.ids[s.idx];
  const q = BANK.qMap[qid];
  const A = Engine.ans(qid);
  const isExam = s.mode === "exam";
  const isClass = s.mode === "class";
  const num = s.exam ? examNum(s, s.idx) : `${s.idx + 1}.`;
  let top = `<header class="runbar no-print">
    <button type="button" class="iconbtn" data-act="quit" aria-label="退出">${icon("back")}</button>
    <div class="rb-t"><b>${esc(s.title)}</b><small>${s.idx + 1} / ${s.ids.length}${isExam ? ` · 已答 ${s.ids.length - Exam.unanswered()} 题` : ""}</small></div>
    ${isExam ? `<span class="timer" id="examTimer">${fmtDur(Exam.remain())}</span>` : ""}
    <button type="button" class="iconbtn" data-act="sheet" aria-label="答题卡">${icon("grid")}</button>
  </header>`;
  let body = `<div class="runbody${isClass ? " classroom" : ""}">`;
  if (s.exam && s.idx === 0 && isExam) body += `<p class="part-h">一、选择题（每小题${s.exam.mcqPt}分，共${s.exam.mcqN * s.exam.mcqPt}分。每小题只有一个选项符合题意）</p>`;
  if (s.exam && s.idx === s.exam.mcqN && s.ids.length > s.exam.mcqN && isExam) body += `<p class="part-h">二、非选择题（共${sum(s.ids.slice(s.exam.mcqN), id => BANK.qMap[id].p || 0)}分）</p>`;
  body += Engine.renderQ(qid, num);
  body += `</div>`;
  const answered = q.t === "c" ? q.subs.every((_, i) => A.subs[i] && A.subs[i].done) : A.done;
  const last = s.idx === s.ids.length - 1;
  let foot = `<footer class="runfoot no-print">
    <button type="button" class="btn" data-act="prev"${s.idx === 0 ? " disabled" : ""}>上一题</button>
    ${isClass ? `<button type="button" class="btn" data-act="classReveal">${A.reveal ? "隐藏答案" : "显示答案"}</button>` : ""}
    ${isExam && last ? `<button type="button" class="btn primary" data-act="submitExam">交卷</button>` :
      last && !isExam ? `<button type="button" class="btn primary" data-act="finishRun">完成</button>` :
      `<button type="button" class="btn ${answered || isExam || s.mode === "review" ? "primary" : ""}" data-act="next">${answered || isExam || s.mode === "review" || isClass ? "下一题" : "跳过"}</button>`}
  </footer>`;
  return {
    html: top + body + foot, title: s.title, immersive: true,
    after() {
      if (isExam) Exam.startTimer();
      const first = $(".runbody .fillin:not([disabled]), .runbody .openin:not([disabled])");
      if (first && s.mode === "exam") { /* 不自动聚焦，避免手机弹出键盘 */ }
    }
  };
}
function examNum(s, idx) {
  return `${idx + 1}.`;
}

/* 答题卡 */
function sheetHtml() {
  const s = Engine.sess;
  let h = `<div class="sheet">`;
  s.ids.forEach((id, i) => {
    const q = BANK.qMap[id];
    const A = s.ans[id];
    let cls = "sq";
    if (i === s.idx) cls += " cur";
    if (A) {
      if (s.mode === "exam") {
        const started = q.t === "c" ? A.subs.some(a => a && (a.sel != null || a.val)) : A.sel != null;
        if (started) cls += " done";
      } else if (q.t === "c") {
        const sc = Engine.caseScore(q, A);
        if (q.subs.every((_, k) => A.subs[k] && A.subs[k].done)) cls += sc.got >= sc.max * 0.8 ? " ok" : " bad";
        else if (A.subs.some(a => a && a.done)) cls += " done";
      } else if (A.done) cls += A.ok ? " ok" : " bad";
    }
    if (s.exam && i === s.exam.mcqN) h += `<div class="sheet-sep">非选择题</div>`;
    h += `<button type="button" class="${cls}" data-act="jump" data-i="${i}">${i + 1}</button>`;
  });
  h += `</div><div class="sheet-legend">${s.mode === "exam" ? `<span><i class="sq done"></i>已作答</span><span><i class="sq"></i>未作答</span>` : `<span><i class="sq ok"></i>答对</span><span><i class="sq bad"></i>答错</span><span><i class="sq"></i>未做</span>`}</div>`;
  if (s.mode === "exam") h += `<div class="row-end"><button type="button" class="btn primary" data-act="submitExam">交卷</button></div>`;
  return h;
}

/* 练习结束小结 */
function runSummaryHtml() {
  const s = Engine.sess;
  let done = 0, ok = 0;
  for (const id of s.ids) {
    const q = BANK.qMap[id], A = s.ans[id];
    if (!A) continue;
    if (q.t === "c") {
      if (q.subs.every((_, k) => A.subs[k] && A.subs[k].done)) { done++; const sc = Engine.caseScore(q, A); if (sc.got >= sc.max * 0.8) ok++; }
    } else if (A.done) { done++; if (A.ok) ok++; }
  }
  const wrongIds = s.ids.filter(id => { const q = BANK.qMap[id], A = s.ans[id]; if (!A) return false; if (q.t === "c") { const sc = Engine.caseScore(q, A); return q.subs.every((_, k) => A.subs[k] && A.subs[k].done) && sc.got < sc.max * 0.8; } return A.done && !A.ok; });
  return `<div class="summary"><div class="sum-big"><span class="num">${ok}</span><small>/ ${done} 题答对</small></div>
    <p>${done < s.ids.length ? `还有 ${s.ids.length - done} 题没做。` : ""}${wrongIds.length ? `做错的 ${wrongIds.length} 题已放进错题本，过一天再复习效果最好。` : done ? "全部正确，继续保持。" : ""}</p>
    <div class="row-end">${wrongIds.length ? `<button type="button" class="btn" data-act="redoWrongNow">马上重做错题</button>` : ""}<button type="button" class="btn primary" data-act="leaveRun">返回</button></div></div>`;
}

/* ---------- 交卷后自评 ---------- */
function viewGrade() {
  const s = Engine.sess;
  if (!s || s.mode !== "grading") return viewNotFound();
  const items = Exam.pendingSelf();
  let h = `<header class="runbar"><div class="rb-t"><b>主观题自评</b><small>选择题与填空已自动判分，还有 ${items.length} 处需要你对照参考答案打分</small></div></header><div class="runbody">`;
  if (!items.length) {
    h += `<div class="empty"><p>全部评完了。</p><button type="button" class="btn primary" data-act="finishExam">查看成绩</button></div></div>`;
    return { html: h, title: "自评", immersive: true };
  }
  h += `<p class="hint">评分标准：要点答全、用词准确得满分；意思对但不完整酌情给分。实际考试中，专业名词写错字也会扣分。</p>`;
  for (const it of items) {
    const { q, i, sub, a } = it;
    const num = s.ids.indexOf(q.id) + 1;
    h += `<article class="qcard"><div class="qstem"><span class="qnum">${num}.</span>（${i + 1}）${fmt(sub.q, !q.custom)} <span class="subpts">${sub.p}分</span></div>
      <div class="myans"><span>你的答案：</span>${esc(a.val || "（未作答）")}</div>
      <div class="refans"><div class="ref-h">参考答案</div><div>${it.fill ? esc((sub.a || []).join(" 或 ")) : fmt(sub.a, true)}</div></div>`;
    if (it.fill) {
      h += `<div class="selfgrade"><span>意思相同吗？</span><button type="button" class="btn sm" data-act="gradeFill" data-qid="${esc(q.id)}" data-si="${i}" data-v="1">相同，判对</button><button type="button" class="btn sm" data-act="gradeFill" data-qid="${esc(q.id)}" data-si="${i}" data-v="0">不对</button></div>`;
    } else {
      const hits = Engine.kwHit(sub, a.val || "");
      if (hits) h += `<div class="kwhits">要点：${hits.map(x => `<span class="kw ${x.hit ? "hit" : ""}">${x.hit ? "✓" : "○"} ${esc(String(x.k).split("/")[0])}</span>`).join("")}</div>`;
      h += `<div class="selfgrade"><span>给自己打分：</span>${selfOpts(sub.p).map(v => `<button type="button" class="btn sm" data-act="gradeSelf" data-qid="${esc(q.id)}" data-si="${i}" data-v="${v}">${fmtPts(v)}分</button>`).join("")}</div>`;
    }
    h += `</article>`;
  }
  h += `<div class="row-end"><button type="button" class="btn" data-act="finishExam">剩下的按0分处理，直接看成绩</button></div></div>`;
  return { html: h, title: "自评", immersive: true };
}

/* ---------- 成绩单 ---------- */
function viewResult(id) {
  const rec = Store.data.exams.find(e => e.id === id);
  if (!rec) return viewNotFound();
  const g = rec.grade;
  const chRows = Object.entries(rec.byCh).map(([ch, v]) => ({ ch: BANK.chMap[ch], ...v }))
    .filter(x => x.ch).sort((a, b) => a.ch.order - b.ch.order);
  const lost = chRows.filter(x => x.got < x.max).sort((a, b) => (b.max - b.got) - (a.max - a.got));
  const gd = Store.settings.grade;
  const toNext = g === "A" ? null : g === "B" ? gd.A - rec.score100 : g === "C" ? gd.B - rec.score100 : gd.C - rec.score100;
  let h = `<nav class="crumb"><a href="#exam">模拟考试</a><span>›</span>成绩单</nav>`;
  h += `<section class="result">
    <div class="stamp grade-${g}"><span class="st-g">${g}</span><span class="st-l">等</span></div>
    <div class="res-main">
      <p class="eyebrow">${esc(rec.title)} · ${fmtTime(rec.at)}</p>
      <div class="res-score"><span class="num">${fmtPts(rec.score100)}</span><small>分 / 100</small></div>
      <p class="res-s">选择题 <b class="num">${rec.mcq.got}</b>/${rec.mcq.max}${rec.cases.max ? `　非选择题 <b class="num">${fmtPts(rec.cases.got)}</b>/${rec.cases.max}` : ""}　用时 <b class="num">${fmtDur(rec.dur)}</b></p>
      <p class="res-s">${toNext != null ? `再提高 <b class="num">${fmtPts(Math.max(0.5, toNext))}</b> 分就能进入上一个等第。` : "已达到 A 等（原始分划分），继续保持。"}${rec.max !== 100 ? `<br><small class="muted">本卷满分 ${rec.max} 分，已按百分制折算。</small>` : ""}</p>
    </div>
  </section>`;
  h += `<div class="row wrap"><button type="button" class="btn primary" data-act="reviewExam" data-id="${rec.id}">回看全卷与解析</button>
    ${rec.wrong.length ? `<button type="button" class="btn" data-act="redoExamWrong" data-id="${rec.id}">重做本卷错题（${rec.wrong.length}）</button>` : ""}
    <button type="button" class="btn" data-act="startMock" data-kind="${rec.kind || "full"}">再来一套</button></div>`;
  if (lost.length) {
    h += `<section class="panel"><div class="panel-h"><h2>失分分布</h2><span class="hint">按失分多少排序，点章节名去专项练习</span></div><table class="tbl"><thead><tr><th>章节</th><th class="r">得分</th><th class="r">失分</th></tr></thead><tbody>`;
    for (const x of lost) h += `<tr><td><a href="#ch/${x.ch.id}">${esc(x.ch.bookName.replace("年级", ""))} · ${esc(x.ch.name)}</a></td><td class="r num">${fmtPts(x.got)}/${x.max}</td><td class="r num lost">−${fmtPts(x.max - x.got)}</td></tr>`;
    h += `</tbody></table></section>`;
  }
  return { html: h, title: "成绩单" };
}

/* ---------- 模拟考试首页 ---------- */
function viewExam() {
  const ex = Store.data.exams;
  let h = pageHead("模拟考试", "按湖南省初中学业水平考试生物学试卷结构抽题：开卷，60分钟，满分100分。");
  h += `<section class="actions two">
    <button type="button" class="act-card primary" data-act="startMock" data-kind="full"><b>全真模拟卷</b><small>25道单选（50分）+ 非选择题（50分）· 60分钟 · 交卷后给出等第</small></button>
    <button type="button" class="act-card" data-act="startMock" data-kind="mcq"><b>选择题限时练</b><small>25道单选 · 25分钟 · 练速度和准确率</small></button>
  </section>`;
  if (ex.length) {
    const last = ex.slice(0, 12).reverse();
    h += `<section class="panel"><div class="panel-h"><h2>成绩走势</h2><span class="hint">虚线为等第线（A ${Store.settings.grade.A}、B ${Store.settings.grade.B}、C ${Store.settings.grade.C}）</span></div>${trendSvg(last)}</section>`;
    h += `<section class="panel"><div class="panel-h"><h2>模考记录</h2></div><ul class="hist">`;
    for (const e of ex) {
      h += `<li><a href="#result/${e.id}"><span class="h-g grade-${e.grade}">${e.grade}</span><span class="h-t"><b>${esc(e.title)}</b><small>${fmtTime(e.at)} · 用时 ${fmtDur(e.dur)}</small></span><span class="h-s num">${fmtPts(e.score100)}</span></a></li>`;
    }
    h += `</ul></section>`;
  }
  h += `<section class="note"><h3>考试结构（2026年起执行）</h3>
    <table class="tbl"><thead><tr><th>题型</th><th>题量</th><th class="r">分值</th></tr></thead><tbody>
    <tr><td>单项选择题</td><td>25题，每题2分</td><td class="r num">50</td></tr>
    <tr><td>非选择题（识图、资料分析、实验探究等）</td><td>5~7题</td><td class="r num">50</td></tr>
    <tr><td><b>合计</b></td><td>开卷笔试，60分钟</td><td class="r num"><b>100</b></td></tr></tbody></table>
    <p class="muted">依据湖南省教育考试院《湖南省初中学业水平考试试卷结构（2025年修订）》。娄底等第：原始分A≥80、B 70~79、C 60~69、D&lt;60；另按招生区域内排名，前20%为A、20%~60%为B、60%~90%为C，两种方式取较高等第。以当年娄底市教育局文件为准，可在“我的与设置”中修改分数线。</p></section>`;
  return { html: h, title: "模拟考试" };
}

function trendSvg(list) {
  const W = 560, H = 190, x0 = 34, y0 = 160, w = 500, hgt = 140;
  const fx = i => x0 + (list.length === 1 ? w / 2 : (i * w) / (list.length - 1));
  const fy = v => y0 - (clamp(v, 0, 100) / 100) * hgt;
  const g = Store.settings.grade;
  let s = `<div class="chart-wrap"><svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="模考成绩走势">`;
  [0, 50, 100].forEach(v => { s += `<line class="grid" x1="${x0}" x2="${x0 + w}" y1="${fy(v)}" y2="${fy(v)}"/><text class="tk" x="${x0 - 6}" y="${fy(v) + 4}" text-anchor="end">${v}</text>`; });
  [["A", g.A], ["B", g.B], ["C", g.C]].forEach(([k, v]) => { s += `<line class="gl" x1="${x0}" x2="${x0 + w}" y1="${fy(v)}" y2="${fy(v)}"/><text class="gt" x="${x0 + w + 4}" y="${fy(v) + 4}">${k}</text>`; });
  const pts = list.map((e, i) => `${fx(i).toFixed(1)},${fy(e.score100).toFixed(1)}`).join(" ");
  if (list.length > 1) s += `<polygon class="area" points="${fx(0)},${y0} ${pts} ${fx(list.length - 1)},${y0}"/><polyline class="line" points="${pts}"/>`;
  list.forEach((e, i) => {
    const lastPt = i === list.length - 1;
    s += `<circle class="${lastPt ? "pt end" : "pt"}" cx="${fx(i)}" cy="${fy(e.score100)}" r="${lastPt ? 5 : 3.5}"/>`;
    if (lastPt) s += `<text class="pv" x="${fx(i)}" y="${fy(e.score100) - 10}" text-anchor="middle">${fmtPts(e.score100)}</text>`;
  });
  return s + `</svg></div>`;
}

/* ---------- 错题本 ---------- */
function viewWrong(tab) {
  tab = tab || "due";
  const due = Store.dueList(), all = Store.wrongList(), mastered = Store.masteredList(), fav = Store.data.fav.filter(id => BANK.qMap[id]);
  const tabs = [["due", `今日待复习 ${due.length}`], ["all", `全部错题 ${all.length}`], ["done", `已掌握 ${mastered.length}`], ["fav", `收藏 ${fav.length}`]];
  let h = pageHead("错题本", "做错的题自动收进来。错题要隔天再做对，连续3次答对才算真正掌握，会自动移到“已掌握”。");
  h += `<div class="seg" role="tablist">${tabs.map(([k, t]) => `<a role="tab" href="#wrong/${k}" class="${tab === k ? "on" : ""}">${t}</a>`).join("")}</div>`;
  const list = tab === "due" ? due : tab === "all" ? all : tab === "done" ? mastered : fav;
  if (tab === "due") {
    h += due.length ? `<div class="banner info"><span>今天有 ${due.length} 道错题到了复习时间。</span><button type="button" class="btn primary sm" data-act="reviewDue">开始复习</button></div>`
      : `<div class="empty"><p>今天没有到期的错题。</p>${all.length ? `<p class="muted">错题本里还有 ${all.length} 道题，按计划会在后面几天提醒你复习。想现在练也可以：</p><button type="button" class="btn" data-act="wrongAll">全部错题重做一遍</button>` : `<p class="muted">去做几道题吧，做错的题会自动收进这里。</p>`}</div>`;
  }
  if (tab === "all" && all.length) h += `<div class="row wrap"><button type="button" class="btn primary" data-act="wrongAll">全部重做（${all.length}）</button></div>`;
  if (tab === "fav" && fav.length) h += `<div class="row wrap"><button type="button" class="btn primary" data-act="favAll">练习收藏的题（${fav.length}）</button></div>`;
  if (list.length) {
    const groups = groupBy(list.map(id => BANK.qMap[id]), q => q.ch);
    const chs = Array.from(groups.keys()).sort((a, b) => BANK.chMap[a].order - BANK.chMap[b].order);
    for (const ch of chs) {
      const qs = groups.get(ch);
      h += `<section class="wgroup"><div class="wg-h"><h3>${esc(BANK.chMap[ch].bookName)} · ${esc(BANK.chMap[ch].name)} <small>${qs.length} 题</small></h3>
        ${tab !== "done" ? `<button type="button" class="linkbtn" data-act="wrongCh" data-ch="${ch}" data-tab="${tab}">练这一组</button>` : ""}</div><ul class="wlist">`;
      for (const q of qs) {
        const r = Store.rec(q.id) || {};
        const box = r.b || 0;
        h += `<li><button type="button" class="wq" data-act="openQ" data-qid="${esc(q.id)}"><span class="wq-t">${esc(stripText(q.t === "c" ? (q.title || q.m || "") : q.q)).slice(0, 70)}</span>
          <span class="wq-m">${Engine.typeLabel(q)}${tab === "all" || tab === "due" ? ` · 复习进度 <span class="boxdots">${[0, 1, 2].map(k => `<i class="${k < box ? "on" : ""}"></i>`).join("")}</span>` : ""}${r.a ? ` · 做过 ${r.a} 次，对 ${r.c} 次` : ""}</span></button>
          ${tab === "all" || tab === "due" ? `<button type="button" class="linkbtn" data-act="markMastered" data-qid="${esc(q.id)}">已掌握</button>` : tab === "done" ? `<button type="button" class="linkbtn" data-act="restoreWrong" data-qid="${esc(q.id)}">放回错题本</button>` : `<button type="button" class="linkbtn" data-act="unfav" data-qid="${esc(q.id)}">取消收藏</button>`}</li>`;
      }
      h += `</ul></section>`;
    }
  } else if (tab !== "due") {
    h += `<div class="empty"><p>${tab === "done" ? "还没有已掌握的错题。" : tab === "fav" ? "还没有收藏题目。做题时点题目右上角的 ☆ 可以收藏。" : "错题本是空的。"}</p></div>`;
  }
  return { html: h, title: "错题本" };
}
function stripText(s) { return String(s || "").replace(/<[^>]+>/g, "").replace(/\*\*|==/g, "").replace(/_{4,}/g, "____"); }

function viewNotFound() {
  return { html: `<div class="empty"><p>页面不存在。</p><a class="btn primary" href="#home">回到首页</a></div>`, title: "未找到" };
}
