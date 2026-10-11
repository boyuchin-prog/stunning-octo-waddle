/* =========================================================
 * 做题引擎：会话管理、题目渲染、判分
 * 会话模式：
 *   instant  练习：选完立即判对错并给解析
 *   exam     模考：作答时不显示对错，交卷后统一判分
 *   review   回看：显示自己的答案、正确答案与解析
 *   class    课堂投屏：大字号，一键显示答案
 * ========================================================= */
const Engine = {
  sess: null,

  /* opts: { kind, title, ids, mode, seqKey, start, back, exam } */
  start(opts) {
    const ids = opts.ids.filter(id => BANK.qMap[id]);
    if (!ids.length) { UI.toast("这里暂时没有可做的题目"); return false; }
    this.sess = {
      id: uid(), kind: opts.kind || "practice", title: opts.title || "练习",
      ids, idx: clamp(opts.start || 0, 0, ids.length - 1), mode: opts.mode || "instant",
      seed: opts.seed || newSeed(), perm: {}, ans: {}, seqKey: opts.seqKey || "",
      back: opts.back || "#practice", startedAt: Date.now(), exam: opts.exam || null,
      names: {}, reveal: {}
    };
    Store.streakTouch();
    return true;
  },

  q() { return BANK.qMap[this.sess.ids[this.sess.idx]]; },

  /* ---------- 选项顺序 ---------- */
  perm(key, q) {
    const s = this.sess;
    if (s && s.perm[key]) return s.perm[key];
    const n = q.o.length;
    let order;
    const r = rng(((s ? s.seed : 7) ^ hashStr(key)) >>> 0);
    if (q.pool) {
      const others = shuffle(Array.from({ length: n }, (_, i) => i).filter(i => i !== q.a), r).slice(0, 3);
      order = shuffle([q.a].concat(others), r);
    } else if (!q.ns) {
      order = shuffle(Array.from({ length: n }, (_, i) => i), r);
    } else {
      order = Array.from({ length: n }, (_, i) => i);
    }
    if (s) s.perm[key] = order;
    return order;
  },

  ans(qid) {
    const s = this.sess;
    return s.ans[qid] || (s.ans[qid] = { sel: null, ok: null, subs: [], done: false });
  },

  /* ---------- 判分 ---------- */
  checkFill(sub, val) {
    const raw = String(val || "").trim();
    if (!raw) return false;
    const stripNum = t => t.replace(/^[\[［【(（]?\s*([①-⑳]|\d{1,2})\s*[\]］】)）]?/, "");
    const cands = [norm(raw), norm(stripNum(raw))];
    const accepts = (sub.a || []).map(String);
    if (sub.set) {
      const parts = x => norm(x.replace(/[、，,和及与+\s]+/g, "|")).split("|").filter(Boolean).sort().join("|");
      const mine = norm(raw.replace(/[、，,和及与+\s]+/g, "|")).split("|").filter(Boolean).sort().join("|");
      return accepts.some(a => parts(a) === mine);
    }
    return accepts.some(a => {
      const na = norm(a);
      if (cands.includes(na)) return true;
      /* 只要求填序号时，接受 ③ 或 3 */
      const ci = CIRCLED.indexOf(a.trim());
      if (ci >= 0 && (cands.includes(String(ci + 1)) || cands.includes(norm(CIRCLED[ci])))) return true;
      return false;
    });
  },
  kwHit(sub, val) {
    if (!sub.kw || !sub.kw.length) return null;
    const v = norm(val);
    return sub.kw.map(k => ({ k, hit: String(k).split("/").some(x => v.includes(norm(x))) }));
  },

  /* 非选择题得分（已判的小题合计） */
  caseScore(q, A) {
    let got = 0, max = 0, pending = 0;
    q.subs.forEach((sub, i) => {
      max += sub.p || 0;
      const a = A.subs[i];
      if (!a || a.sc == null) pending++;
      else got += a.sc;
    });
    return { got, max, pending };
  },

  /* 记录一道题的结果到学习档案 */
  record(q, A) {
    if (A.recorded) return;
    if (q.t === "c") {
      const { got, max } = this.caseScore(q, A);
      const ratio = max ? got / max : 0;
      Store.answer(q.id, ratio >= 0.8, ratio);
    } else {
      Store.answer(q.id, !!A.ok);
    }
    A.recorded = true;
  },

  /* ---------- 渲染 ---------- */
  metaLine(q) {
    const ch = BANK.chOf(q);
    if (!ch) return "";
    return `<div class="ana-m"><span>考点：${esc(q.kp || "—")}</span><span>教材：${esc(ch.bookName)} ${esc(ch.unitName)} ${esc(ch.no)} ${esc(ch.name)}</span></div>`;
  },
  diffStars(d) {
    d = d || 1;
    return `<span class="qdiff" title="难度">${"●".repeat(d)}<span class="dim">${"●".repeat(3 - d)}</span></span>`;
  },
  typeLabel(q) {
    if (q.t === "c") return CASE_NAME[q.ct] || "非选择题";
    if (q.auto) return "识图训练";
    return TYPE_NAME[q.t] || "题目";
  },

  /* 渲染当前题（或指定题）。num 为题号文字 */
  renderQ(qid, num, opts) {
    opts = opts || {};
    const q = BANK.qMap[qid];
    if (!q) return `<div class="qcard"><p>题目不存在（可能已被删除）。</p></div>`;
    const s = this.sess;
    const mode = s ? s.mode : "instant";
    const A = this.ans(qid);
    const trusted = !q.custom;
    const fav = Store.isFav(qid);
    let h = `<article class="qcard mode-${mode}" data-qid="${esc(qid)}">`;
    h += `<header class="qhead"><span class="qtype t-${q.t}${q.ct ? " ct-" + q.ct : ""}">${this.typeLabel(q)}</span>${this.diffStars(q.d)}` +
      `${q.t === "c" ? `<span class="qpts">${q.p} 分</span>` : ""}` +
      `<span class="qch">${esc(BANK.chOf(q) ? BANK.chOf(q).name : "")}</span>` +
      `${q.custom ? `<span class="tag">自定义</span>` : ""}` +
      `<button type="button" class="iconbtn fav${fav ? " on" : ""}" data-act="fav" data-qid="${esc(qid)}" aria-label="${fav ? "取消收藏" : "收藏"}" title="${fav ? "取消收藏" : "收藏"}">${fav ? "★" : "☆"}</button></header>`;
    if (q.t === "c") h += this.renderCase(q, A, num, mode, trusted);
    else h += this.renderChoice(q, A, num, mode, trusted);
    h += `</article>`;
    return h;
  },

  showAnswer(mode, A) {
    return mode === "review" || (mode === "instant" && A.done) || (mode === "class" && A.reveal);
  },

  renderChoice(q, A, num, mode, trusted) {
    const showAns = this.showAnswer(mode, A);
    let h = `<div class="qstem">${num ? `<span class="qnum">${num}</span>` : ""}${fmt(q.q, trusted)}</div>`;
    const sess = this.sess;
    if (q.fig) h += figHtml(q.fig, { names: showAns && sess && sess.names[q.id], toggle: showAns });
    if (q.t === "s") {
      const order = this.perm(q.id, q);
      h += `<ol class="opts">`;
      order.forEach((oi, k) => {
        let cls = "opt";
        if (A.sel === k) cls += " sel";
        if (showAns) {
          if (oi === q.a) cls += " right";
          else if (A.sel === k) cls += " wrong";
        }
        const dis = showAns || mode === "review" ? " disabled" : "";
        h += `<li><button type="button" class="${cls}" data-act="pick" data-k="${k}"${dis}><span class="ol">${LETTERS[k]}</span><span class="ot">${fmt(q.o[oi], trusted)}</span>` +
          `${showAns && oi === q.a ? `<span class="mk ok" aria-label="正确答案">✓</span>` : ""}${showAns && A.sel === k && oi !== q.a ? `<span class="mk bad" aria-label="你的选择">✗</span>` : ""}</button></li>`;
      });
      h += `</ol>`;
    } else if (q.t === "j") {
      h += `<div class="opts judge">`;
      [[true, "正确", "√"], [false, "错误", "×"]].forEach(([v, label, sym]) => {
        let cls = "opt";
        if (A.sel === v) cls += " sel";
        if (showAns) {
          if (v === q.a) cls += " right";
          else if (A.sel === v) cls += " wrong";
        }
        const dis = showAns || mode === "review" ? " disabled" : "";
        h += `<button type="button" class="${cls}" data-act="judge" data-v="${v ? 1 : 0}"${dis}><span class="ol">${sym}</span><span class="ot">${label}</span></button>`;
      });
      h += `</div>`;
    }
    if (showAns) h += this.feedback(q, A, mode);
    return h;
  },

  feedback(q, A, mode) {
    let fb = "";
    if (A.sel != null) {
      fb = A.ok ? `<div class="fb ok"><span class="fb-i">✓</span>回答正确</div>`
        : `<div class="fb bad"><span class="fb-i">✗</span>回答错误，正确答案是 ${this.rightLetter(q)}</div>`;
    } else if (mode === "review" || mode === "class") {
      fb = `<div class="fb neutral">${mode === "review" ? "未作答，" : ""}正确答案是 ${this.rightLetter(q)}</div>`;
    }
    return fb + this.analysis(q);
  },
  rightLetter(q) {
    if (q.t === "j") return q.a ? "“正确”" : "“错误”";
    const order = this.perm(q.id, q);
    return LETTERS[order.indexOf(q.a)];
  },
  analysis(q) {
    return `<div class="ana"><div class="ana-h">解析</div><div class="ana-b">${fmt(q.e || "（暂无解析）", !q.custom)}</div>${this.metaLine(q)}</div>`;
  },

  renderCase(q, A, num, mode, trusted) {
    const sess = this.sess;
    let h = `<div class="qstem case-title">${num ? `<span class="qnum">${num}</span>` : ""}${q.title ? `<b>${fmt(q.title, trusted)}</b>` : ""}</div>`;
    if (q.m) h += `<div class="material">${fmt(q.m, trusted)}</div>`;
    const anyShown = mode === "review" || q.subs.some((_, i) => A.subs[i] && A.subs[i].done) || (mode === "class" && A.reveal);
    if (q.fig) h += figHtml(q.fig, { names: sess && sess.names[q.id], toggle: anyShown });
    h += `<ol class="subs">`;
    q.subs.forEach((sub, i) => { h += this.renderSub(q, sub, i, A, mode, trusted); });
    h += `</ol>`;
    const sc = this.caseScore(q, A);
    const allDone = q.subs.every((_, i) => A.subs[i] && A.subs[i].done);
    if (mode === "instant" && allDone) {
      h += `<div class="fb ${sc.got >= sc.max * 0.8 ? "ok" : "bad"}"><span class="fb-i">${sc.got >= sc.max * 0.8 ? "✓" : "✗"}</span>本题得分 ${fmtPts(sc.got)} / ${sc.max}</div>`;
      if (q.e) h += this.analysis(q);
      else h += `<div class="ana">${this.metaLine(q)}</div>`;
    } else if (mode === "review") {
      h += `<div class="fb neutral">本题得分 ${fmtPts(sc.got)} / ${sc.max}</div>`;
      if (q.e) h += this.analysis(q); else h += `<div class="ana">${this.metaLine(q)}</div>`;
    } else if (mode === "class" && A.reveal && q.e) {
      h += this.analysis(q);
    }
    return h;
  },

  renderSub(q, sub, i, A, mode, trusted) {
    const a = A.subs[i] || {};
    const key = `${q.id}#${i}`;
    const showAns = mode === "review" || (mode === "instant" && a.done) || (mode === "class" && A.reveal);
    let h = `<li class="sub" data-si="${i}"><div class="sub-q"><span class="subno">（${i + 1}）</span>${fmt(sub.q, trusted)}<span class="subpts">${sub.p || 0}分</span></div>`;
    if (sub.t === "s") {
      const order = this.perm(key, sub);
      h += `<ol class="opts sm">`;
      order.forEach((oi, k) => {
        let cls = "opt";
        if (a.sel === k) cls += " sel";
        if (showAns) {
          if (oi === sub.a) cls += " right";
          else if (a.sel === k) cls += " wrong";
        }
        h += `<li><button type="button" class="${cls}" data-act="subPick" data-si="${i}" data-k="${k}"${showAns ? " disabled" : ""}><span class="ol">${LETTERS[k]}</span><span class="ot">${fmt(sub.o[oi], trusted)}</span></button></li>`;
      });
      h += `</ol>`;
    } else if (sub.t === "j") {
      h += `<div class="opts judge sm">`;
      [[true, "正确", "√"], [false, "错误", "×"]].forEach(([v, label, sym]) => {
        let cls = "opt";
        if (a.sel === v) cls += " sel";
        if (showAns) { if (v === sub.a) cls += " right"; else if (a.sel === v) cls += " wrong"; }
        h += `<button type="button" class="${cls}" data-act="subJudge" data-si="${i}" data-v="${v ? 1 : 0}"${showAns ? " disabled" : ""}><span class="ol">${sym}</span><span class="ot">${label}</span></button>`;
      });
      h += `</div>`;
    } else if (sub.t === "f") {
      const val = a.val != null ? a.val : "";
      h += `<div class="fillrow"><input type="text" class="fillin" id="fill-${esc(q.id)}-${i}" data-si="${i}" value="${esc(val)}" placeholder="在此填写答案" autocomplete="off"${showAns ? " disabled" : ""}>` +
        `${!showAns && mode === "instant" ? `<button type="button" class="btn sm" data-act="subFill" data-si="${i}">确定</button>` : ""}</div>`;
    } else if (sub.t === "o") {
      const val = a.val != null ? a.val : "";
      h += `<textarea class="openin" id="open-${esc(q.id)}-${i}" data-si="${i}" rows="2" placeholder="写下你的答案（可只写要点）"${showAns ? " disabled" : ""}>${esc(val)}</textarea>`;
      if (!showAns && mode === "instant") h += `<div class="row-end"><button type="button" class="btn sm" data-act="subOpen" data-si="${i}">看参考答案并自评</button></div>`;
    }
    if (showAns) h += this.subFeedback(q, sub, a, i, mode, A);
    h += `</li>`;
    return h;
  },

  subFeedback(q, sub, a, i, mode, A) {
    let h = "";
    const pts = sub.p || 0;
    if (sub.t === "s" || sub.t === "j") {
      const right = sub.t === "j" ? (sub.a ? "“正确”" : "“错误”") : LETTERS[this.perm(`${q.id}#${i}`, sub).indexOf(sub.a)];
      h += a.sel == null ? `<div class="sfb neutral">正确答案：${right}</div>`
        : a.ok ? `<div class="sfb ok">✓ 正确（+${fmtPts(a.sc)}分）</div>` : `<div class="sfb bad">✗ 错误，正确答案：${right}</div>`;
    } else if (sub.t === "f") {
      const ref = (sub.a || [])[0] || "";
      if (a.ok) h += `<div class="sfb ok">✓ 正确（+${fmtPts(a.sc)}分）　参考答案：${esc(ref)}</div>`;
      else {
        h += `<div class="sfb bad">${a.val ? "✗ 与参考答案不一致" : "未作答"}　参考答案：<b>${esc(ref)}</b></div>`;
        if (a.val && mode === "instant" && !(A && A.recorded)) h += `<div class="row-end"><button type="button" class="linkbtn" data-act="subOverride" data-si="${i}">我的意思一样，判为正确</button></div>`;
      }
    } else if (sub.t === "o") {
      h += `<div class="refans"><div class="ref-h">参考答案</div><div>${fmt(sub.a, true)}</div></div>`;
      const hits = this.kwHit(sub, a.val || "");
      if (hits && a.val) {
        h += `<div class="kwhits">要点：${hits.map(x => `<span class="kw ${x.hit ? "hit" : ""}">${x.hit ? "✓" : "○"} ${esc(String(x.k).split("/")[0])}</span>`).join("")}</div>`;
      }
      if (mode === "instant") {
        if (a.sc == null) {
          h += `<div class="selfgrade"><span>对照参考答案，给自己打分：</span>` + selfOpts(pts).map(v =>
            `<button type="button" class="btn sm" data-act="subSelf" data-si="${i}" data-v="${v}">${fmtPts(v)}分</button>`).join("") + `</div>`;
        } else {
          h += `<div class="sfb ${a.sc >= pts ? "ok" : a.sc > 0 ? "part" : "bad"}">自评得分：${fmtPts(a.sc)} / ${pts}${A && A.recorded ? "" : `　<button type="button" class="linkbtn" data-act="subSelfReset" data-si="${i}">重新自评</button>`}</div>`;
        }
      } else if (mode === "review" && a.sc != null) {
        h += `<div class="sfb ${a.sc >= pts ? "ok" : a.sc > 0 ? "part" : "bad"}">得分：${fmtPts(a.sc)} / ${pts}</div>`;
      }
    }
    if (sub.e) h += `<div class="sub-ana">${fmt(sub.e, true)}</div>`;
    return h;
  }
};

function fmtPts(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }
function selfOpts(p) {
  if (p <= 1) return [0, p];
  if (p === 2) return [0, 1, 2];
  return uniq([0, Math.round(p / 3), Math.round((p * 2) / 3), p]);
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
