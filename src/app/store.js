/* =========================================================
 * 学习记录：多学生档案、做题记录、错题间隔复习、模考记录、设置
 * 存储键：
 *   lbio:profiles          学生档案列表与当前档案
 *   lbio:p:<id>            某个学生的做题数据
 *   lbio:settings          全局设置（主题、字号、考试日期、等第线……）
 *   lbio:papers            老师组好的试卷
 *   lbio:custom            老师导入的自定义题目
 * ========================================================= */
const SRS_GAP = [0, 2, 4];      // 错题第 1、2 次复习答对后，分别隔 2、4 天再考
const SRS_MASTER = 3;           // 间隔复习连续答对 3 次 → 移出错题本（记为已掌握）

const Store = {
  profiles: null,
  data: null,
  settings: null,
  _timer: 0,

  init() {
    LS.probe();
    this.settings = Object.assign({
      theme: "auto", font: "m", autoNext: false,
      examDate: "", grade: Object.assign({}, EXAM_SPEC.gradeDefault),
      teacherName: "", school: ""
    }, LS.get("lbio:settings", {}));
    if (!this.settings.grade || typeof this.settings.grade.A !== "number") {
      this.settings.grade = Object.assign({}, EXAM_SPEC.gradeDefault);
    }
    this.profiles = LS.get("lbio:profiles", null);
    if (!this.profiles || !this.profiles.list || !this.profiles.list.length) {
      this.profiles = { list: [{ id: "p1", name: "我" }], cur: "p1" };
      LS.set("lbio:profiles", this.profiles);
    }
    if (!this.profiles.list.some(p => p.id === this.profiles.cur)) this.profiles.cur = this.profiles.list[0].id;
    this.load();
  },

  emptyData() {
    return { v: 1, prog: {}, fav: [], exams: [], seq: {}, daily: null, streak: { last: 0, n: 0 }, log: {} };
  },
  load() {
    const d = LS.get("lbio:p:" + this.profiles.cur, null);
    this.data = Object.assign(this.emptyData(), d || {});
    if (!this.data.prog) this.data.prog = {};
  },
  save(now) {
    clearTimeout(this._timer);
    const go = () => LS.set("lbio:p:" + this.profiles.cur, this.data);
    if (now) go(); else this._timer = setTimeout(go, 250);
  },
  saveSettings() { LS.set("lbio:settings", this.settings); },
  curName() { const p = this.profiles.list.find(x => x.id === this.profiles.cur); return p ? p.name : "我"; },

  /* ---- 档案管理 ---- */
  addProfile(name) {
    const id = "p" + uid();
    this.profiles.list.push({ id, name: name || "学生" + (this.profiles.list.length + 1) });
    LS.set("lbio:profiles", this.profiles);
    return id;
  },
  switchProfile(id) {
    this.save(true);
    this.profiles.cur = id;
    LS.set("lbio:profiles", this.profiles);
    this.load();
  },
  renameProfile(id, name) {
    const p = this.profiles.list.find(x => x.id === id);
    if (p && name) { p.name = name; LS.set("lbio:profiles", this.profiles); }
  },
  deleteProfile(id) {
    if (this.profiles.list.length <= 1) return false;
    this.profiles.list = this.profiles.list.filter(x => x.id !== id);
    LS.del("lbio:p:" + id);
    if (this.profiles.cur === id) { this.profiles.cur = this.profiles.list[0].id; this.load(); }
    LS.set("lbio:profiles", this.profiles);
    return true;
  },

  /* ---- 做题记录 ----
   * rec: { a 作答次数, c 答对次数, f 首次是否答对, l 最近作答日, s 连对次数,
   *        in 是否在错题本, b 复习盒子, due 下次复习日, m 已掌握, sc 非选择题得分率 } */
  rec(qid) { return this.data.prog[qid] || null; },
  answer(qid, ok, ratio) {
    const today = dayNo();
    const r = this.data.prog[qid] || (this.data.prog[qid] = { a: 0, c: 0, f: ok ? 1 : 0, s: 0 });
    r.a++;
    r.l = today;
    if (ratio != null) r.sc = Math.round(ratio * 100);
    if (ok) {
      r.c++; r.s++;
      if (r.in) {
        if (!r.due || today >= r.due) {
          r.b = (r.b || 0) + 1;
          if (r.b >= SRS_MASTER) { r.in = 0; r.m = 1; r.due = 0; }
          else r.due = today + SRS_GAP[r.b];
        }
      }
    } else {
      r.s = 0; r.in = 1; r.m = 0; r.b = 0; r.due = today + 1;
    }
    this.data.log[today] = (this.data.log[today] || 0) + 1;
    this.trimLog();
    this.save();
    return r;
  },
  trimLog() {
    const keys = Object.keys(this.data.log);
    if (keys.length > 120) {
      keys.sort((a, b) => a - b).slice(0, keys.length - 120).forEach(k => delete this.data.log[k]);
    }
  },
  markMastered(qid) {
    const r = this.data.prog[qid];
    if (r) { r.in = 0; r.m = 1; r.due = 0; this.save(); }
  },
  restoreWrong(qid) {
    const r = this.data.prog[qid];
    if (r) { r.in = 1; r.m = 0; r.b = 0; r.due = dayNo(); this.save(); }
  },
  wrongList() { return Object.keys(this.data.prog).filter(id => this.data.prog[id].in && BANK.qMap[id]); },
  masteredList() { return Object.keys(this.data.prog).filter(id => this.data.prog[id].m && BANK.qMap[id]); },
  dueList() {
    const t = dayNo();
    return this.wrongList().filter(id => (this.data.prog[id].due || 0) <= t);
  },

  /* ---- 收藏 ---- */
  isFav(qid) { return this.data.fav.includes(qid); },
  toggleFav(qid) {
    const i = this.data.fav.indexOf(qid);
    if (i >= 0) this.data.fav.splice(i, 1); else this.data.fav.push(qid);
    this.save();
    return i < 0;
  },

  /* ---- 统计 ---- */
  chapterStat(chId) {
    const qs = (BANK.byCh[chId] || []).filter(q => !q.auto);
    let done = 0, a = 0, c = 0, wrong = 0;
    for (const q of qs) {
      const r = this.data.prog[q.id];
      if (r) { done++; a += r.a; c += r.c; if (r.in) wrong++; }
    }
    return { total: qs.length, done, a, c, acc: a ? c / a : null, wrong, cover: qs.length ? done / qs.length : 0 };
  },
  overall() {
    let done = 0, a = 0, c = 0;
    const total = BANK.qs.filter(q => !q.auto).length;
    for (const id in this.data.prog) {
      if (!BANK.qMap[id] || BANK.qMap[id].auto) continue;
      const r = this.data.prog[id]; done++; a += r.a; c += r.c;
    }
    return { total, done, a, c, acc: a ? c / a : null };
  },
  kpStats(chId) {
    const m = new Map();
    for (const q of BANK.byCh[chId] || []) {
      if (q.auto) continue;
      const k = q.kp || "其他";
      if (!m.has(k)) m.set(k, { kp: k, total: 0, done: 0, a: 0, c: 0 });
      const o = m.get(k); o.total++;
      const r = this.data.prog[q.id];
      if (r) { o.done++; o.a += r.a; o.c += r.c; }
    }
    return Array.from(m.values());
  },
  /* 薄弱章节：做过一定题量且正确率低的优先；其次覆盖率低的 */
  weakChapters(n) {
    const arr = BANK.chapters.map(ch => ({ ch, st: this.chapterStat(ch.id) }));
    const scored = arr.map(x => {
      const st = x.st;
      let score;
      if (st.a >= 5) score = (st.acc || 0) * 100 - 10;           // 有足够数据：按正确率
      else score = 60 + st.cover * 40;                            // 数据不足：按覆盖率
      return Object.assign(x, { score });
    });
    return scored.sort((a, b) => a.score - b.score).slice(0, n || 3);
  },
  streakTouch() {
    const t = dayNo();
    const s = this.data.streak || (this.data.streak = { last: 0, n: 0 });
    if (s.last === t) return;
    s.n = s.last === t - 1 ? s.n + 1 : 1;
    s.last = t;
    this.save();
  },
  todayCount() { return this.data.log[dayNo()] || 0; },

  /* ---- 顺序练习进度 ---- */
  getSeq(key) { return this.data.seq[key] || 0; },
  setSeq(key, i) { this.data.seq[key] = i; this.save(); },

  /* ---- 模考记录 ---- */
  addExam(rec) {
    this.data.exams.unshift(rec);
    if (this.data.exams.length > 50) this.data.exams.length = 50;
    this.save(true);
  },

  /* ---- 等第 ---- */
  grade(score) {
    const g = this.settings.grade;
    if (score >= g.A) return "A";
    if (score >= g.B) return "B";
    if (score >= g.C) return "C";
    return "D";
  },

  /* ---- 老师：试卷、自定义题 ---- */
  papers() { return LS.get("lbio:papers", []); },
  savePapers(list) { LS.set("lbio:papers", list.slice(0, 40)); },
  customs() { return LS.get("lbio:custom", []); },
  saveCustoms(list) { LS.set("lbio:custom", list); },

  /* ---- 备份与恢复 ---- */
  exportAll() {
    const out = { app: APP_NAME, ver: APP_VERSION, at: Date.now(), profiles: this.profiles, settings: this.settings, data: {} };
    this.save(true);
    for (const p of this.profiles.list) out.data[p.id] = LS.get("lbio:p:" + p.id, null);
    out.papers = this.papers();
    out.custom = this.customs();
    return out;
  },
  importAll(obj) {
    if (!obj || obj.app !== APP_NAME || !obj.profiles || !obj.data) throw new Error("这不是本程序导出的备份数据");
    LS.set("lbio:profiles", obj.profiles);
    for (const id in obj.data) if (obj.data[id]) LS.set("lbio:p:" + id, obj.data[id]);
    if (obj.settings) LS.set("lbio:settings", obj.settings);
    if (Array.isArray(obj.papers)) LS.set("lbio:papers", obj.papers);
    if (Array.isArray(obj.custom)) LS.set("lbio:custom", obj.custom);
    this.init();
  },
  resetCurrent() {
    this.data = this.emptyData();
    this.save(true);
  }
};
