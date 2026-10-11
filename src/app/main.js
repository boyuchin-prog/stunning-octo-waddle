/* =========================================================
 * 路由、事件分发、启动
 * ========================================================= */
let ROUTE = "home";

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function route() {
  const h = decodeURIComponent((location.hash || "#home").slice(1));
  const [name, a, b] = h.split("/");
  switch (name) {
    case "": case "home": return viewHome();
    case "practice": return viewPractice();
    case "ch": return viewChapter(a);
    case "special": return viewSpecial();
    case "run": return viewRun();
    case "grade": return viewGrade();
    case "result": return viewResult(a);
    case "exam": return viewExam();
    case "wrong": return viewWrong(a);
    case "hb": return viewHandbook();
    case "hbc": return viewHbChapter(a);
    case "tips": return viewTips();
    case "teacher": return viewTeacher();
    case "paper": return viewPaper(a);
    case "class": return viewClass();
    case "search": return viewSearch();
    case "me": return viewMe();
    case "about": return viewAbout();
    default: return viewNotFound();
  }
}

function render() {
  const h = decodeURIComponent((location.hash || "#home").slice(1));
  ROUTE = h || "home";
  if (!h.startsWith("run")) clearInterval(Exam.timer);
  let view;
  try { view = route(); }
  catch (err) {
    console.error(err);
    view = { html: `<div class="empty"><p>页面出错了：${esc(err.message)}</p><a class="btn primary" href="#home">回到首页</a></div>`, title: "出错" };
  }
  const app = $("#app");
  const keepScroll = app.dataset.route === ROUTE;
  const y = window.scrollY;
  app.innerHTML = shell(view, ROUTE);
  app.dataset.route = ROUTE;
  document.title = `${view.title ? view.title + " · " : ""}${APP_NAME}`;
  window.scrollTo(0, keepScroll ? y : 0);
  if (view.after) view.after();
}

/* 只重绘当前题目（作答时不跳动页面） */
function rerunQuestion() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

function applyTheme() {
  const st = Store.settings;
  const root = document.documentElement;
  if (st.theme === "light" || st.theme === "dark") root.setAttribute("data-theme", st.theme);
  else root.removeAttribute("data-theme");
  root.setAttribute("data-font", st.font || "m");
}

/* ---------- 开始各种练习 ---------- */
function startPractice(opts) {
  if (Engine.start(Object.assign({ mode: "instant" }, opts))) { Persist.saveSess(); go("#run"); }
}
function chQs(chId, filter) {
  return BANK.byCh[chId].filter(filter || (() => true));
}
function orderedChQs(chId) {
  /* 顺序练习：先单选判断（自动识图题放后面），再非选择题 */
  /* 识图训练题不放进顺序练习，单独在“识图训练”里做 */
  const qs = BANK.byCh[chId].filter(q => !q.auto);
  const rank = q => q.t === "c" ? 1 : 0;
  return qs.slice().sort((a, b) => rank(a) - rank(b));
}

/* ---------- 事件处理 ---------- */
const ACT = {
  closeModal() { UI.closeModal(); },
  confirmOk() { const cb = UI._confirmCb; UI._confirmCb = null; UI.closeModal(); if (cb) cb(); },
  promptOk() { const v = ($("#promptInput") || {}).value; const cb = UI._promptCb; UI._promptCb = null; UI.closeModal(); if (cb) cb((v || "").trim()); },

  /* 首页 */
  daily() {
    let d = Daily.get();
    if (!d || d.done) d = Daily.make();
    startPractice({ kind: "daily", title: "每日一练", ids: d.ids, back: "#home" });
  },
  reviewDue() {
    const ids = shuffle(Store.dueList());
    startPractice({ kind: "review", title: "复习到期错题", ids, back: "#wrong" });
  },
  resume() {
    if (Persist.resume()) go(Engine.sess.mode === "grading" ? "#grade" : "#run");
  },
  dropResume() { UI.confirm("放弃这次未完成的练习/模考？已经做过的题目记录会保留。", "放弃", () => { Persist.clearSess(); Engine.sess = null; render(); }); },

  /* 章节 */
  chSeq(el) {
    const ch = el.dataset.ch;
    const ids = orderedChQs(ch).map(q => q.id);
    let start = Store.getSeq("ch:" + ch);
    if (start >= ids.length) start = 0;
    startPractice({ kind: "seq", title: BANK.chMap[ch].name + " · 顺序练习", ids, start, seqKey: "ch:" + ch, back: "#ch/" + ch });
  },
  chRandom(el) {
    const ch = el.dataset.ch;
    const ids = pickN(chQs(ch, q => q.t !== "c"), 10).map(q => q.id);
    startPractice({ title: BANK.chMap[ch].name + " · 随机10题", ids, back: "#ch/" + ch });
  },
  chUnseen(el) {
    const ch = el.dataset.ch;
    const ids = chQs(ch, q => !q.auto && !Store.rec(q.id)).map(q => q.id);
    if (!ids.length) { UI.toast("本章题目都做过了，试试随机练习或错题"); return; }
    startPractice({ title: BANK.chMap[ch].name + " · 未做过的题", ids, back: "#ch/" + ch });
  },
  chWrong(el) {
    const ch = el.dataset.ch;
    const ids = chQs(ch, q => { const r = Store.rec(q.id); return r && r.in; }).map(q => q.id);
    startPractice({ kind: "review", title: BANK.chMap[ch].name + " · 错题", ids, back: "#ch/" + ch });
  },
  chCase(el) {
    const ch = el.dataset.ch;
    startPractice({ title: BANK.chMap[ch].name + " · 非选择题", ids: chQs(ch, q => q.t === "c").map(q => q.id), back: "#ch/" + ch });
  },
  chFig(el) {
    const ch = el.dataset.ch;
    startPractice({ title: BANK.chMap[ch].name + " · 识图训练", ids: shuffle(chQs(ch, q => q.auto)).map(q => q.id), back: "#ch/" + ch });
  },
  kp(el) {
    const ch = el.dataset.ch, kp = el.dataset.kp;
    startPractice({ title: kp, ids: chQs(ch, q => (q.kp || "其他") === kp).map(q => q.id), back: "#ch/" + ch });
  },

  /* 专项 */
  spCase(el) {
    const ct = el.dataset.ct;
    const ids = shuffle(BANK.qs.filter(q => q.t === "c" && q.ct === ct)).map(q => q.id);
    startPractice({ title: CASE_NAME[ct] + "专练", ids, back: "#special" });
  },
  spJudge() { startPractice({ title: "易错判断题", ids: pickN(BANK.qs.filter(q => q.t === "j"), 20).map(q => q.id), back: "#special" }); },
  spTag(el) {
    const t = el.dataset.tag;
    const pool = BANK.qs.filter(q => q.tags && q.tags.includes(t) && q.t !== "c");
    startPractice({ title: (t === "情境" ? "生活情境题" : t + "题"), ids: pickN(pool, 20).map(q => q.id), back: "#special" });
  },
  spMix() { startPractice({ title: "全册随机20题", ids: pickN(BANK.qs.filter(q => q.t === "s" && !q.auto), 20).map(q => q.id), back: "#special" }); },
  spFig(el) {
    const f = el.dataset.fig;
    const qs = BANK.qs.filter(q => q.fig === f);
    const ids = shuffle(qs.filter(q => q.auto)).concat(qs.filter(q => !q.auto)).map(q => q.id);
    startPractice({ title: BANK.figs[f].title, ids, back: "#special" });
  },

  /* 做题 */
  pick(el) {
    const s = Engine.sess; if (!s) return;
    const qid = s.ids[s.idx], q = BANK.qMap[qid], A = Engine.ans(qid);
    const k = Number(el.dataset.k);
    if (s.mode === "exam") { A.sel = A.sel === k ? null : k; Persist.saveSess(); rerunQuestion(); return; }
    if (s.mode !== "instant" || A.done) return;
    A.sel = k; A.ok = Engine.perm(qid, q)[k] === q.a; A.done = true;
    Engine.record(q, A);
    Persist.saveSess();
    if (A.ok && Store.settings.autoNext && s.idx < s.ids.length - 1) {
      rerunQuestion();
      setTimeout(() => { if (Engine.sess === s && s.ids[s.idx] === qid) ACT.next(); }, 650);
      return;
    }
    rerunQuestion();
  },
  judge(el) {
    const s = Engine.sess; if (!s) return;
    const qid = s.ids[s.idx], q = BANK.qMap[qid], A = Engine.ans(qid);
    const v = el.dataset.v === "1";
    if (s.mode === "exam") { A.sel = A.sel === v ? null : v; Persist.saveSess(); rerunQuestion(); return; }
    if (s.mode !== "instant" || A.done) return;
    A.sel = v; A.ok = v === q.a; A.done = true;
    Engine.record(q, A);
    Persist.saveSess();
    rerunQuestion();
  },
  subPick(el) { subAnswer(el, "s"); },
  subJudge(el) { subAnswer(el, "j"); },
  subFill(el) { subAnswer(el, "f"); },
  subOpen(el) {
    const s = Engine.sess; const qid = s.ids[s.idx]; const A = Engine.ans(qid);
    const i = Number(el.dataset.si);
    const box = $(`#open-${cssEsc(qid)}-${i}`);
    const a = A.subs[i] || (A.subs[i] = {});
    a.val = box ? box.value : "";
    a.done = true; a.sc = null;
    Persist.saveSess();
    rerunQuestion();
  },
  subSelf(el) {
    const s = Engine.sess; const qid = s.ids[s.idx]; const q = BANK.qMap[qid]; const A = Engine.ans(qid);
    const i = Number(el.dataset.si);
    const a = A.subs[i];
    a.sc = Number(el.dataset.v); a.ok = a.sc >= (q.subs[i].p || 0);
    afterSub(q, A);
  },
  subSelfReset(el) {
    const s = Engine.sess; const qid = s.ids[s.idx]; const A = Engine.ans(qid);
    const a = A.subs[Number(el.dataset.si)]; if (a) { a.sc = null; rerunQuestion(); }
  },
  subOverride(el) {
    const s = Engine.sess; const qid = s.ids[s.idx]; const q = BANK.qMap[qid]; const A = Engine.ans(qid);
    const i = Number(el.dataset.si); const a = A.subs[i];
    if (A.recorded) return;
    a.ok = true; a.sc = q.subs[i].p || 0;
    afterSub(q, A);
  },
  fav(el) {
    const on = Store.toggleFav(el.dataset.qid);
    UI.toast(on ? "已收藏" : "已取消收藏");
    if (ROUTE.startsWith("run")) rerunQuestion(); else render();
  },
  unfav(el) { Store.toggleFav(el.dataset.qid); render(); },
  next() {
    const s = Engine.sess; if (!s) return;
    commitCase();
    if (s.idx < s.ids.length - 1) {
      s.idx++;
      if (s.seqKey) Store.setSeq(s.seqKey, s.idx);
      Persist.saveSess();
      render();
    }
  },
  prev() {
    const s = Engine.sess; if (!s || s.idx === 0) return;
    commitCase();
    s.idx--; Persist.saveSess(); render();
  },
  jump(el) {
    const s = Engine.sess; UI.closeAll();
    commitCase();
    s.idx = Number(el.dataset.i);
    if (s.seqKey) Store.setSeq(s.seqKey, s.idx);
    Persist.saveSess(); render();
  },
  sheet() { UI.modal(sheetHtml(), { title: "答题卡" }); },
  quit() {
    const s = Engine.sess;
    if (!s) { go("#home"); return; }
    commitCase();
    if (s.mode === "exam") {
      UI.confirm("模考还没交卷。现在退出会保留进度，回到首页可以继续；计时不会暂停。", "先退出", () => { Persist.saveSess(); go(s.back || "#exam"); });
      return;
    }
    if (s.mode === "review" || s.mode === "class") { const b = s.back; Engine.sess = null; go(b || "#home"); return; }
    if (s.seqKey) {
      const q = BANK.qMap[s.ids[s.idx]], A = s.ans[s.ids[s.idx]];
      const done = A && (q.t === "c" ? q.subs.every((_, i) => A.subs[i] && A.subs[i].done) : A.done);
      Store.setSeq(s.seqKey, done ? s.idx + 1 : s.idx);
    }
    UI.modal(runSummaryHtml(), { title: "本次练习", onClose: null });
  },
  finishRun() {
    const s = Engine.sess;
    commitCase();
    if (s && s.seqKey) Store.setSeq(s.seqKey, s.ids.length);
    if (s && s.kind === "daily" && Store.data.daily) { Store.data.daily.done = true; Store.save(); }
    UI.modal(runSummaryHtml(), { title: "本次练习" });
  },
  leaveRun() {
    const s = Engine.sess;
    UI.closeAll();
    Persist.clearSess();
    const back = s ? s.back : "#home";
    Engine.sess = null;
    go(back || "#home");
  },
  redoWrongNow() {
    const s = Engine.sess;
    const ids = s.ids.filter(id => { const q = BANK.qMap[id], A = s.ans[id]; if (!A) return false; if (q.t === "c") { const sc = Engine.caseScore(q, A); return sc.got < sc.max * 0.8; } return A.done && !A.ok; });
    UI.closeAll();
    startPractice({ kind: "review", title: "重做错题", ids, back: s.back });
  },
  toggleNames(el) {
    const s = Engine.sess;
    const card = el.closest(".qcard");
    if (s && card) { s.names[card.dataset.qid] = !s.names[card.dataset.qid]; rerunQuestion(); return; }
    const fig = el.closest(".fig"); if (fig) { fig.classList.toggle("names"); el.textContent = fig.classList.contains("names") ? "隐藏名称" : "显示名称"; }
  },
  zoomFig(el) {
    const id = el.dataset.fig;
    const f = BANK.figs[id];
    const card = el.closest(".qcard");
    const s = Engine.sess;
    const showNames = !card ? true : !!(s && s.names[card.dataset.qid]);
    UI.modal(`<div class="zoom">${figHtml(id, { names: showNames, zoom: false, toggle: true })}</div>`, { title: f.title, wide: true });
  },
  classReveal() {
    const s = Engine.sess; const A = Engine.ans(s.ids[s.idx]); A.reveal = !A.reveal; rerunQuestion();
  },

  /* 模考 */
  startMock(el) { Exam.startMock(el.dataset.kind || "full"); },
  submitExam() {
    UI.closeAll();
    const n = Exam.unanswered();
    UI.confirm(n ? `还有 <b>${n}</b> 题没有作答，确定交卷吗？` : "全部题目都已作答，确定交卷吗？", "交卷", () => Exam.submit());
  },
  gradeSelf(el) {
    const s = Engine.sess; const A = s.ans[el.dataset.qid]; const i = Number(el.dataset.si);
    A.subs[i].sc = Number(el.dataset.v);
    Persist.saveSess();
    if (!Exam.pendingSelf().length) Exam.finish(); else render();
  },
  gradeFill(el) {
    const s = Engine.sess; const q = BANK.qMap[el.dataset.qid]; const A = s.ans[el.dataset.qid]; const i = Number(el.dataset.si);
    const a = A.subs[i];
    if (el.dataset.v === "1") { a.ok = true; a.sc = q.subs[i].p; }
    else { a.val = ""; a.sc = 0; }   // 标记为已处理
    Persist.saveSess();
    if (!Exam.pendingSelf().length) Exam.finish(); else render();
  },
  finishExam() { Exam.finish(); },
  reviewExam(el) {
    const rec = Store.data.exams.find(e => e.id === el.dataset.id);
    if (rec) Exam.reviewRecord(rec);
  },
  redoExamWrong(el) {
    const rec = Store.data.exams.find(e => e.id === el.dataset.id);
    if (rec) startPractice({ kind: "review", title: "重做模考错题", ids: rec.wrong, back: "#result/" + rec.id });
  },

  /* 错题本 */
  wrongAll() { startPractice({ kind: "review", title: "全部错题", ids: shuffle(Store.wrongList()), back: "#wrong/all" }); },
  favAll() { startPractice({ title: "收藏的题", ids: Store.data.fav.filter(id => BANK.qMap[id]), back: "#wrong/fav" }); },
  wrongCh(el) {
    const ch = el.dataset.ch, tab = el.dataset.tab;
    const src = tab === "due" ? Store.dueList() : tab === "fav" ? Store.data.fav : Store.wrongList();
    startPractice({ kind: "review", title: BANK.chMap[ch].name + " · 错题", ids: src.filter(id => BANK.qMap[id] && BANK.qMap[id].ch === ch), back: "#wrong/" + tab });
  },
  openQ(el) {
    const id = el.dataset.qid;
    startPractice({ kind: "single", title: "查看题目", ids: [id], back: location.hash || "#home" });
  },
  markMastered(el) { Store.markMastered(el.dataset.qid); UI.toast("已移到“已掌握”"); render(); },
  restoreWrong(el) { Store.restoreWrong(el.dataset.qid); UI.toast("已放回错题本"); render(); },

  /* 手册与打印 */
  printHb(el) {
    const ch = el.dataset.ch;
    if (ch === "all") {
      const html = BANK.chapters.filter(c => BANK.hb[c.id]).map(c => hbChapterHtml(c.id, true)).join("");
      doPrint(`<div class="print-area hb-all">${html}</div>`);
    } else window.print();
  },
  printPage() { window.print(); },

  /* 老师组卷 */
  tPreset(el) {
    const f = TeacherForm.init(); readTeacherForm();
    const p = el.dataset.p;
    if (p === "full") Object.assign(f, { mcqN: 25, mcqPt: 2, casePts: 50, minutes: 60, title: f.title || "八年级生物学 模拟测试卷" });
    if (p === "unit") Object.assign(f, { mcqN: 15, mcqPt: 2, casePts: 20, minutes: 40, title: "八年级生物学 单元小测" });
    if (p === "quick") Object.assign(f, { mcqN: 10, mcqPt: 2, casePts: 0, minutes: 10, title: "八年级生物学 课堂小练" });
    render();
  },
  tAll(el) { const f = TeacherForm.init(); readTeacherForm(); f.chs = el.dataset.v === "1" ? BANK.chapters.map(c => c.id) : []; render(); },
  tBook(el) {
    const f = TeacherForm.init(); readTeacherForm();
    const ids = BANK.chapters.filter(c => c.book === el.dataset.b).map(c => c.id);
    const allOn = ids.every(id => f.chs.includes(id));
    f.chs = allOn ? f.chs.filter(id => !ids.includes(id)) : uniq(f.chs.concat(ids));
    render();
  },
  tMake() {
    const f = readTeacherForm();
    if (!f.chs.length) { UI.toast("请至少选择一个章节"); return; }
    const diffMix = f.diff === "easy" ? { 1: 0.75, 2: 0.25, 3: 0.05 } : f.diff === "hard" ? { 1: 0.4, 2: 0.45, 3: 0.2 } : { 1: 0.6, 2: 0.3, 3: 0.1 };
    const m = Exam.makeMock({ chIds: f.chs, mcqN: f.mcqN, casePts: f.casePts, full: f.casePts === 50, diffMix, fresh: f.fresh });
    if (!m.mcq.length && !m.cases.length) { UI.toast("所选范围内没有足够的题目"); return; }
    const short = [];
    if (m.mcq.length < f.mcqN) short.push(`单选题只有 ${m.mcq.length} 道`);
    const cp = sum(m.cases, id => BANK.qMap[id].p);
    if (cp < f.casePts) short.push(`非选择题只凑到 ${cp} 分`);
    CUR_PAPER = { id: uid(), title: f.title || "生物学测试卷", at: Date.now(), seed: m.seed, mcq: m.mcq, cases: m.cases, mcqPt: f.mcqPt, minutes: f.minutes, chs: f.chs };
    go("#paper/" + CUR_PAPER.id);
    if (short.length) setTimeout(() => UI.toast("所选范围题目不够：" + short.join("，")), 300);
  },
  savePaper() {
    if (!CUR_PAPER) return;
    const list = Store.papers().filter(p => p.id !== CUR_PAPER.id);
    list.unshift(CUR_PAPER);
    Store.savePapers(list);
    UI.toast("试卷已保存");
    render();
  },
  delPaper(el) {
    UI.confirm("删除这套试卷？", "删除", () => { Store.savePapers(Store.papers().filter(p => p.id !== el.dataset.id)); render(); }, { danger: true });
  },
  swapQ(el) {
    const p = CUR_PAPER; if (!p) return;
    const old = BANK.qMap[el.dataset.qid];
    const inPaper = new Set(p.mcq.concat(p.cases));
    let cand = BANK.qs.filter(q => q.ch === old.ch && q.t === old.t && !q.auto && !inPaper.has(q.id) && (old.t !== "c" || q.p === old.p));
    if (!cand.length) cand = BANK.qs.filter(q => (p.chs || []).includes(q.ch) && q.t === old.t && !q.auto && !inPaper.has(q.id) && (old.t !== "c" || q.p === old.p));
    if (!cand.length) { UI.toast("没有可替换的同类题目了"); return; }
    const nq = cand[Math.floor(Math.random() * cand.length)];
    const key = old.t === "c" ? "cases" : "mcq";
    p[key] = p[key].map(id => id === old.id ? nq.id : id);
    persistPaperIfSaved();
    render();
  },
  dropQ(el) {
    const p = CUR_PAPER; if (!p) return;
    p.mcq = p.mcq.filter(id => id !== el.dataset.qid);
    p.cases = p.cases.filter(id => id !== el.dataset.qid);
    persistPaperIfSaved();
    render();
  },
  toggleKey(el) { document.body.classList.toggle("show-key", el.checked); },
  printPaper(el) {
    const mode = el.dataset.mode;
    document.body.classList.remove("print-q", "print-a");
    document.body.classList.add(mode === "a" ? "print-a" : "print-q");
    window.print();
  },
  classPaper() { const p = CUR_PAPER; if (p) startClass(p.mcq.concat(p.cases), p.title, "#paper/" + p.id, p.seed); },
  classPaperId(el) { const p = Store.papers().find(x => x.id === el.dataset.id); if (p) startClass(p.mcq.concat(p.cases), p.title, "#class", p.seed); },
  paperAsExam() {
    const p = CUR_PAPER; if (!p) return;
    const ok = Engine.start({
      kind: "exam", mode: "exam", title: p.title, ids: p.mcq.concat(p.cases), seed: p.seed, back: "#paper/" + p.id,
      exam: { kind: "paper", mcqN: p.mcq.length, mcqPt: p.mcqPt, minutes: p.minutes, deadline: Date.now() + p.minutes * 60000 }
    });
    if (ok) { Persist.saveSess(); go("#run"); }
  },

  /* 课堂投屏 */
  classStart() {
    const ch = $("#clsCh").value, type = $("#clsType").value, order = $("#clsOrder").value;
    let qs = BANK.byCh[ch].filter(q => !q.auto && (type === "all" || q.t === type));
    if (order === "rand") qs = pickN(qs, 10);
    startClass(qs.map(q => q.id), BANK.chMap[ch].name, "#class");
  },

  /* 搜索 */
  searchPractice() { if (Search.hits && Search.hits.length) startPractice({ title: `搜索：${Search.last}`, ids: Search.hits, back: "#search" }); },

  /* 档案 */
  profiles() {
    const items = Store.profiles.list.map(p => `<li class="${p.id === Store.profiles.cur ? "on" : ""}"><button type="button" class="hist-b" data-act="switchProfile" data-id="${p.id}"><span class="h-t"><b>${esc(p.name)}</b>${p.id === Store.profiles.cur ? "<small>当前</small>" : ""}</span></button></li>`).join("");
    UI.modal(`<ul class="hist">${items}</ul><div class="row-end"><button type="button" class="btn" data-act="addProfile">新建学生档案</button></div>`, { title: "切换学生" });
  },
  switchProfile(el) {
    UI.closeAll();
    Store.switchProfile(el.dataset.id);
    Engine.sess = null;
    UI.toast("已切换到 " + Store.curName());
    render();
  },
  addProfile() {
    UI.closeAll();
    UI.prompt("新建学生档案", "学生姓名", "", name => {
      if (!name) return;
      const id = Store.addProfile(name);
      Store.switchProfile(id);
      Engine.sess = null;
      UI.toast("已切换到 " + name);
      render();
    });
  },
  renameProfile(el) {
    const p = Store.profiles.list.find(x => x.id === el.dataset.id);
    UI.prompt("修改姓名", "学生姓名", p ? p.name : "", name => { if (name) { Store.renameProfile(el.dataset.id, name); render(); } });
  },
  delProfile(el) {
    const p = Store.profiles.list.find(x => x.id === el.dataset.id);
    UI.confirm(`删除“${esc(p.name)}”的档案和全部做题记录？此操作不能撤销。`, "删除", () => { Store.deleteProfile(el.dataset.id); render(); }, { danger: true });
  },

  /* 设置 */
  gradeReset() { Store.settings.grade = Object.assign({}, EXAM_SPEC.gradeDefault); Store.saveSettings(); render(); UI.toast("已恢复默认分数线"); },

  /* 备份 */
  backupFile() {
    const data = JSON.stringify(Store.exportAll());
    const name = `${APP_NAME}-备份-${dayStr(dayNo())}.json`;
    if (UI.download(name, data)) UI.toast("备份文件已下载");
    else ACT.backupCode();
  },
  backupCode() {
    const data = JSON.stringify(Store.exportAll());
    UI.modal(`<p class="muted">把下面整段文字复制下来，保存到微信收藏或记事本。恢复时粘贴回来即可。</p><textarea id="backupText" rows="6" readonly>${esc(data)}</textarea>
      <div class="row-end"><button type="button" class="btn primary" data-act="copyBackup">复制</button></div>`, { title: "备份码" });
  },
  copyBackup() { const t = $("#backupText"); UI.copy(t.value, t); },
  restoreCode() {
    UI.modal(`<p class="muted">粘贴之前复制的备份码。恢复会覆盖这台设备上同名档案的记录。</p><textarea id="restoreText" rows="6"></textarea>
      <div class="row-end"><button type="button" class="btn" data-act="closeModal">取消</button><button type="button" class="btn primary" data-act="restoreDo">恢复</button></div>`, { title: "恢复备份" });
  },
  restoreDo() {
    try {
      const obj = JSON.parse($("#restoreText").value);
      Store.importAll(obj); reloadCustom(); UI.closeAll(); applyTheme(); render(); UI.toast("已恢复");
    } catch (e) { UI.toast("恢复失败：" + (e.message || "内容不完整")); }
  },
  resetData() {
    UI.confirm(`清空“${esc(Store.curName())}”的全部做题记录、错题本和模考成绩？建议先导出备份。`, "清空", () => { Store.resetCurrent(); Persist.clearSess(); render(); UI.toast("已清空"); }, { danger: true });
  },

  /* 导入题目 */
  importQs() {
    const { out, errs } = parseImport(($("#importText") || {}).value);
    if (!out.length) { UI.toast(errs[0] || "没有识别到题目"); return; }
    const list = Store.customs().concat(out);
    Store.saveCustoms(list);
    reloadCustom();
    UI.modal(`<p>成功导入 <b>${out.length}</b> 题。</p>${errs.length ? `<p class="muted">有 ${errs.length} 行没有导入：</p><ul class="errs">${errs.slice(0, 20).map(e => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}<div class="row-end"><button type="button" class="btn primary" data-act="closeModal">好的</button></div>`, { title: "导入结果" });
    render();
  },
  exportCustom() {
    const lines = Store.customs().map(q => [BANK.chMap[q.ch].name, q.t === "j" ? "判断" : "单选", q.q].concat(q.t === "s" ? [0, 1, 2, 3].map(i => q.o[i] || "") : ["", "", "", ""], [q.t === "j" ? (q.a ? "对" : "错") : LETTERS[q.a], q.e || ""]).join("\t"));
    UI.modal(`<textarea id="exportText" rows="8" readonly>${esc(lines.join("\n"))}</textarea><div class="row-end"><button type="button" class="btn primary" data-act="copyExport">复制</button></div>`, { title: "自定义题目" });
  },
  copyExport() { const t = $("#exportText"); UI.copy(t.value, t); },
  clearCustom() { UI.confirm("删除全部导入的自定义题目？", "删除", () => { Store.saveCustoms([]); reloadCustom(); render(); }, { danger: true }); }
};

function cssEsc(s) { return String(s).replace(/[^a-zA-Z0-9_-]/g, ch => "\\" + ch.charCodeAt(0).toString(16) + " "); }

function subAnswer(el, kind) {
  const s = Engine.sess; if (!s) return;
  const qid = s.ids[s.idx], q = BANK.qMap[qid], A = Engine.ans(qid);
  const i = Number(el.dataset.si), sub = q.subs[i];
  const a = A.subs[i] || (A.subs[i] = {});
  if (s.mode === "exam") {
    if (kind === "s") { const k = Number(el.dataset.k); a.sel = a.sel === k ? null : k; }
    if (kind === "j") { const v = el.dataset.v === "1"; a.sel = a.sel === v ? null : v; }
    Persist.saveSess(); rerunQuestion(); return;
  }
  if (s.mode !== "instant" || a.done) return;
  if (kind === "s") { const k = Number(el.dataset.k); a.sel = k; a.ok = Engine.perm(`${qid}#${i}`, sub)[k] === sub.a; }
  if (kind === "j") { const v = el.dataset.v === "1"; a.sel = v; a.ok = v === sub.a; }
  if (kind === "f") {
    const box = $(`#fill-${cssEsc(qid)}-${i}`);
    a.val = box ? box.value : "";
    if (!a.val.trim()) { UI.toast("先填写答案再确定"); return; }
    a.ok = Engine.checkFill(sub, a.val);
  }
  a.sc = a.ok ? (sub.p || 0) : 0;
  a.done = true;
  afterSub(q, A);
}

function afterSub(q, A) {
  /* 非选择题在离开本题时才计入学习记录（commitCase），方便先改判再提交 */
  Persist.saveSess();
  rerunQuestion();
}

function commitCase() {
  const s = Engine.sess;
  if (!s || s.mode !== "instant") return;
  const qid = s.ids[s.idx], q = BANK.qMap[qid];
  if (!q || q.t !== "c") return;
  const A = s.ans[qid];
  if (!A || A.recorded) return;
  if (q.subs.every((_, k) => A.subs[k] && A.subs[k].done && A.subs[k].sc != null)) Engine.record(q, A);
}

function persistPaperIfSaved() {
  const list = Store.papers();
  const i = list.findIndex(x => x.id === CUR_PAPER.id);
  if (i >= 0) { list[i] = CUR_PAPER; Store.savePapers(list); }
}

function readTeacherForm() {
  const f = TeacherForm.init();
  const v = id => { const el = $("#" + id); return el ? el.value : null; };
  if ($("#tTitle")) {
    f.title = v("tTitle");
    f.mcqN = clamp(parseInt(v("tMcqN"), 10) || 0, 0, 60);
    f.mcqPt = clamp(parseInt(v("tMcqPt"), 10) || 2, 1, 5);
    f.casePts = clamp(parseInt(v("tCasePts"), 10) || 0, 0, 80);
    f.minutes = clamp(parseInt(v("tMin"), 10) || 60, 5, 120);
    f.diff = v("tDiff") || "std";
    f.fresh = !!($("#tFresh") || {}).checked;
    f.chs = $$(".tch").filter(x => x.checked).map(x => x.value);
  }
  return f;
}

function startClass(ids, title, back, seed) {
  if (Engine.start({ kind: "class", mode: "class", title: "投屏 · " + title, ids, back, seed })) {
    go("#run");
    try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) { /* 由按键 F 触发全屏 */ } } catch (e) { /* 忽略 */ }
  }
}

function doPrint(html) {
  const holder = document.createElement("div");
  holder.id = "printHolder";
  holder.innerHTML = html;
  document.body.appendChild(holder);
  document.body.classList.add("printing-holder");
  const cleanup = () => { document.body.classList.remove("printing-holder"); holder.remove(); window.removeEventListener("afterprint", cleanup); };
  window.addEventListener("afterprint", cleanup);
  window.print();
  setTimeout(() => { if (document.getElementById("printHolder")) cleanup(); }, 60000);
}

function reloadCustom() {
  BANK.removeCustom();
  BANK.addCustom(Store.customs());
}

/* ---------- 启动 ---------- */
function boot() {
  Store.init();
  BANK.buildFigureDrills();
  reloadCustom();
  applyTheme();

  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    if (el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "file")) return;
    const fn = ACT[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener("change", e => {
    const el = e.target;
    if (el.id === "restoreFile" && el.files && el.files[0]) {
      const r = new FileReader();
      r.onload = () => {
        try { Store.importAll(JSON.parse(r.result)); reloadCustom(); applyTheme(); render(); UI.toast("已恢复"); }
        catch (err) { UI.toast("恢复失败：" + (err.message || "文件不正确")); }
      };
      r.readAsText(el.files[0]);
      return;
    }
    if (el.dataset.act === "toggleKey") { ACT.toggleKey(el); return; }
    if (el.dataset.set) {
      const k = el.dataset.set;
      Store.settings[k] = el.type === "checkbox" ? el.checked : el.value;
      Store.saveSettings();
      if (k === "theme" || k === "font") applyTheme();
      UI.toast("已保存");
      return;
    }
    if (el.dataset.grade) {
      const g = Store.settings.grade;
      g[el.dataset.grade] = clamp(parseInt(el.value, 10) || 0, 1, 100);
      if (!(g.A > g.B && g.B > g.C)) { UI.toast("分数线需满足 A > B > C"); Object.assign(g, EXAM_SPEC.gradeDefault); render(); }
      Store.saveSettings();
      UI.toast("已保存");
    }
  });
  document.addEventListener("input", e => {
    const el = e.target;
    if (el.id === "searchInput") {
      clearTimeout(Search.timer);
      Search.timer = setTimeout(() => Search.run(el.value), 180);
      return;
    }
    /* 模考中填空、简答随打随存 */
    if ((el.classList.contains("fillin") || el.classList.contains("openin")) && Engine.sess && Engine.sess.mode === "exam") {
      const s = Engine.sess; const qid = s.ids[s.idx]; const A = Engine.ans(qid);
      const i = Number(el.dataset.si); const a = A.subs[i] || (A.subs[i] = {});
      a.val = el.value;
      clearTimeout(Persist._t); Persist._t = setTimeout(() => Persist.saveSess(), 400);
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && UI._modalStack.length) { UI.closeModal(); return; }
    if (e.key === "Enter" && e.target.id === "promptInput") { ACT.promptOk(); return; }
    if (e.key === "Enter" && e.target.classList && e.target.classList.contains("fillin") && Engine.sess && Engine.sess.mode === "instant") {
      subAnswer({ dataset: { si: e.target.dataset.si } }, "f"); return;
    }
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || UI._modalStack.length) return;
    if (!ROUTE.startsWith("run") || !Engine.sess) return;
    const s = Engine.sess;
    if (e.key === "ArrowRight") { ACT.next(); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { ACT.prev(); e.preventDefault(); }
    else if (s.mode === "class" && (e.key === " " || e.key === "Enter")) { ACT.classReveal(); e.preventDefault(); }
    else if (s.mode === "class" && (e.key === "f" || e.key === "F")) {
      try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (err) { /* 忽略 */ }
    } else if (/^[1-4a-dA-D]$/.test(e.key)) {
      const k = /\d/.test(e.key) ? Number(e.key) - 1 : "abcd".indexOf(e.key.toLowerCase());
      const btn = $(`.runbody .qcard > .opts [data-act="pick"][data-k="${k}"]`);
      if (btn && !btn.disabled) ACT.pick(btn);
    } else if (e.key === "Enter") {
      const q = BANK.qMap[s.ids[s.idx]], A = s.ans[s.ids[s.idx]];
      if (A && A.done && q.t !== "c") ACT.next();
    }
  });
  window.addEventListener("hashchange", render);
  window.addEventListener("afterprint", () => document.body.classList.remove("print-q", "print-a"));
  if (BANK.errors.length) console.warn("题库数据问题：", BANK.errors);
  render();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
