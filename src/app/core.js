/* =========================================================
 * 核心：工具函数、题库注册表、本地存储封装
 * 构建时所有脚本按顺序拼接到一个 IIFE 中，共享作用域。
 * ========================================================= */
"use strict";

const APP_NAME = "生物会考冲A";
const APP_VERSION = "1.0.0";
const IS_ARTIFACT = !!window.__ARTIFACT__;

/* ---------- 通用工具 ---------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* 题库文本的轻量标记：
 *   **加点字**  ==荧光笔==  ____ 填空线  \n 换行
 * trusted=true 时允许题库作者写少量 HTML（表格等）；导入的题目一律先转义。 */
function fmt(s, trusted) {
  let t = String(s == null ? "" : s);
  if (!trusted) t = esc(t);
  t = t.replace(/\*\*(.+?)\*\*/g, '<b class="em">$1</b>')
       .replace(/==(.+?)==/g, '<mark class="hl">$1</mark>')
       .replace(/_{4,}/g, '<span class="blank"></span>')
       .replace(/\n/g, "<br>");
  return t;
}

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
function circ(n) {
  const i = Number(n);
  if (Number.isInteger(i) && i >= 1 && i <= 20) return CIRCLED[i - 1];
  return String(n);
}
const LETTERS = "ABCDEFGH";

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
function sum(arr, f) { let s = 0; for (const x of arr) s += f ? f(x) : x; return s; }
function uniq(arr) { return Array.from(new Set(arr)); }
function groupBy(arr, f) {
  const m = new Map();
  for (const x of arr) { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return m;
}

/* 可复现的随机数（同一份试卷/会话打乱顺序保持一致） */
function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function newSeed() { return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0; }
function shuffle(arr, rand) {
  const a = arr.slice(); const r = rand || Math.random;
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function pickN(arr, n, rand) { return shuffle(arr, rand).slice(0, n); }

/* 以本地日期计的“天数编号”，用于错题间隔复习 */
function dayNo(d) {
  const x = d ? new Date(d) : new Date();
  return Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 86400000);
}
function dayStr(n) {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function fmtTime(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* 文本归一化：用于填空题判分与搜索 */
function norm(s) {
  return String(s == null ? "" : s)
    .replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[\s　]+/g, "")
    .replace(/[，。、；：！？“”‘’（）()\[\]【】《》<>,.;:!?'"·…—\-_/]/g, "")
    .toLowerCase();
}

/* ---------- 本地存储（任何异常都退回内存，不影响使用） ---------- */
const LS = {
  ok: true,
  mem: Object.create(null),
  probe() {
    try {
      const k = "__lbio_probe__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      this.ok = true;
    } catch (e) { this.ok = false; }
    return this.ok;
  },
  get(k, def) {
    if (this.ok) {
      try {
        const v = localStorage.getItem(k);
        if (v != null) return JSON.parse(v);
      } catch (e) { /* 读失败时退回内存 */ }
    }
    return k in this.mem ? this.mem[k] : def;
  },
  set(k, v) {
    this.mem[k] = v;
    if (!this.ok) return false;
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { this.ok = false; return false; }
  },
  del(k) {
    delete this.mem[k];
    try { localStorage.removeItem(k); } catch (e) { /* 忽略 */ }
  },
  keys(prefix) {
    const out = new Set(Object.keys(this.mem).filter(k => k.startsWith(prefix)));
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) out.add(k);
      }
    } catch (e) { /* 忽略 */ }
    return Array.from(out);
  }
};

/* ---------- 题库注册表 ----------
 * 数据文件通过 BANK.setBooks / BANK.add / BANK.fig / BANK.handbook 注册内容。 */
const TYPE_NAME = { s: "单选题", j: "判断题", c: "非选择题" };
const CASE_NAME = { 识图: "识图作答", 实验: "实验探究", 资料: "资料分析", 综合: "综合应用" };

const BANK = {
  books: [], units: [], chapters: [],
  chMap: Object.create(null),
  qs: [], qMap: Object.create(null), byCh: Object.create(null),
  figs: Object.create(null), figList: [],
  hb: Object.create(null),
  tips: [],
  errors: [],

  setBooks(books) {
    this.books = books;
    let order = 0;
    for (const b of books) {
      for (const u of b.units) {
        u.book = b.id;
        this.units.push(u);
        for (const c of u.chapters) {
          c.book = b.id; c.bookName = b.name; c.unit = u.id; c.unitName = u.name;
          c.order = order++;
          c.full = `${u.name} ${c.no} ${c.name}`;
          c.short = `${b.short}·${c.name}`;
          this.chapters.push(c);
          this.chMap[c.id] = c;
          this.byCh[c.id] = [];
        }
      }
    }
  },

  add(chId, list) {
    if (!this.chMap[chId]) { this.errors.push(`未知章节 ${chId}`); return; }
    for (const q of list) {
      q.ch = chId;
      if (this.qMap[q.id]) { this.errors.push(`题号重复 ${q.id}`); continue; }
      if (q.t === "c") {
        q.p = sum(q.subs, s => s.p || 0);
      }
      this.qs.push(q);
      this.qMap[q.id] = q;
      this.byCh[chId].push(q);
    }
  },

  fig(id, def) {
    def.id = id;
    this.figs[id] = def;
    this.figList.push(def);
  },

  handbook(chId, def) { this.hb[chId] = def; },

  /* 自动生成识图训练题：每个标注结构一道“名称”题，有功能说明的再加一道“功能”题 */
  buildFigureDrills() {
    for (const f of this.figList) {
      if (!f.labels || f.drill === false || !f.ch || !this.chMap[f.ch]) continue;
      const labs = f.labels.filter(l => l.name);
      if (labs.length < 4) continue;
      for (const L of labs) {
        const others = labs.filter(x => x !== L && x.name !== L.name);
        const base = { ch: f.ch, d: 1, fig: f.id, kp: f.kp || f.title, tags: ["识图"], auto: true };
        const optsA = [L.name].concat(others.slice(0, 12).map(x => x.name));
        const qa = Object.assign({}, base, {
          id: `F:${f.id}:${L.n}:a`, t: "s",
          q: `识图：图中${circ(L.n)}所示的结构名称是`,
          o: uniq(optsA), a: 0, pool: true,
          e: `${circ(L.n)}是${L.name}${L.fn ? "，" + L.fn : ""}。`
        });
        this._addDrill(qa);
        if (L.fn) {
          const withFn = others.filter(x => x.fn !== L.fn);
          const qb = Object.assign({}, base, {
            id: `F:${f.id}:${L.n}:b`, t: "s", d: 2,
            q: `识图：图中具有“${L.fn}”作用的结构是`,
            o: [`${circ(L.n)} ${L.name}`].concat(withFn.map(x => `${circ(x.n)} ${x.name}`)),
            a: 0, pool: true,
            e: `${L.fn}的是${circ(L.n)}${L.name}。`
          });
          this._addDrill(qb);
        }
      }
    }
  },
  _addDrill(q) {
    if (this.qMap[q.id]) return;
    this.qs.push(q); this.qMap[q.id] = q; this.byCh[q.ch].push(q);
  },

  /* 加入导入的自定义题目（老师自己录入） */
  addCustom(list) {
    for (const q of list) {
      if (this.qMap[q.id] || !this.chMap[q.ch]) continue;
      q.custom = true;
      if (q.t === "c") q.p = sum(q.subs, s => s.p || 0);
      this.qs.push(q); this.qMap[q.id] = q; this.byCh[q.ch].push(q);
    }
  },
  removeCustom() {
    this.qs = this.qs.filter(q => !q.custom);
    for (const k of Object.keys(this.qMap)) if (this.qMap[k].custom) delete this.qMap[k];
    for (const c of Object.keys(this.byCh)) this.byCh[c] = this.byCh[c].filter(q => !q.custom);
  },

  chOf(q) { return this.chMap[q.ch]; },
  bookOf(chId) { return this.books.find(b => b.id === this.chMap[chId].book); },
  stats() {
    const s = { all: 0, s: 0, j: 0, c: 0, fig: 0, auto: 0 };
    for (const q of this.qs) {
      if (q.custom) continue;
      s.all++;
      if (q.auto) s.auto++; else s[q.t]++;
    }
    s.fig = this.figList.length;
    return s;
  }
};
