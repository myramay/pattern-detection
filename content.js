(function () {
  'use strict';

  // ─── Pattern Labels ──────────────────────────────────────────────────────
  const PATTERN = {
    COUNTDOWN:     'Fake Countdown Timer',
    SCARCITY:      'False Scarcity',
    HIDDEN_UNSUB:  'Hidden Unsubscribe',
    PRECHECKED:    'Pre-checked Box',
    CONFIRM_SHAME: 'Confirm-shaming',
  };

  const counts = Object.fromEntries(Object.values(PATTERN).map(v => [v, 0]));
  const flagged = new WeakSet();

  // ─── Flag Element ────────────────────────────────────────────────────────
  function flag(el, patternType) {
    if (!el || flagged.has(el)) return;
    flagged.add(el);
    counts[patternType]++;
    el.classList.add('dpd-highlight');
    el.dataset.dpdPattern = patternType;
  }

  // ─── Floating Tooltip ────────────────────────────────────────────────────
  function initTooltip() {
    // Use shadow DOM to isolate from page styles
    const host = document.createElement('div');
    host.id = 'dpd-tooltip-host';
    Object.assign(host.style, { all: 'initial', position: 'fixed', zIndex: '2147483647' });
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'closed' });
    const tip = document.createElement('div');
    Object.assign(tip.style, {
      position:      'fixed',
      zIndex:        '2147483647',
      background:    '#111',
      color:         '#FFD700',
      border:        '1px solid #FFD700',
      padding:       '4px 10px',
      borderRadius:  '4px',
      fontSize:      '12px',
      fontFamily:    'system-ui, sans-serif',
      fontWeight:    '500',
      lineHeight:    '1.5',
      whiteSpace:    'nowrap',
      pointerEvents: 'none',
      display:       'none',
      boxShadow:     '0 2px 8px rgba(0,0,0,0.7)',
    });
    shadow.appendChild(tip);

    document.addEventListener('mouseover', e => {
      const el = e.target?.closest?.('.dpd-highlight');
      if (el) {
        tip.textContent = '\u26A0 ' + el.dataset.dpdPattern;
        tip.style.display = 'block';
      } else {
        tip.style.display = 'none';
      }
    }, true);

    document.addEventListener('mousemove', e => {
      if (tip.style.display === 'none') return;
      const x = e.clientX + 14;
      const y = e.clientY - 34;
      const tipW = tip.offsetWidth || 200;
      tip.style.left = Math.min(x, window.innerWidth - tipW - 8) + 'px';
      tip.style.top  = Math.max(y, 4) + 'px';
    }, true);
  }

  // ─── Text Node Scanner ───────────────────────────────────────────────────
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'SVG']);

  function scanText(root, patterns, patternType) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (SKIP_TAGS.has(node.parentElement?.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (!text) continue;
      const parent = node.parentElement;
      if (!parent || flagged.has(parent)) continue;
      for (const re of patterns) {
        if (re.test(text)) { flag(parent, patternType); break; }
      }
    }
  }

  // ─── 1. Fake Countdown Timers ────────────────────────────────────────────
  const COUNTDOWN_TEXT = [
    /\bexpires?\s+in\b/i,
    /\boffer\s+ends?\b/i,
    /\bends?\s+in\s+\d/i,
    /\btime\s+(left|remaining)\b/i,
    /\bhurry[^a-z]/i,
    /\blimited[\s-]time\s+offer\b/i,
    /\btoday\s+only\b/i,
    /\bsale\s+ends?\b/i,
    /\b\d{1,2}h\s*\d{1,2}m(\s*\d{1,2}s)?\b/,
    /\b\d{1,2}:\d{2}(:\d{2})?\b/,
    /\bflash\s+sale\b/i,
    /\bdeal\s+expires?\b/i,
  ];

  function detectCountdowns(root) {
    // Elements whose class/id names suggest a timer
    root.querySelectorAll(
      '[class*="countdown" i],[id*="countdown" i],' +
      '[class*="timer" i],[id*="timer" i],' +
      '[class*="time-left" i],[id*="time-left" i]'
    ).forEach(el => {
      if (el.textContent.trim()) flag(el, PATTERN.COUNTDOWN);
    });
    scanText(root, COUNTDOWN_TEXT, PATTERN.COUNTDOWN);
  }

  // ─── 2. False Scarcity ───────────────────────────────────────────────────
  const SCARCITY_TEXT = [
    /\bonly\s+\d+\s+(left|remaining)\b/i,
    /\b\d+\s+left\s+in\s+stock\b/i,
    /\blow\s+stock\b/i,
    /\bnearly\s+(sold\s+out|gone)\b/i,
    /\balmost\s+sold\s+out\b/i,
    /\bselling\s+fast\b/i,
    /\b\d+\s+sold\s+(in\s+)?(the\s+)?(last|past)\b/i,
    /\b\d+\s+people\s+(are\s+)?(viewing|watching|looking\s+at\s+this)\b/i,
    /\bhigh\s+demand\b/i,
    /\blast\s+(one|item|few\s+items?|chance)\b/i,
    /\b\d+\s+in\s+(cart|basket)s?\b/i,
    /\bgoing\s+fast\b/i,
    /\bonly\s+a\s+few\s+left\b/i,
  ];

  function detectScarcity(root) {
    scanText(root, SCARCITY_TEXT, PATTERN.SCARCITY);
  }

  // ─── 3. Hidden Unsubscribe ───────────────────────────────────────────────
  const UNSUB_TEXT_RE = /\b(unsubscribe|opt[\s-]?out|manage\s+(preferences?|subscriptions?)|remove\s+me\s+from|email\s+preferences?)\b/i;
  const UNSUB_HREF_RE = /unsubscribe|optout|opt-out|email-pref/i;

  function detectHiddenUnsub(root) {
    root.querySelectorAll('a').forEach(el => {
      const matchesHref = UNSUB_HREF_RE.test(el.href || '');
      const matchesText = UNSUB_TEXT_RE.test(el.textContent);
      if (!matchesHref && !matchesText) return;

      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      const opacity  = parseFloat(style.opacity);

      // Tiny font or near-invisible
      if (fontSize < 11 || opacity < 0.4) {
        flag(el, PATTERN.HIDDEN_UNSUB);
        return;
      }
      // Visually buried (inside a footer or small-print container)
      if (isInSmallPrint(el)) {
        flag(el, PATTERN.HIDDEN_UNSUB);
      }
    });
  }

  function isInSmallPrint(el) {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const tag = node.tagName.toLowerCase();
      const cls = (typeof node.className === 'string' ? node.className : '').toLowerCase();
      const id  = (node.id || '').toLowerCase();
      if (
        tag === 'footer' ||
        /footer|small[\s-]?print|fine[\s-]?print|legal|disclaimer|footnote/.test(cls + id)
      ) return true;
      if (parseFloat(window.getComputedStyle(node).fontSize) < 11) return true;
      node = node.parentElement;
    }
    return false;
  }

  // ─── 4. Pre-checked Boxes ────────────────────────────────────────────────
  const MARKETING_RE = /\b(newsletter|marketing|offers?|deals?|promotions?|third[\s-]part|partners?|subscribe|email\s+(me|updates?)|special\s+offers?|commercial\s+communications?|advertis)\b/i;

  function detectPrechecked(root) {
    root.querySelectorAll('input[type="checkbox"]:checked').forEach(el => {
      const label = getCheckboxLabel(el);
      if (MARKETING_RE.test(label)) flag(el, PATTERN.PRECHECKED);
    });
  }

  function getCheckboxLabel(input) {
    // 1. <label for="id">
    if (input.id) {
      try {
        const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (lbl) return lbl.textContent;
      } catch (_) { /* CSS.escape failure */ }
    }
    // 2. Wrapping <label>
    const wrap = input.closest('label');
    if (wrap) return wrap.textContent;
    // 3. aria-label / aria-labelledby
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    const lblId = input.getAttribute('aria-labelledby');
    if (lblId) {
      const lbl = document.getElementById(lblId);
      if (lbl) return lbl.textContent;
    }
    // 4. Adjacent sibling text
    const next = input.nextElementSibling;
    return next ? next.textContent : '';
  }

  // ─── 5. Confirm-shaming ──────────────────────────────────────────────────
  const SHAME_PATTERNS = [
    /no[,\s]+thanks?[,.]\s*i\s+don'?t\s+want\b/i,
    /i\s+(hate|don'?t\s+(want|like)|prefer\s+not\s+to)\s+\w.{2,50}(saving|discount|money|deal|offer|free|safe|secure)/i,
    /no[,\s]+i\s+(don'?t|prefer\s+not|decline|hate)\b/i,
    /decline\s+and\s+(lose|miss|pay\s+full)/i,
    /i\s+already\s+(have\s+enough|know\s+everything)/i,
    /no[,\s]+thanks?[,.]\s*i('ll)?\s+(pay\s+full|miss\s+out|stay\s+broke)/i,
    /i\s+don'?t\s+want\s+(to\s+)?(save|improve|get\s+\w+|receive|learn|access|be\s+(safe|secure|protected))\b/i,
    /keep\s+(paying\s+more|missing\s+out|losing\s+money)\b/i,
    /no[,\s]+thanks?[,.]\s*i\s+prefer\s+to\s+pay\s+more\b/i,
  ];

  function detectConfirmShaming(root) {
    root.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]').forEach(el => {
      const text = el.textContent.trim() || el.value || '';
      for (const re of SHAME_PATTERNS) {
        if (re.test(text)) { flag(el, PATTERN.CONFIRM_SHAME); break; }
      }
    });
  }

  // ─── Run All Detectors ───────────────────────────────────────────────────
  function runAll(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    detectCountdowns(root);
    detectScarcity(root);
    detectHiddenUnsub(root);
    detectPrechecked(root);
    detectConfirmShaming(root);
  }

  // ─── MutationObserver ────────────────────────────────────────────────────
  function observe() {
    const mo = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(n => runAll(n));
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ─── Message Handler (popup communication) ───────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.action === 'getCounts') {
      reply({ counts });
      return true;
    }
  });

  // ─── Init ────────────────────────────────────────────────────────────────
  function init() {
    initTooltip();
    runAll(document.body);
    observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
