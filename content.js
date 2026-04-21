/**
 * Did You Mean? — Content Script
 * Runs on mail.google.com. Scans Gmail compose windows for trap words
 * and flags them with an amber underline + auto-appearing tooltip.
 */

(function () {
  "use strict";

  let trapWords = [];
  let activeTooltip = null;
  let observerActive = false;

  // ─── Storage ─────────────────────────────────────────────────────────────

  function loadTrapWords() {
    chrome.storage.local.get("trapWords").then((result) => {
      trapWords = result.trapWords || [];
    });
  }

  // Listen for updates saved from the popup
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TRAP_WORDS_UPDATED") {
      trapWords = message.trapWords || [];
      // Re-scan any open compose windows
      document.querySelectorAll(".Am.Al.editable").forEach(scanCompose);
    }
  });

  // ─── Compose detection ────────────────────────────────────────────────────

  function findComposeBoxes() {
    // Gmail's compose editable div. Selector targets the contenteditable body.
    return document.querySelectorAll(
      'div.Am.Al.editable[contenteditable="true"], div[aria-label="Message Body"][contenteditable="true"]'
    );
  }

  function attachToCompose(composeEl) {
    if (composeEl.dataset.dymAttached) return;
    composeEl.dataset.dymAttached = "true";

    // Dismissed trap words for THIS compose session
    const dismissed = new Set();
    composeEl.dataset.dymDismissed = "";

    const onInput = debounce(() => {
      const dismissedSet = getDismissed(composeEl);
      scanCompose(composeEl, dismissedSet);
    }, 600);

    composeEl.addEventListener("input", onInput);

    // Initial scan after a tick (compose may still be loading)
    setTimeout(() => scanCompose(composeEl, new Set()), 300);
  }

  function getDismissed(composeEl) {
    try {
      return new Set(JSON.parse(composeEl.dataset.dymDismissed || "[]"));
    } catch {
      return new Set();
    }
  }

  function addDismissed(composeEl, typo) {
    const set = getDismissed(composeEl);
    set.add(typo.toLowerCase());
    composeEl.dataset.dymDismissed = JSON.stringify([...set]);
  }

  // ─── Scanning ─────────────────────────────────────────────────────────────

  function scanCompose(composeEl, dismissedSet) {
    if (!trapWords.length) return;
    if (!dismissedSet) dismissedSet = getDismissed(composeEl);

    // Remove all existing flags first
    clearFlags(composeEl);

    // Walk text nodes and wrap matches
    walkTextNodes(composeEl, (textNode) => {
      const text = textNode.nodeValue;
      const frag = flagText(text, dismissedSet, composeEl);
      if (frag) {
        textNode.parentNode.replaceChild(frag, textNode);
      }
    });
  }

  function flagText(text, dismissedSet, composeEl) {
    // Build a combined regex from all active (non-dismissed) trap words
    const active = trapWords.filter(
      (p) => p.typo && !dismissedSet.has(p.typo.toLowerCase())
    );
    if (!active.length) return null;

    // Escape special regex chars in each typo word
    const patterns = active.map((p) => ({
      pair: p,
      re: new RegExp(
        `(?<![\\w\\u00C0-\\u024F])(${escapeRegex(p.typo)})(?![\\w\\u00C0-\\u024F])`,
        "gi"
      ),
    }));

    // Merge into one pass using a master pattern
    const masterSource = active
      .map((p) => `(?<![\\w\\u00C0-\\u024F])(${escapeRegex(p.typo)})(?![\\w\\u00C0-\\u024F])`)
      .join("|");
    const master = new RegExp(masterSource, "gi");

    let match;
    let lastIndex = 0;
    const frag = document.createDocumentFragment();
    let hasMatch = false;

    while ((match = master.exec(text)) !== null) {
      // Find which trap word this matches
      const matched = match[0];
      const pair = active.find(
        (p) => p.typo.toLowerCase() === matched.toLowerCase()
      );
      if (!pair) continue;

      hasMatch = true;

      // Text before match
      if (match.index > lastIndex) {
        frag.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }

      // Flagged span
      const span = document.createElement("span");
      span.className = "dym-flagged";
      span.dataset.dymTypo = pair.typo;
      span.dataset.dymCorrect = pair.correct;
      span.dataset.dymOriginal = matched;
      span.textContent = matched;
      span.setAttribute("aria-label", `Did you mean "${pair.correct}"?`);

      // Auto-show tooltip on this span
      span.addEventListener("mouseenter", (e) => showTooltip(e, span, composeEl));
      span.addEventListener("focus", (e) => showTooltip(e, span, composeEl));

      // Auto-appear on insert — show tooltip after a short delay
      setTimeout(() => {
        if (document.contains(span) && !span.dataset.dymShown) {
          span.dataset.dymShown = "1";
          showTooltip(null, span, composeEl);
        }
      }, 400);

      frag.appendChild(span);
      lastIndex = match.index + matched.length;
    }

    if (!hasMatch) return null;

    // Remaining text
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    return frag;
  }

  // ─── Tooltip ──────────────────────────────────────────────────────────────

  function showTooltip(event, span, composeEl) {
    hideTooltip();

    const typo = span.dataset.dymTypo;
    const correct = span.dataset.dymCorrect;
    const original = span.dataset.dymOriginal;

    const tooltip = document.createElement("div");
    tooltip.className = "dym-tooltip";
    tooltip.setAttribute("role", "dialog");
    tooltip.setAttribute("aria-label", "Did you mean suggestion");

    // Build tooltip DOM without innerHTML to satisfy AMO security policy
    const label = document.createElement("div");
    label.className = "dym-tooltip-label";

    label.appendChild(document.createTextNode("Did you mean "));
    const strong = document.createElement("strong");
    strong.textContent = correct;
    label.appendChild(strong);
    label.appendChild(document.createTextNode("?"));

    const br = document.createElement("br");
    label.appendChild(br);

    const sub = document.createElement("span");
    sub.style.color = "#9ca3af";
    sub.style.fontSize = "10px";
    sub.textContent = `You typed "${original}"`;
    label.appendChild(sub);

    const actions = document.createElement("div");
    actions.className = "dym-tooltip-actions";

    const acceptBtn = document.createElement("button");
    acceptBtn.className = "dym-btn dym-btn-accept";
    acceptBtn.dataset.action = "accept";
    acceptBtn.textContent = `Change to "${correct}"`;

    const dismissBtn = document.createElement("button");
    dismissBtn.className = "dym-btn";
    dismissBtn.dataset.action = "dismiss";
    dismissBtn.textContent = "Keep as-is";

    actions.appendChild(acceptBtn);
    actions.appendChild(dismissBtn);
    tooltip.appendChild(label);
    tooltip.appendChild(actions);

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    // Position above the flagged span
    positionTooltip(tooltip, span);

    acceptBtn.addEventListener("click", () => {
      span.textContent = correct;
      span.className = "";
      span.removeAttribute("data-dym-typo");
      span.removeAttribute("data-dym-correct");
      span.removeAttribute("data-dym-original");
      span.removeAttribute("data-dym-shown");
      hideTooltip();
    });

    dismissBtn.addEventListener("click", () => {
      addDismissed(composeEl, typo);
      span.className = "";
      span.removeAttribute("data-dym-typo");
      span.removeAttribute("data-dym-correct");
      span.removeAttribute("data-dym-original");
      span.removeAttribute("data-dym-shown");
      hideTooltip();
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener("click", onOutsideClick, true);
    }, 50);
  }

  function positionTooltip(tooltip, anchor) {
    const rect = anchor.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();

    let top = rect.top - tipRect.height - 10 + window.scrollY;
    let left = rect.left + rect.width / 2 - tipRect.width / 2 + window.scrollX;

    // Clamp to viewport
    if (left < 8) left = 8;
    if (left + tipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tipRect.width - 8;
    }
    if (top < 8) {
      // Flip below
      top = rect.bottom + 10 + window.scrollY;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  function hideTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    document.removeEventListener("click", onOutsideClick, true);
  }

  function onOutsideClick(e) {
    if (activeTooltip && !activeTooltip.contains(e.target)) {
      hideTooltip();
    }
  }

  // ─── DOM helpers ──────────────────────────────────────────────────────────

  function clearFlags(root) {
    root.querySelectorAll(".dym-flagged").forEach((span) => {
      const text = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(text, span);
    });
    // Normalize merges adjacent text nodes
    root.normalize();
  }

  function walkTextNodes(root, callback) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Skip script, style, and already-flagged spans
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName ? parent.tagName.toLowerCase() : "";
          if (["script", "style", "noscript"].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.classList && parent.classList.contains("dym-flagged")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    // Process in reverse to avoid iterator invalidation
    nodes.reverse().forEach(callback);
  }

  // ─── MutationObserver — watch for new compose windows ────────────────────

  function startObserver() {
    if (observerActive) return;
    observerActive = true;

    const observer = new MutationObserver(() => {
      findComposeBoxes().forEach(attachToCompose);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ─── Utils ────────────────────────────────────────────────────────────────

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  loadTrapWords();
  startObserver();
  // Catch any compose boxes already open on load
  findComposeBoxes().forEach(attachToCompose);
})();
