/* =========================================================================
   tpc32 — gtm-loader.js
   Injeta o snippet do GTM (head + noscript) a partir de window.SITE_CONFIG,
   definido por env-config.js (gerado no build de cada projeto CF Pages).
   SEM condicional de domínio: a identidade vem fixada do deploy.
   Guards anti-duplicação preservados do detector de host anterior (removido).

   Carregar SÍNCRONO no <head>, imediatamente APÓS env-config.js e ANTES de
   qualquer outro script.
   ========================================================================= */
(function () {
  "use strict";

  var cfg = (window.SITE_CONFIG && typeof window.SITE_CONFIG === "object")
    ? window.SITE_CONFIG
    : { key: "dev", gtm_id: "", redirect: "" };

  window.SITE_CONFIG = cfg;
  window.dataLayer = window.dataLayer || [];

  if (!cfg.gtm_id) return;

  // Detecção defensiva: se já houver um container carregado, aborta (evita dobra).
  if (window.__GTM_INJECTED || (window.google_tag_manager && Object.keys(window.google_tag_manager).length)) {
    return;
  }
  window.__GTM_INJECTED = true;

  // ---- GTM <head>: script principal (snippet padrão do Google) ----
  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var f = d.getElementsByTagName(s)[0];
    var j = d.createElement(s);
    var dl = l !== "dataLayer" ? "&l=" + l : "";
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, "script", "dataLayer", cfg.gtm_id);

  // ---- GTM <body>: noscript com iframe (fallback sem JS) ----
  function injectGtmNoscript() {
    if (window.__GTM_NS_INJECTED) return;
    if (!document.body) return;
    try {
      var ns = document.createElement("noscript");
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.googletagmanager.com/ns.html?id=" + cfg.gtm_id;
      iframe.height = "0";
      iframe.width = "0";
      iframe.style.display = "none";
      iframe.style.visibility = "hidden";
      ns.appendChild(iframe);
      document.body.insertBefore(ns, document.body.firstChild);
      window.__GTM_NS_INJECTED = true;
    } catch (e) { /* nunca quebra a página */ }
  }

  if (document.body) {
    injectGtmNoscript();
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectGtmNoscript, { once: true });
  } else {
    setTimeout(injectGtmNoscript, 0);
  }
})();
