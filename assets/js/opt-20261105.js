/* opt-20261105.js - C-OPT-JS@1 */
(function () {
  'use strict';
  var DIALOG_IDS = ['caseModal', 'faqModal', 'miniModal', 'pricing'],
      PRICING_ID = 'pricing',
      PRICING_LINK = 'a[href="#pricing"]',
      EXTERNAL_LINK = 'a[target="_blank"]',
      FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      BLOCKED_IDS = ['consultShell', 'pwaUpdate', 'pwaInstall', 'consultFab'],
      states = [],
      inertOwned = [],
      boundLinks = typeof WeakSet === 'function' ? new WeakSet() : null,
      boundLinksList = [],
      extObserver = null,
      hashDone = false,
      clicked = null,
      tracked = false;
  function byId(id) { return document.getElementById(id); }
  function safe(fn) { try { fn(); } catch (e) {} }
  function openPricingTarget() { var b = byId('openPricing'); if (b && typeof b.click === 'function') b.click(); }
  function onPricingLinkClick(e) { if (e && typeof e.preventDefault === 'function') e.preventDefault(); openPricingTarget(); }
  function isBound(a) { return boundLinks ? boundLinks.has(a) : boundLinksList.indexOf(a) !== -1; }
  function bindPricingLinks() {
    var links = document.querySelectorAll(PRICING_LINK);
    for (var i = 0; i < links.length; i++) {
      if (isBound(links[i])) continue;
      if (boundLinks) boundLinks.add(links[i]); else boundLinksList.push(links[i]);
      links[i].addEventListener('click', onPricingLinkClick, false);
    }
  }
  function openFromHash() {
    if (hashDone) return;
    if (window.location && window.location.hash === '#pricing') {
      hashDone = true;
      openPricingTarget();
    }
  }
  function inAriaHidden(el) {
    var n = el;
    while (n && n.nodeType === 1) {
      if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') return true;
      n = n.parentElement;
    }
    return false;
  }
  function isFocusable(el) {
    if (!el || typeof el.focus !== 'function') return false;
    if (el.offsetParent === null) return false;
    if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) return false;
    return !inAriaHidden(el);
  }
  function focusableOf(c) {
    var nodes = c.querySelectorAll(FOCUSABLE), out = [];
    for (var i = 0; i < nodes.length; i++) if (isFocusable(nodes[i])) out.push(nodes[i]);
    return out;
  }
  function trapFor(st) {
    return function (e) {
      if (!e || e.key !== 'Tab') return;
      var c = st.el;
      if (!c.classList || !c.classList.contains('open')) return;
      var items;
      try { items = focusableOf(c); } catch (err) { return; }
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1], active = document.activeElement;
      var inside = !!(c.contains && c.contains(active));
      if (e.shiftKey) {
        if (!inside || active === first) { if (e.preventDefault) e.preventDefault(); last.focus(); }
      } else if (!inside || active === last) { if (e.preventDefault) e.preventDefault(); first.focus(); }
    };
  }
  function activate(st) {
    if (st.active) { syncInert(); return; }
    st.active = true;
    st.trigger = pick();
    st.handler = trapFor(st);
    document.addEventListener('keydown', st.handler, true);
    syncInert();
  }
  function deactivate(st) {
    if (!st.active) return;
    st.active = false;
    if (st.handler) document.removeEventListener('keydown', st.handler, true);
    st.handler = null;
    syncInert();
    comp(st);
    st.trigger = null;
  }
  function syncDialog(st) { if (st.el.classList && st.el.classList.contains('open')) activate(st); else deactivate(st); }
  function findState(el) { for (var i = 0; i < states.length; i++) if (states[i].el === el) return states[i]; return null; }
  function observeState(st) {
    if (typeof MutationObserver !== 'function') return;
    try {
      st.observer = new MutationObserver(function () { syncDialog(st); });
      st.observer.observe(st.el, { attributes: true, attributeFilter: ['class'] });
    } catch (e) { st.observer = null; }
  }
  function scanDialogs() {
    for (var i = 0; i < DIALOG_IDS.length; i++) {
      var el = byId(DIALOG_IDS[i]);
      if (!el || findState(el)) continue;
      var st = { el: el, active: false, handler: null, observer: null };
      states.push(st);
      observeState(st);
      syncDialog(st);
    }
  }
  function ind(el) { for (var i = 0; i < states.length; i++) if (states[i].el.contains(el)) return true; return false; }
  function inrt(el) { for (var n = el; n && n.hasAttribute; n = n.parentElement) if (n.hasAttribute('inert')) return true; return false; }
  function pick() { if (clicked && clicked.isConnected && !ind(clicked)) return clicked; var a = document.activeElement; return a && a !== document.body && a.isConnected && !ind(a) ? a : null; }
  function comp(st) {
    var t = st.trigger, a = document.activeElement;
    if (!t || !t.isConnected || inrt(t) || t.disabled || (t.getClientRects && !t.getClientRects().length) || (a && a !== document.body && a.isConnected && !ind(a))) return;
    try { t.focus({ preventScroll: true }); } catch (e) { try { t.focus(); } catch (e2) {} }
  }
  function onClick(e) { var t = e && e.target; if (!t) return; var c = t.closest && t.closest('button, a[href], [tabindex]:not([tabindex="-1"])'); clicked = c || t; setTimeout(function () { clicked = null; }, 0); }
  function startTrk() { if (tracked) return; tracked = true; document.addEventListener('click', onClick, true); }
  function isBlocked(el) { return !!(el && el.id && BLOCKED_IDS.indexOf(el.id) !== -1); }
  function pushTarget(list, el, c) {
    if (!el || el === c || isBlocked(el)) return;
    if (el.contains && el.contains(c)) return;
    if (list.indexOf(el) === -1) list.push(el);
  }
  function targetsOf(c) {
    var list = [], i, p;
    if (c.id === PRICING_ID) {
      pushTarget(list, byId('siteNav'), c);
      p = c.parentElement;
      if (p && p.children) for (i = 0; i < p.children.length; i++) pushTarget(list, p.children[i], c);
    } else {
      pushTarget(list, document.querySelector('main'), c);
      pushTarget(list, byId('siteNav'), c);
    }
    return list;
  }
  function syncInert() {
    var wanted = [], i, j, el, owned, t;
    for (i = 0; i < states.length; i++) {
      if (!states[i].active) continue;
      t = targetsOf(states[i].el);
      for (j = 0; j < t.length; j++) if (wanted.indexOf(t[j]) === -1) wanted.push(t[j]);
    }
    for (i = inertOwned.length - 1; i >= 0; i--) {
      owned = inertOwned[i];
      if (wanted.indexOf(owned) === -1) {
        if (owned.removeAttribute) owned.removeAttribute('inert');
        inertOwned.splice(i, 1);
      }
    }
    for (i = 0; i < wanted.length; i++) {
      el = wanted[i];
      if (inertOwned.indexOf(el) !== -1 || !el.setAttribute || !el.getAttribute) continue;
      if (el.getAttribute('inert') !== null) continue;
      el.setAttribute('inert', '');
      inertOwned.push(el);
    }
  }
  function ensureRel(a) {
    if (!a || !a.getAttribute || !a.setAttribute) return;
    var raw = a.getAttribute('rel') || '', tokens = raw.split(/\s+/), i;
    for (i = 0; i < tokens.length; i++) if (tokens[i] === 'noopener') return;
    var next = raw.replace(/\s+/g, ' ').replace(/^ | $/g, '');
    a.setAttribute('rel', next ? next + ' noopener' : 'noopener');
  }
  function ensureExternalLinks(root) {
    var scope = root || document;
    if (!scope.querySelectorAll) return;
    var links = scope.querySelectorAll(EXTERNAL_LINK);
    for (var i = 0; i < links.length; i++) ensureRel(links[i]);
  }
  function scanAdded(n) {
    if (!n || n.nodeType !== 1) return;
    if (n.matches && n.matches(EXTERNAL_LINK)) ensureRel(n);
    ensureExternalLinks(n);
  }
  function startExtObserver() {
    if (extObserver || typeof MutationObserver !== 'function' || !document.body) return;
    try {
      extObserver = new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var added = list[i].addedNodes || [];
          for (var j = 0; j < added.length; j++) scanAdded(added[j]);
        }
      });
      extObserver.observe(document.body, { childList: true, subtree: true });
    } catch (e) { extObserver = null; }
  }
  /* U1 移动端 reveal 兜底（任务 id=39）：真机 IO 不触发时基线 .reveal
     停在 opacity:0；2s 时视口内仍有隐藏即整块强制可见，滚动补扫视口内。 */
  var revealCls = 'opt-reveal-fallback',
      revealMarked = window.WeakSet ? new WeakSet() : null,
      revealList = [],
      revealArmed = false,
      revealTick = 0;
  function markReveal(el) {
    if (revealMarked ? revealMarked.has(el) : revealList.indexOf(el) >= 0) return;
    if (revealMarked) revealMarked.add(el); else revealList.push(el);
    try { el.classList.add(revealCls); } catch (e) {}
  }
  function revealScan(hiddenOnly, spread) {
    var els = document.querySelectorAll('.reveal'), hit = [], i, op, b, vh = innerHeight;
    for (i = 0; i < els.length; i++) {
      if (!hiddenOnly) { hit.push(els[i]); continue; }
      try { op = parseFloat(getComputedStyle(els[i]).opacity); } catch (e) { op = 1; }
      if (op !== op) op = 1;
      if (op > .4) continue;
      b = els[i].getBoundingClientRect();
      if (b.bottom >= -200 && b.top <= vh + 200) hit.push(els[i]);
    }
    if (!hit.length) return;
    var list = spread ? els : hit;
    for (i = 0; i < list.length; i++) markReveal(list[i]);
  }
  function initReveal() {
    if (revealArmed) return;
    revealArmed = true;
    if (!('IntersectionObserver' in window)) { revealScan(false, true); return; }
    setTimeout(function () { safe(function () { revealScan(true, true); }); }, 2000);
    window.addEventListener('scroll', function () {
      if (revealTick) return;
      revealTick = setTimeout(function () {
        revealTick = 0;
        safe(function () { revealScan(true, false); });
      }, 600);
    }, { passive: true });
  }
  function refresh() {
    safe(startTrk);
    safe(bindPricingLinks);
    safe(scanDialogs);
    safe(function () { for (var i = 0; i < states.length; i++) syncDialog(states[i]); });
    safe(function () { ensureExternalLinks(document); });
    safe(startExtObserver);
    safe(initReveal);
  }
  function init() {
    safe(startTrk);
    safe(bindPricingLinks);
    safe(scanDialogs);
    safe(function () { for (var i = 0; i < states.length; i++) syncDialog(states[i]); });
    safe(function () { ensureExternalLinks(document); });
    safe(startExtObserver);
    safe(initReveal);
    safe(function () {
      if (typeof window.__zxyOpt === 'undefined') window.__zxyOpt = { version: '1.0.0', refresh: refresh };
    });
    safe(function () { setTimeout(openFromHash, 0); });
  }
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { try { init(); } catch (e) {} });
    } else {
      init();
    }
  } catch (e) {}
})();
/* FAQ 桌面右侧预览（任务 id=41）：capture 挂到祖先 .faq-list 才抢在基线冒泡监听前；
   ≤1023 解绑恢复，进入桌面关闭遗留弹窗。 */
(function () {
  'use strict';
  var mq = matchMedia('(min-width:1024px)');
  var list = document.querySelector('#faq .faq-list');
  var pane = document.querySelector('#faq .faq-preview');
  if (!mq || !list || !pane) return;
  var t = pane.querySelector('.faq-preview-title');
  var b = pane.querySelector('.faq-preview-body');
  var idx = pane.querySelector('.faq-preview-index');
  var on,cur;
  function show(btn) {
    if (!btn) return;
    var q = list.querySelectorAll('.faq-q'), n = q.length, i = -1, j;
    for (j = 0; j < n; j++) if (q[j] === btn) i = j;
    if (i < 0) return;
    var ans = btn.closest('.faq-item');
    ans = ans && ans.querySelector('.faq-a');
    t.textContent = (btn.children[1] || btn).textContent.trim();
    b.innerHTML = ans ? ans.innerHTML : '';
    if (idx) idx.textContent = ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + n).slice(-2);
    for (j = 0; j < n; j++) {
      var sel = q[j] === btn;
      q[j].classList.toggle('is-active', sel);
      if (sel) q[j].setAttribute('aria-selected', 'true');
      else q[j].removeAttribute('aria-selected');
    }
    cur = btn;
  }
  function click(e) {
    var btn = e.target.closest && e.target.closest('.faq-q');
    if (!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try { show(btn); } catch (err) {}
  }
  function sync() {
    try {
      if (mq.matches && !on) {
        list.addEventListener('click', click, true);
        on = true;
        show(cur || list.querySelector('.faq-q'));
        var c = document.getElementById('faqModalClose');
        c && c.click();
      } else if (!mq.matches && on) {
        list.removeEventListener('click', click, true);
        on = false;
      }
    } catch (err) {}
  }
  try {
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else mq.addListener(sync);
  } catch (err) {}
})();
/* §AB-6 · 品牌墙光标光斑（任务 id=62）
   只写 --ab-mx/--ab-my 两个 CSS 变量，不触发 reflow；
   减少动效或触屏（pointer:coarse）时完全不绑定。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)');
  if ((reduce && reduce.matches) || (coarse && coarse.matches)) return;
  var slots = document.querySelector('#partners .partners-slots');
  if (!slots) return;
  var raf = 0, mx = 50, my = 50, queued = false;
  function apply() {
    queued = false;
    slots.style.setProperty('--ab-mx', mx.toFixed(2) + '%');
    slots.style.setProperty('--ab-my', my.toFixed(2) + '%');
  }
  function reset() {
    if (raf) cancelAnimationFrame(raf);
    queued = false;
    slots.style.setProperty('--ab-mx', '50%');
    slots.style.setProperty('--ab-my', '50%');
  }
  slots.addEventListener('pointermove', function (e) {
    var r = slots.getBoundingClientRect();
    if (!r.width || !r.height) return;
    mx = ((e.clientX - r.left) / r.width) * 100;
    my = ((e.clientY - r.top) / r.height) * 100;
    if (!queued) { queued = true; raf = requestAnimationFrame(apply); }
  }, { passive: true });
  slots.addEventListener('pointerleave', reset, { passive: true });
})();
/* §AC · 导航金色滑动指示块（任务 id=63）
   PC（≥861px）才运行；窄屏汉堡面板下隐藏 pill 并退出。
   只写 pill 的 left/width 与 <a> 的 aria-current，全程 try/catch 不抛错。 */
(function () {
  'use strict';
  try {
    var nav = document.querySelector('.topline .nav-links');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll(':scope > a'));
    if (!links.length) return;

    var burger = document.querySelector('.nav-burger');
    function compact() {
      try { return !!burger && getComputedStyle(burger).display !== 'none'; } catch (e) { return false; }
    }

    var pill = nav.querySelector('.nav-pill');
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'nav-pill';
      pill.setAttribute('aria-hidden', 'true');
      nav.insertBefore(pill, nav.firstChild);
    }
    if (compact()) { pill.style.display = 'none'; return; }

    var active = nav.querySelector('a[aria-current="page"]') || links[0];
    var hovering = false;

    function place(a) {
      if (!a) return;
      pill.style.left = a.offsetLeft + 'px';
      pill.style.width = a.offsetWidth + 'px';
    }
    function mark(a) {
      links.forEach(function (x) {
        var on = x === a;
        x.classList.toggle('is-nav-active', on);
        if (on) x.setAttribute('aria-current', 'page');
        else x.removeAttribute('aria-current');
      });
      active = a;
      if (!hovering) place(a);
    }
    function relayout() { place(active); }

    // 初始落位
    mark(active);
    try { document.fonts && document.fonts.ready.then(relayout); } catch (e) {}
    window.addEventListener('load', relayout, { once: true });

    // 指针：hover 跟随，离开整个导航回到当前项
    nav.addEventListener('pointerover', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a || links.indexOf(a) < 0) return;
      hovering = true;
      place(a);
    });
    nav.addEventListener('pointerleave', function () { hovering = false; place(active); }, { passive: true });

    // 点击：设为当前项（aria-current 唯一）
    nav.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a || links.indexOf(a) < 0) return;
      hovering = false;
      mark(a);
    });

    // 键盘：←/→ 在项间移动当前项并聚焦
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var i = links.indexOf(document.activeElement);
      if (i < 0) i = links.indexOf(active);
      if (i < 0) i = 0;
      var n = e.key === 'ArrowRight' ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
      e.preventDefault();
      hovering = false;
      links[n].focus();
      mark(links[n]);
    });

    // 滚动归位：对应 section 进入视口时把该链接设为当前项
    try {
      var byId = {};
      links.forEach(function (a) {
        var id = (a.getAttribute('href') || '').replace(/^#/, '');
        if (id) byId[id] = a;
      });
      // 首屏 hero 阶段不做归位，避免加载时的布局抖动把当前项抢走
      var userScrolled = false;
      window.addEventListener('scroll', function () { userScrolled = true; }, { passive: true, once: true });
      var sections = [];
      // IO 只当触发器；真正的"当前区块"用几何判定（最后一个越过 20% 视口线的 section），
      // 避免相邻密集区块（如 services/pricing）在中带里互抢。
      function syncFromScroll() {
        var line = window.innerHeight * 0.2;
        var best = null;
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].getBoundingClientRect().top <= line) best = sections[i];
        }
        var a = best && byId[best.id];
        if (a && a !== active) mark(a);
      }
      var io = new IntersectionObserver(function (entries) {
        if (!userScrolled) return;
        // #pricing 是模态弹窗：可见即视为当前项（它没有文档流位置）
        for (var k = 0; k < entries.length; k++) {
          if (entries[k].target.id === 'pricing' && entries[k].isIntersecting) {
            if (byId.pricing && byId.pricing !== active) mark(byId.pricing);
            return;
          }
        }
        syncFromScroll();
      }, { rootMargin: '-20% 0px -75% 0px' });
      ['work', 'services', 'pricing', 'about', 'process', 'faq'].forEach(function (id) {
        var sec = document.getElementById(id);
        if (!sec) return;
        // #pricing 是 position:fixed 的定价弹窗（pricing-modal），没有文档流位置，
        // 不能参与"滚动到哪儿"的几何判定，只 observe 不参与计算。
        try {
          if (getComputedStyle(sec).position !== 'fixed') sections.push(sec);
        } catch (e) { sections.push(sec); }
        io.observe(sec);
      });
    } catch (e) {}

    // 尺寸变化重算
    try {
      if (window.ResizeObserver) new ResizeObserver(relayout).observe(nav);
      window.addEventListener('resize', function () {
        if (compact()) { pill.style.display = 'none'; return; }
        pill.style.display = '';
        relayout();
      }, { passive: true });
    } catch (e) {}
  } catch (err) {}
})();

/* opt-20261105.js - §AD · #work 精选 4 张弧形波浪的“滚动进入依次落位”（任务 id=64）
 * 说明：CSS 负责静态弧线偏移与 hover 回正；本段只在卡片首次进入视口时按
 * 0/80/160/240ms 错峰添加 .ab8-arc-in，触发 CSS transition 落位。
 * 无 IntersectionObserver 或用户要求减少动效时直接跳过 → 卡片保持静态弧线可见。
 * 不修改任何 .project 数量、data-case、文案或栅格列数。 */
(function () {
  'use strict';

  var SELECTOR = '#work .featured-showcase > .featured-card';
  var DELAYS = [0, 80, 160, 240];
  var attempts = 0;

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function arm() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(SELECTOR), 0, 4);
    if (!cards.length) {
      return false;                        // showcase 由 app.js 运行时创建，尚未就绪
    }
    if (typeof IntersectionObserver !== 'function') {
      return true;                          // 直接放弃入场，保留静态弧
    }
    document.documentElement.classList.add('ab8-arc-armed');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el = entry.target;
        var index = cards.indexOf(el);
        io.unobserve(el);
        window.setTimeout(function () {
          el.classList.add('ab8-arc-in');
        }, DELAYS[index] || 0);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    cards.forEach(function (el) { io.observe(el); });
    return true;
  }

  function start() {
    if (prefersReducedMotion()) { return; }
    if (arm()) { return; }
    // app.js 稍后创建 .featured-showcase：最多轮询 20 次（约 2s）
    var timer = window.setInterval(function () {
      attempts += 1;
      if (arm() || attempts >= 20) { window.clearInterval(timer); }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
/* opt-20261105.js - §AE · 案例详情数字滚动（任务 id=65）
 * 说明：监听 #caseModal 的 aria-hidden。变 false 时把 .case-stat-code 与
 * .case-percent 从 0 计到原值（1400ms，easeOutCubic）；变 true 时停止并
 * 还原为打开时捕获的原文。用正则提取首个数字与前后缀，保留前导零宽度、
 * 小数位与 % / × 等符号；结束时直接写回原始文本，保证逐字符一致。
 * 非数字文本跳过；prefers-reduced-motion 不计数；重复打开重新从 0 开始。
 * 不改 DOM 结构、不写 data-*，与 app.js 对 .case-stat[data-value] 的
 * MutationObserver 互不干扰（本段只改 textContent）。 */
(function () {
  'use strict';

  var modal = document.getElementById('caseModal');
  if (!modal) { return; }

  var SELECTOR = '.case-stat-code, .case-percent';
  var DURATION = 1400;                 // 1.4s，落在任务要求的 1.2–1.6s 区间
  var rafId = 0;
  var timerId = 0;
  var records = [];                    // { el, finalText, pattern, prefix, suffix }

  function now() {
    return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
  }
  function requestFrame(cb) {
    return window.requestAnimationFrame ? window.requestAnimationFrame(cb) : window.setTimeout(function () { cb(now()); }, 16);
  }
  function cancelFrame(id) {
    if (window.cancelAnimationFrame) { window.cancelAnimationFrame(id); } else { window.clearTimeout(id); }
  }
  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  /* 解析首个数字：记录整数位宽（含前导零）、小数位与前后缀位置 */
  function parseNumber(text) {
    var m = /(-?\d+(?:\.(\d+))?)/.exec(text);
    if (!m) { return null; }
    var raw = m[1];
    var digits = raw.replace('-', '');
    var dot = digits.indexOf('.');
    var intPart = dot === -1 ? digits : digits.slice(0, dot);
    return {
      start: m.index,
      end: m.index + raw.length,
      intWidth: intPart.length,
      hasLeadingZero: intPart.length > 1 && intPart.charAt(0) === '0',
      decimals: dot === -1 ? 0 : digits.length - dot - 1,
      target: Number(raw)
    };
  }
  function formatValue(value, pattern) {
    var v = Math.max(0, value);
    var fixed = pattern.decimals > 0 ? v.toFixed(pattern.decimals) : String(Math.round(v));
    var parts = fixed.split('.');
    var intPart = parts[0];
    /* 只有原值带前导零（如 "01"）才补零；"100" 计数途中保持 19 而不是 019 */
    if (pattern.hasLeadingZero) {
      while (intPart.length < pattern.intWidth) { intPart = '0' + intPart; }
    }
    return pattern.decimals > 0 ? intPart + '.' + parts[1] : intPart;
  }

  function stop() {
    if (rafId) { cancelFrame(rafId); rafId = 0; }
    if (timerId) { window.clearTimeout(timerId); timerId = 0; }
  }
  function restore() {
    for (var i = 0; i < records.length; i++) {
      records[i].el.textContent = records[i].finalText;
    }
    records = [];
  }

  function start() {
    stop();
    records = [];
    var nodes = modal.querySelectorAll(SELECTOR);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var text = el.textContent;
      var pattern = parseNumber(text);
      if (!pattern) { continue; }      // i18n 换成非数字文本 → 跳过
      records.push({
        el: el,
        finalText: text,
        pattern: pattern,
        prefix: text.slice(0, pattern.start),
        suffix: text.slice(pattern.end)
      });
    }
    if (!records.length) { return; }
    if (prefersReducedMotion()) { return; }   // 不计数，保持打开时的最终值
    for (var j = 0; j < records.length; j++) {
      records[j].el.textContent = records[j].prefix + formatValue(0, records[j].pattern) + records[j].suffix;
    }
    var t0 = now();
    function tick(t) {
      var elapsed = (typeof t === 'number' ? t : now()) - t0;
      var ratio = Math.min(Math.max(elapsed / DURATION, 0), 1);
      var eased = 1 - Math.pow(1 - ratio, 3);
      for (var k = 0; k < records.length; k++) {
        var r = records[k];
        r.el.textContent = ratio < 1
          ? r.prefix + formatValue(r.pattern.target * eased, r.pattern) + r.suffix
          : r.finalText;
      }
      if (ratio < 1) { rafId = requestFrame(tick); } else { rafId = 0; }
    }
    rafId = requestFrame(tick);
  }

  function scheduleStart() {
    stop();
    /* 等 app.js 的打开流程把 .case-percent 写成新案例的最终值（其
       MutationObserver 在同一轮微任务里执行），下一帧再捕获原值并归零 */
    timerId = window.setTimeout(function () {
      timerId = 0;
      requestFrame(function () { start(); });
    }, 32);
  }

  function onHiddenChanged() {
    if (modal.getAttribute('aria-hidden') === 'false') {
      scheduleStart();
    } else {
      stop();
      restore();
    }
  }

  new MutationObserver(onHiddenChanged).observe(modal, { attributes: true, attributeFilter: ['aria-hidden'] });
})();
/* opt-20261105.js - §AF · 全站分层视差 + 滚动进度轨迹线（任务 id=66）
 * -------------------------------------------------------------------------
 * 只写 CSS 自定义属性，不改 DOM 结构、不碰 transform（.project / .sx-card
 * 的 transform 已被基线逐帧内联占用）。
 *
 * 计算模型：每层以「元素中心相对视口中心」归一化到 p ∈ [-1, 1]
 *   p = (vh/2 − (docTop + h/2 − scrollY)) / ((vh + h)/2)
 *   translateY = round(p × amp)
 * 滚动向下 → p 增大 → 背景向下位移，观感上比前景慢。p 对 scrollY 连续，
 * 元素进出视口处不做跳变（越界后夹到 ±amp）。
 *
 * 性能：层的位置只在「滚动起手 / resize / 字体就绪」时缓存（每轮滚动只读
 * 一次布局），帧内只用缓存值 + scrollY 做滚动距离判断，离开视口的层不计算
 * 也不写变量。单帧最多写 4 个变量。
 * prefers-reduced-motion：不启动 rAF、变量保持 0，轨迹线只留 CSS 静态细线。
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var LAYERS = [
    {
      varName: '--af-p1',
      sel: '#services .capabilities-backdrop .backdrop-finish',
      amp: 26
    },
    {
      varName: '--af-p2',
      sel: '.manifesto-refined .manifesto-blueprint',
      amp: 20
    },
    {
      /* SVG 加了 scale:1.12 出血，rect 会带缩放偏移；几何一律以 figure 为准 */
      varName: '--af-p3',
      sel: '#contact .contact-visual .contact-collab-art',
      refSel: '#contact .contact-visual',
      amp: 13
    }
  ];

  var RAIL_CLASS = 'af-progress-rail';
  var FILL_CLASS = 'af-progress-fill';
  var root = document.documentElement;

  var reduced = false;
  var started = false;
  var bound = false;
  var frame = 0;
  var burst = false;
  var burstTimer = 0;
  var lastProgress = -1;
  var vh = 0;
  var docHeight = 0;

  var layers = LAYERS.map(function (cfg) {
    return {
      cfg: cfg,
      el: null,
      refEl: null,
      docTop: 0,
      h: 1,
      px: 0
    };
  });

  function requestFrame(cb) {
    return window.requestAnimationFrame
      ? window.requestAnimationFrame(cb)
      : window.setTimeout(cb, 16);
  }
  function cancelFrame(id) {
    if (window.cancelAnimationFrame) { window.cancelAnimationFrame(id); }
    else { window.clearTimeout(id); }
  }
  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }
  function scrollY() {
    return window.pageYOffset || root.scrollTop || 0;
  }
  function viewportHeight() {
    return window.innerHeight || root.clientHeight || 1;
  }

  /* 轨迹线节点：JS 生成，不改 index.html */
  function createRail() {
    if (!document.body) { return false; }
    if (document.querySelector('.' + RAIL_CLASS)) { return true; }
    var rail = document.createElement('div');
    rail.className = RAIL_CLASS;
    rail.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('i');
    fill.className = FILL_CLASS;
    rail.appendChild(fill);
    document.body.appendChild(rail);
    return true;
  }

  /* 缓存层位置：每轮滚动起手与 resize 各一次，帧内不再读布局。
     读取时减掉本层已施加的位移，避免 translate 反过来影响自身进度。 */
  function measure() {
    if (!started || reduced) { return; }
    vh = viewportHeight();
    docHeight = Math.max(
      root.scrollHeight || 0,
      document.body ? document.body.scrollHeight : 0
    );
    var y = scrollY();
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      if (!L.el || !L.el.isConnected) {
        L.el = document.querySelector(L.cfg.sel);
        L.refEl = L.cfg.refSel ? document.querySelector(L.cfg.refSel) : null;
      }
      if (!L.el) { continue; }
      var box = (L.cfg.refSel && L.refEl) ? L.refEl : L.el;
      var rect = box.getBoundingClientRect();
      /* 位移施加在 el 上；若几何取自 ref（figure 未位移），不能回退 translate */
      var shifted = (L.cfg.refSel && L.refEl) ? 0 : L.px;
      L.docTop = rect.top + y - shifted;
      L.h = rect.height || 1;
    }
  }

  function update() {
    frame = 0;
    if (reduced) { return; }
    var y = scrollY();
    var hVp = vh || viewportHeight();

    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      if (!L.el) { continue; }
      /* 离开视口的层跳过计算与写入：用缓存几何做滚动距离判断，不读布局。
         边界处 p 已夹到 ±1，因此跳过期间保留的正是这一边界值，
         重新进入视口时首个写值与之衔接，不会跳变。 */
      var vTop = L.docTop - y;
      if (vTop >= hVp || vTop + L.h <= 0) { continue; }
      var half = (hVp + L.h) * 0.5;
      var p = ((hVp * 0.5) - ((L.docTop + L.h * 0.5) - y)) / half;
      if (p > 1) { p = 1; } else if (p < -1) { p = -1; }
      var px = Math.round(p * L.cfg.amp);
      if (px !== L.px) {
        L.px = px;
        root.style.setProperty(L.cfg.varName, String(px));
      }
    }

    var total = docHeight - hVp;
    var progress = total > 0 ? y / total : 0;
    if (progress < 0) { progress = 0; } else if (progress > 1) { progress = 1; }
    progress = Math.round(progress * 10000) / 10000;
    if (progress !== lastProgress) {
      lastProgress = progress;
      root.style.setProperty('--af-progress', String(progress));
    }
  }

  function onScroll() {
    if (reduced) { return; }
    if (!burst) {
      /* 滚动起手：重新缓存位置（懒加载图片/筛选切换会改变文档高） */
      burst = true;
      window.clearTimeout(burstTimer);
      burstTimer = window.setTimeout(function () {
        burst = false;
        burstTimer = 0;
      }, 160);
      measure();
    }
    if (!frame) { frame = requestFrame(update); }
  }

  function onResize() {
    if (reduced) { return; }
    measure();
    if (!frame) { frame = requestFrame(update); }
  }

  function bind() {
    if (bound) { return; }
    bound = true;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    window.addEventListener('load', onResize, { once: true });
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(onResize).catch(function () {});
      }
    } catch (e) {}
  }

  function resetVars() {
    for (var i = 0; i < layers.length; i++) {
      layers[i].px = 0;
      root.style.removeProperty(layers[i].cfg.varName);
    }
    lastProgress = -1;
    root.style.removeProperty('--af-progress');
  }

  function stopAnimating() {
    if (frame) { cancelFrame(frame); frame = 0; }
    if (burstTimer) { window.clearTimeout(burstTimer); burstTimer = 0; }
    burst = false;
    resetVars();
  }

  function applyMotionPreference() {
    reduced = prefersReducedMotion();
    if (reduced) {
      stopAnimating();
      return;
    }
    if (!started) { return; }
    bind();
    measure();
    if (!frame) { frame = requestFrame(update); }
  }

  function boot() {
    if (started) { return; }
    if (!createRail()) { return; }          // body 尚未解析完成
    started = true;
    reduced = prefersReducedMotion();
    /* 先挂媒体查询监听：即使首帧就是 reduced，也能在用户取消该偏好后恢复 */
    try {
      if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mq.addEventListener) { mq.addEventListener('change', applyMotionPreference); }
        else if (mq.addListener) { mq.addListener(applyMotionPreference); }
      }
    } catch (e) {}
    if (reduced) { return; }                // 只有静态细线，不进入逐帧更新
    measure();
    update();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
