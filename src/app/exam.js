/* =========================================================
 * 组卷与模考：按湖南省试卷结构（25道单选×2分 + 非选择题50分，60分钟）抽题
 * 老师组卷也复用这里的选题逻辑。
 * ========================================================= */
const CASE_ORDER = { 识图: 0, 资料: 1, 实验: 2, 综合: 3 };

function permFor(seed, key, q) {
  const n = q.o.length;
  const r = rng((seed ^ hashStr(key)) >>> 0);
  if (q.pool) {
    const others = shuffle(Array.from({ length: n }, (_, i) => i).filter(i => i !== q.a), r).slice(0, 3);
    return shuffle([q.a].concat(others), r);
  }
  if (q.ns) return Array.from({ length: n }, (_, i) => i);
  return shuffle(Array.from({ length: n }, (_, i) => i), r);
}

const Exam = {
  /* 题目“新鲜度”：没做过的优先，做错过的其次 */
  freshness(q) {
    const r = Store.rec(q.id);
    if (!r) return 1;
    if (r.in) return 0.6;
    return Math.max(0, 0.4 - r.a * 0.1);
  },

  /* 均衡抽取 n 道：同一章不扎堆，难度大致 6:3:1 */
  pickBalanced(pool, n, rand, opts) {
    opts = opts || {};
    if (n <= 0 || !pool.length) return [];
    const diffMix = opts.diffMix || { 1: 0.6, 2: 0.3, 3: 0.1 };
    const scored = pool.map(q => ({ q, s: rand() + (opts.fresh !== false ? this.freshness(q) * 0.8 : 0) }))
      .sort((a, b) => b.s - a.s).map(x => x.q);
    const chs = uniq(pool.map(q => q.ch));
    const chCap = Math.max(1, Math.ceil(n / chs.length) + 1);
    const dCap = { 1: Math.ceil(n * diffMix[1]) + 1, 2: Math.ceil(n * diffMix[2]) + 1, 3: Math.ceil(n * diffMix[3]) + 1 };
    const out = [], chCount = {}, dCount = {}, used = new Set();
    const tryPass = (useCh, useD) => {
      for (const q of scored) {
        if (out.length >= n) break;
        if (used.has(q.id)) continue;
        const d = q.d || 1;
        if (useCh && (chCount[q.ch] || 0) >= chCap) continue;
        if (useD && (dCount[d] || 0) >= dCap[d]) continue;
        out.push(q); used.add(q.id);
        chCount[q.ch] = (chCount[q.ch] || 0) + 1;
        dCount[d] = (dCount[d] || 0) + 1;
      }
    };
    tryPass(true, true);
    if (out.length < n) tryPass(true, false);
    if (out.length < n) tryPass(false, false);
    return out;
  },

  mcqPool(chIds, opts) {
    const set = new Set(chIds);
    return BANK.qs.filter(q => q.t === "s" && set.has(q.ch) && !q.auto && (!opts || opts.custom !== false || !q.custom));
  },
  casePool(chIds) {
    const set = new Set(chIds);
    return BANK.qs.filter(q => q.t === "c" && set.has(q.ch));
  },

  /* 按册分配题量（全册范围时按考试比例，否则按题量比例） */
  pickMcq(chIds, n, rand, opts) {
    const pool = this.mcqPool(chIds, opts);
    if (!pool.length) return [];
    const books = groupBy(pool, q => BANK.chMap[q.ch].book);
    const allBooks = books.size === 4 && chIds.length === BANK.chapters.length;
    const quota = {};
    if (allBooks && n === EXAM_SPEC.mcqCount) Object.assign(quota, EXAM_SPEC.bookQuota);
    else {
      const total = pool.length;
      let assigned = 0;
      const entries = Array.from(books.entries());
      entries.forEach(([b, arr], i) => {
        const k = i === entries.length - 1 ? n - assigned : Math.round((arr.length / total) * n);
        quota[b] = Math.max(0, k); assigned += quota[b];
      });
    }
    let out = [];
    for (const [b, arr] of books) out = out.concat(this.pickBalanced(arr, Math.min(arr.length, quota[b] || 0), rand, opts));
    if (out.length < n) {
      const used = new Set(out.map(q => q.id));
      out = out.concat(this.pickBalanced(pool.filter(q => !used.has(q.id)), n - out.length, rand, opts));
    }
    return out.slice(0, n);
  },

  /* 非选择题凑满目标分值，尽量覆盖 识图/实验/资料 三类 */
  pickCases(chIds, target, rand, opts) {
    opts = opts || {};
    const pool = this.casePool(chIds);
    if (!pool.length || target <= 0) return [];
    const minN = opts.minN || 1, maxN = opts.maxN || 99;
    let best = null, bestGap = Infinity;
    for (let attempt = 0; attempt < 400; attempt++) {
      const sh = shuffle(pool.map(q => ({ q, s: rand() + this.freshness(q) * 0.6 })).sort((a, b) => b.s - a.s).map(x => x.q), rand);
      const picked = [], seenCt = new Set();
      let tot = 0;
      for (const ct of ["识图", "实验", "资料"]) {
        const c = sh.find(q => q.ct === ct && !picked.includes(q) && tot + q.p <= target);
        if (c) { picked.push(c); seenCt.add(ct); tot += c.p; }
      }
      for (const q of sh) {
        if (tot >= target || picked.length >= maxN) break;
        if (picked.includes(q)) continue;
        if (tot + q.p <= target) { picked.push(q); tot += q.p; }
      }
      const gap = target - tot;
      if (gap === 0 && picked.length >= minN && picked.length <= maxN) { best = picked; break; }
      if (gap >= 0 && gap < bestGap) { bestGap = gap; best = picked; }
    }
    return best || [];
  },

  sortByBook(list) {
    return list.slice().sort((a, b) => (BANK.chMap[a.ch].order - BANK.chMap[b.ch].order) || (a.d || 1) - (b.d || 1));
  },

  /* 生成一套完整模拟卷 */
  makeMock(opts) {
    opts = opts || {};
    const seed = opts.seed || newSeed();
    const rand = rng(seed);
    const chIds = opts.chIds || BANK.chapters.map(c => c.id);
    const mcqN = opts.mcqN != null ? opts.mcqN : EXAM_SPEC.mcqCount;
    const casePts = opts.casePts != null ? opts.casePts : EXAM_SPEC.casePoints;
    const mcq = this.sortByBook(this.pickMcq(chIds, mcqN, rand, opts));
    const cases = this.sortByBook(this.pickCases(chIds, casePts, rand,
      opts.full ? { minN: EXAM_SPEC.caseCountMin, maxN: EXAM_SPEC.caseCountMax } : {}));
    return { seed, mcq: mcq.map(q => q.id), cases: cases.map(q => q.id) };
  },

  /* ---------- 模考流程 ---------- */
  timer: 0,
  startMock(kind) {
    const full = kind !== "mcq";
    const m = this.makeMock({ full, mcqN: EXAM_SPEC.mcqCount, casePts: full ? EXAM_SPEC.casePoints : 0 });
    if (m.mcq.length < 5) { UI.toast("题库中的选择题不足，暂时无法组卷"); return; }
    const minutes = full ? EXAM_SPEC.minutes : 25;
    const ok = Engine.start({
      kind: "exam", mode: "exam", title: full ? "全真模拟（60分钟）" : "选择题限时练（25分钟）",
      ids: m.mcq.concat(m.cases), seed: m.seed, back: "#exam",
      exam: { kind, mcqN: m.mcq.length, mcqPt: EXAM_SPEC.mcqPoint, minutes, deadline: Date.now() + minutes * 60000 }
    });
    if (ok) { Persist.saveSess(); go("#run"); }
  },

  remain() {
    const s = Engine.sess;
    if (!s || !s.exam) return 0;
    return Math.max(0, Math.round((s.exam.deadline - Date.now()) / 1000));
  },
  tick() {
    const el = $("#examTimer");
    if (!el || !Engine.sess || Engine.sess.mode !== "exam") return;
    const r = this.remain();
    el.textContent = fmtDur(r);
    el.classList.toggle("warn", r <= 600);
    if (r <= 0) { clearInterval(this.timer); UI.toast("时间到，已自动交卷"); this.submit(true); }
  },
  startTimer() {
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 1000);
    this.tick();
  },

  unanswered() {
    const s = Engine.sess;
    let n = 0;
    for (const id of s.ids) {
      const q = BANK.qMap[id], A = s.ans[id];
      if (q.t === "c") {
        if (!A || q.subs.some((sub, i) => { const a = A.subs[i]; return !a || (a.sel == null && !a.val); })) n++;
      } else if (!A || A.sel == null) n++;
    }
    return n;
  },

  /* 交卷：客观题自动判分；主观小题进入自评 */
  submit(force) {
    const s = Engine.sess;
    if (!s || s.mode !== "exam") return;
    clearInterval(this.timer);
    s.exam.usedSec = Math.round((Math.min(Date.now(), s.exam.deadline) - s.startedAt) / 1000);
    for (const id of s.ids) {
      const q = BANK.qMap[id];
      const A = Engine.ans(id);
      if (q.t === "s") {
        const order = Engine.perm(id, q);
        A.ok = A.sel != null && order[A.sel] === q.a;
        A.done = true;
      } else if (q.t === "j") {
        A.ok = A.sel === q.a; A.done = true;
      } else if (q.t === "c") {
        q.subs.forEach((sub, i) => {
          const a = A.subs[i] || (A.subs[i] = {});
          a.done = true;
          if (sub.t === "s") {
            const order = Engine.perm(`${id}#${i}`, sub);
            a.ok = a.sel != null && order[a.sel] === sub.a; a.sc = a.ok ? sub.p : 0;
          } else if (sub.t === "j") {
            a.ok = a.sel === sub.a; a.sc = a.ok ? sub.p : 0;
          } else if (sub.t === "f") {
            a.ok = Engine.checkFill(sub, a.val); a.sc = a.ok ? sub.p : 0;
          } else if (sub.t === "o") {
            if (!a.val || !String(a.val).trim()) { a.sc = 0; a.ok = false; }
            else a.sc = null;   // 待自评
          }
        });
        A.done = true;
      }
    }
    s.mode = "grading";
    Persist.saveSess();
    if (this.pendingSelf().length) go("#grade");
    else this.finish();
  },

  pendingSelf() {
    const s = Engine.sess;
    const out = [];
    if (!s) return out;
    for (const id of s.ids) {
      const q = BANK.qMap[id];
      if (q.t !== "c") continue;
      const A = s.ans[id];
      q.subs.forEach((sub, i) => {
        const a = A && A.subs[i];
        if (sub.t === "o" && a && a.sc == null) out.push({ q, i, sub, a });
        else if (sub.t === "f" && a && !a.ok && a.val && String(a.val).trim()) out.push({ q, i, sub, a, fill: true });
      });
    }
    return out;
  },

  finish() {
    const s = Engine.sess;
    if (!s) return;
    let mcqGot = 0, mcqMax = 0, caseGot = 0, caseMax = 0;
    const byCh = {}, wrong = [];
    for (const id of s.ids) {
      const q = BANK.qMap[id];
      const A = Engine.ans(id);
      let got, max;
      if (q.t === "c") {
        q.subs.forEach((sub, i) => { const a = A.subs[i]; if (a && a.sc == null) a.sc = 0; });
        const cs = Engine.caseScore(q, A);
        got = cs.got; max = cs.max; caseGot += got; caseMax += max;
        if (got < max * 0.8) wrong.push(id);
      } else {
        max = s.exam.mcqPt; got = A.ok ? max : 0; mcqGot += got; mcqMax += max;
        if (!A.ok) wrong.push(id);
      }
      const b = byCh[q.ch] || (byCh[q.ch] = { got: 0, max: 0 });
      b.got += got; b.max += max;
      Engine.record(q, A);
    }
    const total = mcqGot + caseGot;
    const maxAll = mcqMax + caseMax;
    const score100 = maxAll ? Math.round((total / maxAll) * 1000) / 10 : 0;
    const rec = {
      id: s.id, at: Date.now(), kind: s.exam.kind, title: s.title, dur: s.exam.usedSec,
      score: total, max: maxAll, score100, grade: Store.grade(score100),
      mcq: { got: mcqGot, max: mcqMax }, cases: { got: caseGot, max: caseMax },
      byCh, wrong, ids: s.ids, ans: s.ans, perm: s.perm, seed: s.seed
    };
    Store.addExam(rec);
    s.mode = "review";
    s.resultId = rec.id;
    Persist.clearSess();
    go("#result/" + rec.id);
  },

  reviewRecord(rec, startId) {
    Engine.sess = {
      id: rec.id, kind: "exam", title: rec.title + " · 回看", ids: rec.ids, idx: Math.max(0, startId ? rec.ids.indexOf(startId) : 0),
      mode: "review", seed: rec.seed, perm: rec.perm || {}, ans: rec.ans || {}, back: "#result/" + rec.id,
      startedAt: rec.at, exam: { mcqN: rec.ids.filter(id => BANK.qMap[id] && BANK.qMap[id].t !== "c").length }, names: {}, reveal: {}
    };
    go("#run");
  }
};

/* 进行中的练习/模考保存在本机，刷新或切到后台再回来都能继续 */
const Persist = {
  key() { return "lbio:sess:" + Store.profiles.cur; },
  saveSess() {
    const s = Engine.sess;
    if (!s || s.mode === "review" || s.mode === "class") return;
    LS.set(this.key(), { at: Date.now(), s });
  },
  clearSess() { LS.del(this.key()); },
  peek() {
    const v = LS.get(this.key(), null);
    if (!v || !v.s || Date.now() - v.at > 3 * 86400000) return null;
    if (!v.s.ids || !v.s.ids.some(id => BANK.qMap[id])) return null;
    return v;
  },
  resume() {
    const v = this.peek();
    if (!v) return false;
    Engine.sess = v.s;
    Engine.sess.names = Engine.sess.names || {};
    Engine.sess.reveal = Engine.sess.reveal || {};
    return true;
  }
};
