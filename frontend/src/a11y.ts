// Global accessibility layer for the many inline-styled controls across the
// screens. React doesn't expose handlers in the DOM, so this works from the
// rendered DOM instead:
//  - clickable non-semantic elements (detected by their `cursor: pointer`
//    inline style) get role="button", tabindex=0 and Enter/Space activation;
//  - form fields without a label fall back to their placeholder/title;
//  - symbol-only buttons (✕ ‹ + ...) get a name;
//  - modal overlays / bottom sheets become dialogs with a focus trap, and
//    focus returns to the opener when they close.
const NATIVE = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'SUMMARY', 'OPTION']);
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DIALOG = '.kb-modal-overlay, .bottom-sheet';
const SYMBOL_NAMES: Record<string, string> = {
  '✕': 'Close', '×': 'Close', '✖': 'Close', 'x': 'Close', 'X': 'Close',
  '‹': 'Back', '←': 'Back', '<': 'Back', '›': 'Next', '→': 'Next', '>': 'Next',
  '+': 'Add', '−': 'Remove', '-': 'Remove',
};

function enhanceClickable(el: HTMLElement) {
  if (NATIVE.has(el.tagName) || el.hasAttribute('role') || el.hasAttribute('tabindex')) return;
  if (el.closest('button, a') || el.matches(DIALOG)) return;
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
}

function labelField(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || el.labels?.length) return;
  const name = el.getAttribute('placeholder') || el.title || (el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase());
  if (name) el.setAttribute('aria-label', name);
}

function nameButton(el: HTMLElement) {
  if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || el.title) return;
  const text = (el.textContent ?? '').trim();
  if (SYMBOL_NAMES[text]) el.setAttribute('aria-label', SYMBOL_NAMES[text]);
}

function markDialog(el: HTMLElement) {
  if (el.getAttribute('role') === 'dialog') { if (!el.hasAttribute('tabindex')) el.tabIndex = -1; return; }
  if (el.hasAttribute('role')) return;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
    const heading = el.querySelector('h1, h2, h3');
    const t = (heading?.textContent ?? '').trim();
    el.setAttribute('aria-label', t || 'Dialog');
  }
  el.tabIndex = -1;
}

function topDialog(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(DIALOG);
  return all.length ? all[all.length - 1] : null;
}

function scan(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[style*="cursor: pointer"], [style*="cursor:pointer"]').forEach(enhanceClickable);
  root.querySelectorAll<HTMLInputElement>('input, textarea, select').forEach(labelField);
  root.querySelectorAll<HTMLElement>('button').forEach(nameButton);
  root.querySelectorAll<HTMLElement>(DIALOG).forEach(markDialog);
}

export function initA11y() {
  scan(document);

  let opener: HTMLElement | null = null;
  let hadDialog = false;
  let queued = false;
  const onMutate = () => {
    scan(document);
    const dlg = topDialog();
    if (dlg && !hadDialog) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // Focus the dialog container itself (not a field) so a mobile keyboard
      // doesn't pop open; Tab then moves to the first control inside.
      dlg.focus({ preventScroll: true });
    } else if (!dlg && hadDialog) {
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
      opener = null;
    }
    hadDialog = !!dlg;
  };
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; onMutate(); });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

  document.addEventListener('keydown', e => {
    const el = e.target;
    // Enter / Space activates role="button" elements.
    if ((e.key === 'Enter' || e.key === ' ') && el instanceof HTMLElement
        && el.getAttribute('role') === 'button' && !NATIVE.has(el.tagName)) {
      e.preventDefault();
      el.click();
      return;
    }
    // Keep Tab inside the open dialog.
    if (e.key === 'Tab') {
      const dlg = topDialog();
      if (!dlg) return;
      const items = Array.from(dlg.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(n => n.offsetParent !== null);
      if (!items.length) { e.preventDefault(); dlg.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (!dlg.contains(active) || active === dlg) {
        e.preventDefault(); (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    }
  });
}
