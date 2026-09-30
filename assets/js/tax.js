// Kiss-tax bookkeeping. Loaded as a classic (non-module) script in <head>
// so protected pages can redirect before anything paints.
//
// The tax lives in sessionStorage: it survives reloads within a tab,
// but a new tab / new visit has to pay again.
//
// NOTE: this is a joke gate, not security. Real privacy comes from
// Supabase auth later.

(function () {
  const KEY = 'bonny.kissTaxPaid';
  // Resolve the site root from this file's own URL so it works both
  // locally and under a GitHub Pages sub-path (/<repo>/).
  const GATE_URL = new URL('../../index.html', document.currentScript.src).href;

  function paid() {
    try { return sessionStorage.getItem(KEY) === '1'; }
    catch { return true; } // storage blocked: don't trap her in a redirect loop
  }

  window.KissTax = {
    paid,
    pay() { try { sessionStorage.setItem(KEY, '1'); } catch {} },
    clear() { try { sessionStorage.removeItem(KEY); } catch {} },
    /** Call from any protected page: bounces to the gate if unpaid. */
    require() { if (!paid()) location.replace(GATE_URL); },
    gateUrl: GATE_URL,
  };
})();
