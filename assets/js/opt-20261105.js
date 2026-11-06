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
