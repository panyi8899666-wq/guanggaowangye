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

/* §AH · 合作品牌墙 Magic UI Marquee 结构生成（任务 id=69）
   只做 DOM 搬运，动画/渐隐/暂停全部在 §AH 的 CSS 里：
   按 .partners-group 把 .partners-slots 切成三段，每段成一条 .ab-mq 带，
   带内 2 条 track（第二条是第一条的整批克隆）拼成无缝循环；组标题留在带上方。
   幂等：检测到已有 .ab-mq 就退出。全程 try/catch，异常不影响页面其余脚本。 */
(function () {
  'use strict';
  try {
    var slots = document.querySelector('#partners .partners-slots');
    if (!slots || slots.querySelector('.ab-mq')) return;

    /* 克隆节点不能带 id / tabindex：否则同页出现重复 id 与重复可聚焦元素 */
    function stripFocusable(node) {
      if (node.id) node.removeAttribute('id');
      if (node.hasAttribute('tabindex')) node.removeAttribute('tabindex');
      Array.prototype.forEach.call(node.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
      Array.prototype.forEach.call(node.querySelectorAll('[tabindex]'), function (n) { n.removeAttribute('tabindex'); });
    }

    /* 按组标题切段：标题之后连续的 .partners-slot-item 归入该组 */
    var groups = [], cur = null;
    Array.prototype.forEach.call(slots.children, function (el) {
      if (el.classList.contains('partners-group')) {
        cur = { head: el, items: [] };
        groups.push(cur);
      } else if (cur && el.classList.contains('partners-slot-item')) {
        cur.items.push(el);
      }
    });

    groups.forEach(function (g, i) {
      if (!g.items.length || !g.head.parentNode) return;

      var band = document.createElement('div');
      band.className = 'ab-mq';
      if (i === 1) band.setAttribute('data-dir', 'reverse'); /* 第 2 组反向 */

      /* 原始节点整批搬进第一条 track：保留原有语义、aria 与既有绑定 */
      var track = document.createElement('div');
      track.className = 'ab-mq__track';
      g.items.forEach(function (item) { track.appendChild(item); });

      /* 第二条 track = 第一条的整批克隆，供 CSS 无缝衔接 */
      var clone = document.createElement('div');
      clone.className = 'ab-mq__track ab-mq__track--clone';
      clone.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(track.children, function (item) {
        var copy = item.cloneNode(true);
        stripFocusable(copy);
        clone.appendChild(copy);
      });

      band.appendChild(track);
      band.appendChild(clone);
      slots.insertBefore(band, g.head.nextSibling); /* 标题留在带上方 */
    });
  } catch (err) {}
})();

/* §AI · 导航滚动收缩 + 顶部进度线 + CTA 磁吸（任务 id=70）
   --------------------------------------------------------------------------
   与 §AF 的关系：§AF 的 scroll 监听在闭包内、且 prefers-reduced-motion 下直接
   停掉全部逐帧更新；而本段的收缩必须在该模式下依然生效，无法复用它。
   故本段自带一个 scroll 监听，严格 { passive: true } + rAF 合并（同帧只算一次，
   几何量 docHeight / viewportHeight 在滚动起手 160ms 内只测一次），不新增第二个
   常驻 rAF 循环。
   CTA 磁吸只在 pointer:fine 且非 reduced-motion 时绑定；位移写 CSS 变量
   --ai-mg-x / --ai-mg-y（限幅 ±8px），由 §AI 的 translate 消费，绝不写 transform
   （基线 app.js 的内联磁吸与 hero-ready 皮肤占用 transform）。
   -------------------------------------------------------------------------- */
(function () {
  'use strict';
  try {
    var root = document.documentElement;

    function requestFrame(cb) {
      return window.requestAnimationFrame
        ? window.requestAnimationFrame(cb)
        : window.setTimeout(cb, 16);
    }
    function cancelFrame(id) {
      if (window.cancelAnimationFrame) { window.cancelAnimationFrame(id); }
      else { window.clearTimeout(id); }
    }

    /* ---------- AI-3 导航：收缩类 + 顶部进度线 ---------- */
    function initNav() {
      var topline = document.querySelector('.topline');
      if (!topline) { return; }

      /* 伪元素审计：.topline::after 实测 content:none 属于空闲位，
         但伪元素无法被 getBoundingClientRect 测量、也无法单列层级，
         故按任务允许的兜底方式生成真实节点 <span.ai-nav-progress>。 */
      var progress = topline.querySelector('.ai-nav-progress');
      if (!progress) {
        progress = document.createElement('span');
        progress.className = 'ai-nav-progress';
        progress.setAttribute('aria-hidden', 'true');
        topline.appendChild(progress);
      }

      var compacted = false;
      var frame = 0;
      var burst = false;
      var burstTimer = 0;
      var docHeight = 0;
      var viewHeight = 0;
      var lastWidth = -1;

      function measure() {
        docHeight = Math.max(
          root.scrollHeight || 0,
          document.body ? document.body.scrollHeight : 0
        );
        viewHeight = window.innerHeight || root.clientHeight || 1;
      }

      function update() {
        frame = 0;
        var y = window.pageYOffset || root.scrollTop || 0;

        var compact = y > 80;
        if (compact !== compacted) {
          compacted = compact;
          topline.classList.toggle('ai-nav-compact', compact);
        }

        var total = docHeight - viewHeight;
        var p = total > 0 ? y / total : 0;
        if (p < 0) { p = 0; } else if (p > 1) { p = 1; }
        var width = Math.round(p * 1000) / 10;   /* 0.1% 精度，避免每帧都写样式 */
        if (width !== lastWidth) {
          lastWidth = width;
          progress.style.width = width + '%';
          root.style.setProperty('--ai-nav-progress', String(p));
        }
      }

      function onScroll() {
        if (!burst) {
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
        measure();
        if (!frame) { frame = requestFrame(update); }
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('orientationchange', onResize, { passive: true });
      window.addEventListener('load', onResize, { once: true });
      try {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(onResize).catch(function () {});
        }
      } catch (e) {}

      measure();
      update();
    }

    /* ---------- AI-2 CTA 磁吸：独立 translate，限幅 ±8px ---------- */
    function initMagnetic() {
      var actions = document.querySelector('#contact .contact-actions');
      if (!actions) { return; }
      var buttons = Array.prototype.slice.call(actions.querySelectorAll('.cta'));
      if (!buttons.length) { return; }

      /* 限幅取 6px（仍满足 ≤8px 验收）：#contact .contact-actions 两个 .cta 的
         水平间隙实测 15px，若两侧各自吸到 ±8px 会相向叠进 1px；±6px 留 3px 间隙。
         影响半径 140px：另一枚按钮中心距本按钮中心约 141px（126/2 + 15 + 212/2），
         恰好落在衰减边界外，避免「贴近 A 却把 B 拽过来」。 */
      var MAX = 6;
      var RADIUS = 140;
      var RATIO = 0.55;        /* 位移系数：偏移 × 系数 × 距离衰减 */
      var coarseQuery = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
      var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

      function isDisabled() {
        return !!((coarseQuery && coarseQuery.matches) || (reduceQuery && reduceQuery.matches));
      }

      /* 任务要求：coarse 指针与 reduced-motion 下不绑定监听，直接返回 */
      if (isDisabled()) { return; }

      var frame = 0;
      var pointerX = 0;
      var pointerY = 0;
      var bound = false;

      function clearVars() {
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].style.removeProperty('--ai-mg-x');
          buttons[i].style.removeProperty('--ai-mg-y');
        }
      }

      function clampShift(value) {
        if (value > MAX) { return MAX; }
        if (value < -MAX) { return -MAX; }
        return Math.round(value * 100) / 100;
      }

      function update() {
        frame = 0;
        if (!bound || isDisabled()) { clearVars(); return; }

        for (var i = 0; i < buttons.length; i++) {
          var btn = buttons[i];
          var rect = btn.getBoundingClientRect();
          /* rect 已包含上一层写入的 translate，减回去还原未位移的按钮中心，
             否则中心随位移漂移，形成自反馈抖动 */
          var curX = parseFloat(btn.style.getPropertyValue('--ai-mg-x')) || 0;
          var curY = parseFloat(btn.style.getPropertyValue('--ai-mg-y')) || 0;
          var cx = rect.left + rect.width / 2 - curX;
          var cy = rect.top + rect.height / 2 - curY;
          var dx = pointerX - cx;
          var dy = pointerY - cy;
          var dist = Math.sqrt(dx * dx + dy * dy);
          /* 距离越远衰减：RADIUS 内线性衰减，RADIUS 外归 0 */
          var falloff = dist >= RADIUS ? 0 : 1 - dist / RADIUS;
          btn.style.setProperty('--ai-mg-x', clampShift(dx * RATIO * falloff) + 'px');
          btn.style.setProperty('--ai-mg-y', clampShift(dy * RATIO * falloff) + 'px');
        }
      }

      function onPointerMove(event) {
        if (!bound) { return; }
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!frame) { frame = requestFrame(update); }
      }

      function onPointerLeave() {
        if (frame) { cancelFrame(frame); frame = 0; }
        pointerX = 0;
        pointerY = 0;
        clearVars();
      }

      function unbind() {
        bound = false;
        actions.removeEventListener('pointermove', onPointerMove);
        actions.removeEventListener('pointerleave', onPointerLeave);
        actions.removeEventListener('pointercancel', onPointerLeave);
        onPointerLeave();
      }

      function onMediaChange() {
        if (isDisabled()) { unbind(); }
      }

      actions.addEventListener('pointermove', onPointerMove, { passive: true });
      actions.addEventListener('pointerleave', onPointerLeave, { passive: true });
      actions.addEventListener('pointercancel', onPointerLeave, { passive: true });
      bound = true;

      /* 运行中切换指针类型 / 动效偏好：解除绑定并归零，不残留位移 */
      if (coarseQuery && coarseQuery.addEventListener) {
        coarseQuery.addEventListener('change', onMediaChange);
      }
      if (reduceQuery && reduceQuery.addEventListener) {
        reduceQuery.addEventListener('change', onMediaChange);
      }
    }

    function boot() {
      try { initNav(); } catch (e) {}
      try { initMagnetic(); } catch (e) {}
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  } catch (err) {}
})();

/* §AJ · 首页案例轮转带：51 个案例 DOM 生成（任务 id=71）
   --------------------------------------------------------------------------
   只做 DOM 构建，动画 / 渐隐 / 暂停 / 静态横滚全部在 §AJ 的 CSS 里。
   数据来源：.featured-ledger .project × 51（app.js 运行时把 .work-grid 的案例卡
   搬进该容器）。逐张提取：
     · 图片：srcset 里的最小候选（-800 变体）→ 卡片只显示 247px 宽，
       用 800w 已足够（2x DPR 也覆盖），102 个 <img> 的解码内存比直接引原图
       低约 5.8 倍；srcset 缺失时退回 img 的 src。
     · 分类：.project-meta small    · 标题：.project-meta strong
     · 无图片的概念卡（MOSS 山岚茶事）clone 它的 .concept-art 作为视觉层。
   去数字（A + C 双重保障）：
     ① 提取时逐段清洗：去行首两位序号、去 "/ 17"、"02 / 17" 这类页码残留、
        去尾部两位序号；.sample-tag（"01 · 产品级 3D 渲染"）整块不提取。
     ② 组装完成后再对 .hero-mq 的全部文本节点做一次正则兜底清零
        （concept-art 自带的文本也在内），保证卡片内不残留任何序号。
   幂等：检测到 .hero-ribbon 里已有 .hero-mq 就退出；全程 try/catch，
        异常不影响页面其余脚本。 */
(function () {
  'use strict';
  try {
    var RIBBON_SEL = '.hero-ribbon';
    var ribbon = document.querySelector(RIBBON_SEL);
    if (!ribbon || ribbon.querySelector('.hero-mq')) return;

    /* ---------- 文本清洗 ---------- */
    function cleanText(raw) {
      var s = String(raw == null ? '' : raw);
      s = s.replace(/\b\d{1,2}\s*\/\s*17\b/g, ' ');        /* "02 / 17" */
      s = s.replace(/\/\s*17\b/g, ' ');                     /* "/ 17" */
      s = s.replace(/^\s*\d{2}\s*[·.、:：\-—–]?\s*/, '');  /* 行首两位序号 */
      s = s.replace(/\s+\d{2}\s*$/, '');                    /* 尾部两位序号 */
      return s.replace(/\s+/g, ' ').trim();
    }

    /* 组装后再扫一遍所有文本节点（兜底：防止 concept-art / 分类串里的残留） */
    function scrubNumbers(root) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var nodes = [], node;
      while ((node = walker.nextNode())) nodes.push(node);
      nodes.forEach(function (n) {
        var t = n.nodeValue;
        if (!t || !/\d/.test(t)) return;
        var next = t.replace(/\b\d{1,2}\s*\/\s*17\b/g, ' ')
                    .replace(/\/\s*17\b/g, ' ')
                    .replace(/^\s*\d{2}\s*[·.、:：\-—–]?\s*/, ' ');
        if (next !== t) n.nodeValue = next.replace(/[ \t]{2,}/g, ' ');
      });
    }

    /* ---------- 逐张取素材 ----------
       app.5082587a.js 对「第 6 张之后」的案例卡做懒加载接力：把 img 的 src / srcset
       摘掉、原图路径挪到 data-cgsrc，等卡进入视口附近（rootMargin 600px）才还原。
       本段在 DOMContentLoaded 取素材，若不读 data-cgsrc，这 2 张
       （投币盒子 / 天马微电子奠基）会被整条丢弃 —— 实测正是 49/51 的成因。
       四档兜底：srcset 最小候选 → src（多为 assets/r/*-w480 响应式缩略图）
                 → data-cgsrc（原图，两张分别 21KB / 5KB）→ concept-art → 文字卡。 */
    function pickImage(pj) {
      var img = pj.querySelector('img');
      if (img) {
        var srcset = img.getAttribute('srcset') || '';
        var first = (srcset.split(',')[0] || '').trim().split(/\s+/)[0];
        var src = first || img.getAttribute('src') || img.getAttribute('data-cgsrc') || '';
        if (src) return { kind: 'img', src: src, alt: img.getAttribute('alt') || '' };
      }
      var art = pj.querySelector('.concept-art');
      if (art) return { kind: 'art', node: art };
      return { kind: 'text' };
    }

    function buildMedia(media, title, cat) {
      var box = document.createElement('div');
      box.className = 'hero-mq__media';

      if (media.kind === 'text') {
        /* 无图、也无概念稿：绝不留空图片框，改渲染渐变底 + 分类大字 */
        var glyph = document.createElement('span');
        glyph.className = 'hero-mq__glyph';
        glyph.setAttribute('aria-hidden', 'true');
        glyph.textContent = cat || title;
        box.appendChild(glyph);
        return box;
      }

      if (media.kind === 'img') {
        var img = document.createElement('img');
        img.setAttribute('src', media.src);
        img.setAttribute('alt', media.alt || title);
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        img.setAttribute('draggable', 'false');
        box.appendChild(img);
      } else {
        var art = media.node.cloneNode(true);
        art.removeAttribute('id');
        art.removeAttribute('tabindex');
        Array.prototype.forEach.call(art.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
        Array.prototype.forEach.call(art.querySelectorAll('[tabindex]'), function (n) { n.removeAttribute('tabindex'); });
        art.setAttribute('aria-hidden', 'true');
        box.appendChild(art);
      }
      return box;
    }

    function buildCard(pj) {
      var media = pickImage(pj);

      var catEl = pj.querySelector('.project-meta small');
      var titleEl = pj.querySelector('.project-meta strong');
      var cat = cleanText(catEl ? catEl.textContent : '');
      var title = cleanText(titleEl ? titleEl.textContent : '');
      if (!title) return null;

      var card = document.createElement('article');
      card.className = 'hero-mq__card' + (media.kind === 'text' ? ' hero-mq__card--text' : '');
      /* 去重与验收用：data-case 来自 .project 的案例键，data-media 记录视觉来源 */
      card.setAttribute('data-case', pj.getAttribute('data-case') || '');
      card.setAttribute('data-media', media.kind);
      /* 整卡的 textContent 以「分类」开头，天然不以两位数字开头 */
      card.appendChild(buildMedia(media, title, cat));

      var shade = document.createElement('span');
      shade.className = 'hero-mq__shade';
      shade.setAttribute('aria-hidden', 'true');
      card.appendChild(shade);

      var meta = document.createElement('div');
      meta.className = 'hero-mq__meta';
      if (cat) {
        var catNode = document.createElement('span');
        catNode.className = 'hero-mq__cat';
        catNode.textContent = cat;
        meta.appendChild(catNode);
      }
      var titleNode = document.createElement('strong');
      titleNode.className = 'hero-mq__title';
      titleNode.textContent = title;
      meta.appendChild(titleNode);
      card.appendChild(meta);

      return card;
    }

    function makeTrack(cards, isClone) {
      var track = document.createElement('div');
      track.className = 'hero-mq__track' + (isClone ? ' hero-mq__track--clone' : '');
      if (isClone) track.setAttribute('aria-hidden', 'true');
      cards.forEach(function (card) {
        track.appendChild(isClone ? card.cloneNode(true) : card);
      });
      return track;
    }

    /* ---------- 组装（.featured-ledger 由 app.js 异步生成，未就绪时短轮询） ---------- */
    function build() {
      if (ribbon.querySelector('.hero-mq')) return true;

      var projects = Array.prototype.slice.call(
        document.querySelectorAll('.featured-ledger .project'));
      if (!projects.length) return false;

      var cards = [];
      projects.forEach(function (pj) {
        var card = buildCard(pj);
        if (card) cards.push(card);
      });
      if (!cards.length) return false;

      var mq = document.createElement('div');
      mq.className = 'hero-mq';
      mq.setAttribute('data-count', String(cards.length));
      mq.setAttribute('aria-label', '案例作品无限轮转展示，鼠标移入暂停');
      mq.appendChild(makeTrack(cards, false));
      mq.appendChild(makeTrack(cards, true));

      scrubNumbers(mq);
      ribbon.appendChild(mq);
      /* 轮播挂上之后再藏静态主图，首屏最大内容仍是那张已经画出来的主图 */
      ribbon.classList.add('hero-ribbon--live');
      return true;
    }

    var timer = null;
    var tries = 0;

    function start() {
      if (build()) return;
      timer = setInterval(function () {
        tries += 1;
        if (build() || tries >= 40) {
          clearInterval(timer);
          timer = null;
        }
      }, 120);
    }

    /* 等首屏画完再组 51 张卡，避免轮播图抢在主图之前成为最大内容 */
    function boot() {
      /* load 之后主图已经进文档；再等一小段，让它先画出来，再组轮播 */
      var go = function () { setTimeout(start, 1600); };
      if (document.readyState === 'complete') go();
      else window.addEventListener('load', go, { once: true });
    }

    boot();
  } catch (err) {}
})();
/* §AL · 合作品牌墙：缩略小图 + 三带 16/16/16（任务 id=73）
   --------------------------------------------------------------------------
   与 §AH 的分工：§AH 按 .partners-group 切段并生成 .ab-mq 结构；本次用户要求
   「加入缩略小图不需要分类，按这个模式平均分3分」，index.html 里已删掉 3 个组
   标题，因此 §AH 的 groups 为空、不再建带，本段在其后接管新形态：
     ① 用 THUMB_MAP 把 .partner-badge 的字母换成 24×24 缩略图（<img> 由本段生成，
        loading="lazy" / decoding="async" / alt=""；表中没有的品牌保留字母徽标兜底，
        且把原字母存进 data-letter，便于幂等恢复）。查表键取品牌项上的
        data-brand 属性而非 <strong> 文本：i18n-en 等译文会把名称换成英文，
        属性值不变，缩略图因此不随语言切换丢失；
     ② 兜底清理 .partners-group（正常情况下 HTML 里已无该节点）；
     ③ 48 个品牌按 DOM 原顺序每 16 个一条带，3 条带各 2 条 track（原 + 克隆），
        方向 normal / reverse / normal，视觉样式完全复用 §AH 的 CSS。
   映射原则：只收「该品牌确有独立成图」的条目。portfolio-signage-series 是发光字
   系列汇总图，同时含闪亮柚 / 哪吒汽车 / 良初肉业三个品牌，不能一张图套三个品牌，
   故只取闪亮柚的单图 portfolio-signage-shinyou；海丝智谷产业园、良初肉业、
   哪吒汽车、柚见饮品（p01-sparkling-water 属「清屿饮品」，不是本品牌）四个
   品牌保留字母兜底。
   幂等：已是 3 带 × 16 项 × 2 轨且无组标题时，补图后直接返回。
   全程 try/catch，任何异常不影响页面其余脚本。
   -------------------------------------------------------------------------- */
(function () {
  'use strict';
  try {
    var slots = document.querySelector('#partners .partners-slots');
    if (!slots) return;

    var THUMB_DIR = 'assets/thumbs/';
    var PER_BAND = 16;
    var BAND_COUNT = 3;

    /* 品牌名（<strong> 全文，含英文后缀）→ assets/thumbs 下的文件名（不含扩展名） */
    var THUMB_MAP = {
      '灯下小馆': 'dengxia-01',
      '光影食序': 'lumen-01',
      '甘棠记': 'gantang-01',
      '花间集 HUAJIANJI': 'huajianji-01',
      '黑曜镜像': 'heiyao-01',
      '棱镜无界': 'lengjing-01',
      '留声暮色': 'liusheng-01',
      '落日切片': 'luori-01',
      'MOSS 山岚茶事': 'media-generation-moss-box-front-0-8c63708c-8a6b-4fbc-82e1-a5bcd69f39e8',
      'MUGU 木谷烘焙': 'mugu-render-angle-true3d',
      '麦屿烘焙 MAIYU': 'maiyu-bakery-storefront-day',
      '霓光矩阵': 'neomatrix-01',
      'ORBIT 播客空间': 'media-generation-orbit-brand-0-a44e6f94-1c41-454f-8577-5faf99223c82',
      '栖石研磨': 'qishi-01',
      '松隐茶境': 'songyin-01',
      '素因实验': 'suyin-01',
      '素物陶社': 'sowoo-01',
      '晚风书店': 'wanfeng-01',
      '望舒小厨': 'wangshu-01',
      '寻木记': 'xunmu-01',
      '野径集': 'yejing-01',
      /* 海丝智谷产业园：thumbs 里没有该园区成图 → 字母兜底 */
      '慕思 DeRUCCI': 'derucci-01',
      '天马微电子': 'portfolio-tianma-led',
      '厦门士兰集华微电子': 'shilan-05',
      '厦门市孝贤技工学校': 'xiaoxian-01',
      '新阳街道': 'xinyang-04',
      'AERA': 'aera-open-render',
      '春日樱花': 'portfolio-spring-sakura',
      'FOLD 家居': 'media-generation-fold-cover-0-f062dc91-d151-4b16-bb8b-2d0f4953d29f',
      '机器人 IP': 'portfolio-robot-ip-blender',
      'KILO': 'kilo-render-front-true3d',
      'LENS 影像节': 'lens-render-angle',
      'LUMA 夜跑': 'luma',
      'LUNO': 'media-generation-luno-giftbox-0-7c0fb9ec-e542-49cb-b201-3c26b161ba6e',
      /* 良初肉业：仅出现在发光字汇总图 → 字母兜底 */
      'MONO 家居': 'media-generation-mono-storefront-0-6e1b4108-1b54-4846-8b62-0ab5191862c5',
      'NEXA': 'media-generation-nexa-product-0-c6a5b9d2-4fa7-4eea-9b6d-be338b68dff1',
      'NOVA': 'nova',
      /* 哪吒汽车：仅出现在发光字汇总图 → 字母兜底 */
      'PINK DUST': 'media-generation-pink-xiaohongshu-0-526d3888-2a29-4dd3-91a7-be35ec962138',
      '跑动的小车': 'portfolio-running-car-render',
      '青年趣享时光': 'youth2025-01',
      '商城展台': 'portfolio-mall-booth-spring',
      '闪亮柚': 'portfolio-signage-shinyou',
      'TIDE 夏日企划': 'tide-render-front',
      '投币盒子': 'portfolio-coin-box-render'
      /* 柚见饮品 YUJIAN BEVERAGE：无对应图 → 字母兜底 */
    };

    /* 克隆节点不能带 id / tabindex：否则同页出现重复 id 与重复可聚焦元素 */
    function stripFocusable(node) {
      if (node.id) node.removeAttribute('id');
      if (node.hasAttribute('tabindex')) node.removeAttribute('tabindex');
      Array.prototype.forEach.call(node.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
      Array.prototype.forEach.call(node.querySelectorAll('[tabindex]'), function (n) { n.removeAttribute('tabindex'); });
    }

    /* 只取直接子 .ab-mq__track，避免命中嵌套节点 */
    function tracksOf(band) {
      var out = [];
      Array.prototype.forEach.call(band.children, function (child) {
        if (child.classList && child.classList.contains('ab-mq__track')) out.push(child);
      });
      return out;
    }

    /* ---------- 0) 收集原始品牌项（旧带存在时取第一条 track，避免把克隆算进来） ---------- */
    var oldBands = Array.prototype.slice.call(slots.querySelectorAll('.ab-mq'));
    var items = [];
    if (oldBands.length) {
      Array.prototype.forEach.call(oldBands, function (band) {
        var tracks = tracksOf(band);
        if (!tracks.length) return;
        Array.prototype.forEach.call(tracks[0].children, function (item) {
          if (item.classList && item.classList.contains('partners-slot-item')) items.push(item);
        });
      });
    } else {
      Array.prototype.forEach.call(slots.children, function (child) {
        if (child.classList && child.classList.contains('partners-slot-item')) items.push(child);
      });
    }
    if (!items.length) return;

    /* ---------- 1) 缩略图注入（映射命中才换图，其余保留字母） ---------- */
    var matched = 0;
    var fallback = [];
    Array.prototype.forEach.call(items, function (item) {
      var nameEl = item.querySelector('strong');
      var badge = item.querySelector('.partner-badge');
      if (!nameEl || !badge) return;

      /* data-brand 是稳定锚点：切英文/多语言时 i18n 会把 <strong> 换成译文，
         但不会改属性值；<strong> 文本仅作老 HTML 的回退。 */
      var name = (item.getAttribute('data-brand') || (nameEl.textContent || '')).trim();
      var key = THUMB_MAP[name];
      var img = badge.querySelector('img.partner-thumb');

      if (key) {
        if (!img) {
          badge.setAttribute('data-letter', (badge.textContent || '').trim());
          badge.textContent = '';
          img = document.createElement('img');
          img.className = 'partner-thumb';
          img.src = THUMB_DIR + key + '.webp';
          img.alt = '';                 /* 装饰性：品牌名已由相邻 <strong> 提供 */
          img.width = 24;
          img.height = 24;
          img.loading = 'lazy';
          img.decoding = 'async';
          badge.appendChild(img);
        }
        matched += 1;
      } else {
        if (img && img.parentNode) img.parentNode.removeChild(img);
        if (!(badge.textContent || '').trim()) {
          var letter = badge.getAttribute('data-letter');
          if (letter) badge.textContent = letter;
        }
        fallback.push(name);
      }
    });
    slots.setAttribute('data-thumb-matched', String(matched));
    slots.setAttribute('data-thumb-fallback', fallback.join('|'));

    /* ---------- 2) 幂等短路：已是 3 带 × 16 项 × 2 轨 ---------- */
    var alreadySplit = oldBands.length === BAND_COUNT && !slots.querySelector('.partners-group');
    if (alreadySplit) {
      for (var b = 0; b < oldBands.length; b += 1) {
        var bt = tracksOf(oldBands[b]);
        if (bt.length !== 2 || bt[0].children.length !== PER_BAND || bt[1].children.length !== PER_BAND) {
          alreadySplit = false;
          break;
        }
      }
    }
    if (alreadySplit) return;

    /* ---------- 3) 清理业务标题与旧带，把 48 项按原顺序归位 ---------- */
    Array.prototype.forEach.call(slots.querySelectorAll('.partners-group'), function (head) {
      if (head.parentNode) head.parentNode.removeChild(head);
    });
    Array.prototype.forEach.call(oldBands, function (band) {
      if (band.parentNode) band.parentNode.removeChild(band);
    });
    Array.prototype.forEach.call(items, function (item) { slots.appendChild(item); });

    /* ---------- 4) 每 16 项一条带：原 track + 克隆 track ---------- */
    for (var i = 0; i < BAND_COUNT; i += 1) {
      var slice = items.slice(i * PER_BAND, (i + 1) * PER_BAND);
      if (!slice.length) break;

      var band = document.createElement('div');
      band.className = 'ab-mq';
      band.setAttribute('data-band', String(i + 1));
      if (i === 1) band.setAttribute('data-dir', 'reverse'); /* 第 2 条反向 */

      var track = document.createElement('div');
      track.className = 'ab-mq__track';
      Array.prototype.forEach.call(slice, function (item) { track.appendChild(item); });

      var clone = document.createElement('div');
      clone.className = 'ab-mq__track ab-mq__track--clone';
      clone.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(track.children, function (item) {
        var copy = item.cloneNode(true);
        stripFocusable(copy);
        clone.appendChild(copy);
      });

      band.appendChild(track);
      band.appendChild(clone);
      slots.appendChild(band);
    }
  } catch (err) {}
})();
/* opt-20261105.js - §AO · 空间级 3D 景深的滚动驱动（任务 id=76）
 * ---------------------------------------------------------------------------
 * CSS 负责透视坐标系与静态 Z 层次；本段只写两个 CSS 变量：
 *   · --ao-h（写在 .hero 上）：scrollY 0→600 归一化，供首屏四层以不同速率
 *     叠加向上位移，形成层间相对运动（景深），而不是整体平移。
 *   · --ao-p（写在 #work .featured-showcase 上）：展示墙穿过视口的进度
 *     （顶部进入视口=0，底部离开视口=1），CSS 用它把整墙 rotateX 到 -6deg。
 *
 * 实现要点：
 *   · 单帧只做 1 次布局读取（展示墙的 getBoundingClientRect），首屏用 scrollY，
 *     不逐帧读其它元素；用 rAF 合并多次 scroll 事件。
 *   · .featured-showcase 由 app.js 运行时创建：findWall() 每次校验 isConnected，
 *     启动后最多 3s 内轮询补写首帧。
 *   · prefers-reduced-motion：完全不注册滚动监听、不写变量（CSS 的 calc 归零），
 *     运行中切换也会清空变量并停在静态 Z 层次。
 *   · 不触碰 transform、不改 DOM 结构、不改任何计数或文案。
 */
(function () {
  'use strict';

  var HERO_SEL = '.hero';
  var WALL_SEL = '#work .featured-showcase';
  var HERO_RANGE = 600;            /* 首屏景深滚动区间（px） */
  var hero = null;
  var wall = null;
  var frame = 0;
  var lastH = -1;
  var lastP = -1;
  var reduced = false;
  var mq = null;

  function mediaReduce() {
    try {
      return window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    } catch (e) { return null; }
  }
  function clamp01(n) { return n < 0 ? 0 : (n > 1 ? 1 : n); }
  function scrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }
  function findHero() {
    if (!hero || !hero.isConnected) hero = document.querySelector(HERO_SEL);
    return hero;
  }
  function findWall() {
    if (!wall || !wall.isConnected) wall = document.querySelector(WALL_SEL);
    return wall;
  }

  function heroProgress() { return clamp01(scrollTop() / HERO_RANGE); }

  /* 0 = 元素顶边刚进入视口底部；1 = 元素底边刚离开视口顶部 */
  function wallProgress(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!(r.height > 0) || !(vh > 0)) return 0;
    return clamp01((vh - r.top) / (vh + r.height));
  }

  function paint() {
    frame = 0;
    if (reduced) return;

    var h = heroProgress();
    if (Math.abs(h - lastH) > 0.0005) {
      var heroRoot = findHero();
      if (heroRoot) {
        heroRoot.style.setProperty('--ao-h', h.toFixed(4));
        lastH = h;
      }
    }

    var el = findWall();
    if (el) {
      var p = wallProgress(el);
      if (Math.abs(p - lastP) > 0.001) {
        el.style.setProperty('--ao-p', p.toFixed(4));
        lastP = p;
      }
    }
  }

  function request() {
    if (frame) return;
    frame = window.requestAnimationFrame
      ? window.requestAnimationFrame(paint)
      : window.setTimeout(paint, 16);
  }

  function cancel() {
    if (!frame) return;
    if (window.cancelAnimationFrame) window.cancelAnimationFrame(frame);
    else window.clearTimeout(frame);
    frame = 0;
  }

  function reset() {
    cancel();
    lastH = -1;
    lastP = -1;
    var heroRoot = findHero();
    if (heroRoot) heroRoot.style.removeProperty('--ao-h');
    var el = findWall();
    if (el) el.style.removeProperty('--ao-p');
  }

  function syncReduced() {
    reduced = !!(mq && mq.matches);
    if (reduced) reset();
    else request();
  }

  function start() {
    mq = mediaReduce();
    if (mq) {
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', syncReduced);
      else if (typeof mq.addListener === 'function') mq.addListener(syncReduced);
      reduced = mq.matches;
    }
    if (reduced) { reset(); return; }

    request();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    window.addEventListener('orientationchange', request, { passive: true });
    window.addEventListener('load', request, false);

    /* app.js 随后创建 .featured-showcase：最多轮询 30 次（约 3s）补写首帧 */
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (!findWall() && tries < 30) return;
      window.clearInterval(timer);
      request();
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

/* §AR · 2026-11-11 联系兜底、层叠滑卡、参数计数、轻视差、屏外暂停动画 */
(function () {
  'use strict';
  function reduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  function narrow() {
    try { return !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches); }
    catch (e) { return false; }
  }
  function lowPower() {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return !!(c && (c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g'));
  }

  var consultBtn = document.getElementById('mContactConsult');
  var fab = document.getElementById('consultFab');
  if (consultBtn && fab) {
    consultBtn.addEventListener('click', function () { fab.click(); });
  }
  var wechatBtn = document.getElementById('mContactWechat');
  if (wechatBtn) {
    wechatBtn.addEventListener('click', function () {
      var value = wechatBtn.getAttribute('data-copy') || '';
      var done = function () {
        var prev = '微信';
        wechatBtn.textContent = '已复制';
        window.setTimeout(function () { wechatBtn.textContent = prev; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done).catch(function () { wechatBtn.textContent = value; });
      } else {
        wechatBtn.textContent = value;
      }
    });
  }

  /* 屏外或标签页隐藏时暂停轮转，只用 animation-play-state，不改布局 */
  var pauseRoots = [];
  function applyPause(root) {
    if (!root) return;
    var hidden = document.hidden;
    var off = root.getAttribute('data-offscreen') === '1';
    var state = (hidden || off) ? 'paused' : 'running';
    var list = root.querySelectorAll('.hero-mq__track, .ab-mq__track');
    for (var i = 0; i < list.length; i++) list[i].style.animationPlayState = state;
  }
  function watchPause(selector) {
    if (!('IntersectionObserver' in window)) return;
    var nodes = document.querySelectorAll(selector);
    if (!nodes.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.setAttribute('data-offscreen', en.isIntersecting ? '0' : '1');
        applyPause(en.target);
      });
    }, { rootMargin: '120px' });
    nodes.forEach(function (n) {
      if (pauseRoots.indexOf(n) !== -1) return;
      pauseRoots.push(n);
      io.observe(n);
    });
  }
  function armPause() {
    watchPause('.ab-mq');
    watchPause('.hero-mq');
  }
  document.addEventListener('visibilitychange', function () {
    for (var i = 0; i < pauseRoots.length; i++) applyPause(pauseRoots[i]);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armPause);
  else armPause();
  window.addEventListener('load', function () { setTimeout(armPause, 1600); });

  /* 三层视差：一个滚动变量，CSS 乘不同系数。窄屏 / 省流 / 减少动效不启用。 */
  if (!reduced() && !narrow() && !lowPower()) {
    var y = 0, frame = 0;
    function paintY() {
      frame = 0;
      document.documentElement.style.setProperty('--tide-y', Math.min(y, 480) + 'px');
    }
    window.addEventListener('scroll', function () {
      y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (!frame) frame = window.requestAnimationFrame(paintY);
    }, { passive: true });
  }

  /* 案例详情：已有多示图排成层叠滑卡；数字只取页面上已经写明的参数。 */
  var modal = document.getElementById('caseModal');
  if (!modal) return;
  var SPEC = ['applicationSize', 'applicationMaterial', 'applicationProcess', 'dielineSize', 'xvDielineSize', 'statTouchpoints', 'statRoles', 'statOriginal'];
  var stackIndex = 0;
  var stackFigs = [];
  var countToken = 0;

  function figs() {
    var grid = document.getElementById('multiViewGrid');
    if (!grid) return [];
    return Array.prototype.slice.call(grid.querySelectorAll('.case-view'));
  }

  function paintStack() {
    var grid = document.getElementById('multiViewGrid');
    stackFigs = figs();
    if (!grid || stackFigs.length < 2) return;
    grid.classList.add('tide-stack');
    var ui = grid.parentNode.querySelector('.tide-stack-ui');
    if (!ui) {
      ui = document.createElement('div');
      ui.className = 'tide-stack-ui';
      ui.innerHTML = '<button type="button" data-dir="-1">上一张</button><span class="tide-stack-count" aria-live="polite"></span><button type="button" data-dir="1">下一张</button>';
      grid.insertAdjacentElement('afterend', ui);
      ui.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        var dir = Number(b.getAttribute('data-dir')) || 0;
        stackIndex = (stackIndex + dir + stackFigs.length) % stackFigs.length;
        paintStack();
      });
    }
    stackFigs.forEach(function (fig, n) {
      var d = n - stackIndex;
      if (d < 0) d += stackFigs.length;
      var depth = d > 3 ? 4 : d;
      fig.style.setProperty('--tide-d', String(depth));
      fig.classList.toggle('is-front', n === stackIndex);
      fig.toggleAttribute('hidden', d !== 0 && d > 3);
      if (n === stackIndex) fig.removeAttribute('aria-hidden');
      else fig.setAttribute('aria-hidden', 'true');
    });
    var count = ui.querySelector('.tide-stack-count');
    if (count) count.textContent = (stackIndex + 1) + ' / ' + stackFigs.length;
  }

  function parseNum(text) {
    var m = /(-?\d+(?:\.\d+)?)/.exec(text || '');
    if (!m) return null;
    return { raw: m[1], index: m.index, target: Number(m[1]), decimals: (m[1].split('.')[1] || '').length };
  }
  function formatNum(v, decimals) {
    return decimals ? v.toFixed(decimals) : String(Math.round(v));
  }
  function countSpecs() {
    if (reduced()) return;
    var token = ++countToken;
    var jobs = [];
    SPEC.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var text = el.textContent || '';
      var parsed = parseNum(text);
      if (!parsed || !isFinite(parsed.target)) return;
      jobs.push({ el: el, text: text, parsed: parsed });
    });
    if (!jobs.length) return;
    var t0 = performance.now();
    var dur = 900;
    function step(now) {
      if (token !== countToken) return;
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      jobs.forEach(function (job) {
        var val = job.parsed.target * e;
        var shown = formatNum(val, job.parsed.decimals);
        job.el.textContent = job.text.slice(0, job.parsed.index) + shown + job.text.slice(job.parsed.index + job.parsed.raw.length);
      });
      if (p < 1) requestAnimationFrame(step);
      else jobs.forEach(function (job) { job.el.textContent = job.text; });
    }
    requestAnimationFrame(step);
  }

  function onModal() {
    var open = modal.classList.contains('open') || modal.getAttribute('aria-hidden') === 'false';
    if (!open) {
      countToken++;
      stackIndex = 0;
      return;
    }
    window.setTimeout(function () {
      if (!(modal.classList.contains('open') || modal.getAttribute('aria-hidden') === 'false')) return;
      stackIndex = 0;
      paintStack();
      countSpecs();
    }, 360);
  }
  try {
    new MutationObserver(onModal).observe(modal, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
  } catch (e) {}
})();
