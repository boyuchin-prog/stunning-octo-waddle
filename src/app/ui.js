/* =========================================================
 * 界面小部件：提示条、弹窗、确认框（不使用浏览器自带 alert/confirm）
 * ========================================================= */
const UI = {
  _toastTimer: 0,
  toast(msg, kind) {
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.className = "toast show " + (kind || "");
    el.textContent = msg;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.className = "toast " + (kind || ""); }, 2200);
  },

  _modalStack: [],
  modal(html, opts) {
    opts = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "modal-wrap" + (opts.wide ? " wide" : "") + (opts.full ? " full" : "");
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">` +
      `${opts.title ? `<div class="modal-h"><h3>${esc(opts.title)}</h3><button type="button" class="iconbtn" data-act="closeModal" aria-label="关闭">✕</button></div>` : ""}` +
      `<div class="modal-b">${html}</div></div>`;
    wrap.addEventListener("click", e => {
      if (e.target === wrap && opts.dismiss !== false) UI.closeModal();
    });
    document.body.appendChild(wrap);
    this._modalStack.push({ el: wrap, onClose: opts.onClose });
    requestAnimationFrame(() => wrap.classList.add("show"));
    const f = wrap.querySelector("[autofocus], input, textarea, button.primary");
    if (f) setTimeout(() => { try { f.focus(); } catch (e) { /* 忽略 */ } }, 30);
    return wrap;
  },
  closeModal() {
    const top = this._modalStack.pop();
    if (!top) return;
    top.el.remove();
    if (top.onClose) top.onClose();
  },
  closeAll() { while (this._modalStack.length) this.closeModal(); },

  /* 页面内确认框：cb 在点击确认后执行 */
  confirm(text, okLabel, cb, opts) {
    opts = opts || {};
    const id = "cf" + uid();
    UI._confirmCb = cb;
    UI.modal(`<p class="confirm-text">${text}</p>
      <div class="row-end"><button type="button" class="btn" data-act="closeModal">取消</button>
      <button type="button" class="btn ${opts.danger ? "danger" : "primary"}" id="${id}" data-act="confirmOk">${esc(okLabel || "确定")}</button></div>`,
      { title: opts.title || "请确认" });
  },
  _confirmCb: null,

  /* 输入框弹窗：cb(value) */
  prompt(title, label, def, cb) {
    UI._promptCb = cb;
    UI.modal(`<label class="field"><span>${esc(label)}</span><input id="promptInput" type="text" value="${esc(def || "")}" maxlength="30" autofocus></label>
      <div class="row-end"><button type="button" class="btn" data-act="closeModal">取消</button>
      <button type="button" class="btn primary" data-act="promptOk">确定</button></div>`, { title });
  },
  _promptCb: null,

  /* 复制文字：在点击事件里调用；失败时选中文字让用户手动复制 */
  copy(text, fallbackEl) {
    const done = () => UI.toast("已复制");
    const fail = () => {
      if (fallbackEl) { fallbackEl.focus(); fallbackEl.select(); }
      UI.toast("请长按或按 Ctrl+C 手动复制");
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else fail();
    } catch (e) { fail(); }
  },

  /* 下载文件（离线版可用；网页预览版会退回复制） */
  download(name, text, mime) {
    if (IS_ARTIFACT) return false;
    try {
      const blob = new Blob([text], { type: mime || "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return true;
    } catch (e) { return false; }
  },

  canPrint() { return !IS_ARTIFACT && typeof window.print === "function"; }
};
