/* =========================================================================
   Manual Ilustrado — manual.js

   Por que não reusar o taping.js: ele carrega coisas que são do produto
   dele — a URL de checkout do curso, um deadline vencido e as janelas
   agendadas do boleto e do bônus 2. Este arquivo repete só o que esta
   página usa:

     - destino dos CTAs              ([data-checkout])
     - entrada com desfoque          ([data-reveal])
     - FAQ, abrir uma fecha as demais (.tp-faq__item)

   O contador de oferta e o botão flutuante saíram na revisão de 25/09 —
   por isso o código dos dois também saiu, em vez de ficar procurando
   elementos que não existem mais.

   Atenção: no taping o observer do [data-reveal] mora no form-handler.js,
   que esta página não carrega (não tem formulário). Sem ele o CSS deixaria
   tudo em opacity:0 — por isso o observer está aqui.

   Carregar com defer.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     DESTINO DA COMPRA

     O doc traz três ofertas do mesmo produto na Hotmart, uma por página:

         ?off=u7qj2mgv  → R$97
         ?off=q86wzvlt  → R$67
         ?off=9z1ywsjs  → R$27   ← esta página

     Esta é a página do ticket de 27, cuja dobra 4 fecha em "por apenas 27
     reais, ou 9x de R$3,39". As dobras 4.1 e 4.2 do doc são as ancoragens
     das outras duas páginas; o que muda entre elas é a dobra 4 e esta
     constante.

     Vazio aqui deixa todos os CTAs inertes de propósito (ver initCheckout).
     ======================================================================= */
  var CHECKOUT_URL = "https://pay.hotmart.com/W95360090D?off=9z1ywsjs";

  /* =======================================================================
     DESTINO DOS CTAs
     ======================================================================= */
  function initCheckout() {
    var links = [].slice.call(document.querySelectorAll("[data-checkout]"));
    if (!links.length) return;

    if (!CHECKOUT_URL) {
      links.forEach(function (a) {
        a.setAttribute("aria-disabled", "true");
        a.addEventListener("click", function (ev) { ev.preventDefault(); });
      });
      if (window.console && console.warn) {
        console.warn(
          "[manual] CHECKOUT_URL vazio: " + links.length +
          " CTA(s) inertes. Preencher em assets/js/manual.js."
        );
      }
      return;
    }

    links.forEach(function (a) {
      a.setAttribute("href", CHECKOUT_URL);
      a.removeAttribute("aria-disabled");
    });
  }

  /* =======================================================================
     ENTRADA COM DESFOQUE

     O CSS deixa [data-reveal] em opacity:0 até a classe .is-revealed. O
     .is-settled, depois, tira o filtro de cena para não manter uma camada
     de composição viva em cada elemento revelado.
     ======================================================================= */
  var SETTLE_MS = 1100;   // 760ms de transição + 180ms de escalonamento + folga

  function initReveal() {
    var els = [].slice.call(document.querySelectorAll("[data-reveal]"));
    if (!els.length) return;

    function settle(el) {
      if (el.__settle) return;
      el.__settle = setTimeout(function () { el.classList.add("is-settled"); }, SETTLE_MS);
    }

    // Navegador sem IntersectionObserver: mostra tudo de uma vez, sem animar.
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-revealed", "is-settled");
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-revealed");
        settle(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    els.forEach(function (el) { io.observe(el); });
  }

  /* =======================================================================
     FAQ — abrir uma pergunta fecha as demais
     ======================================================================= */
  function initFaq() {
    var items = [].slice.call(document.querySelectorAll(".tp-faq__item"));
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        items.forEach(function (other) { if (other !== item) other.open = false; });
      });
    });
  }

  /* =======================================================================
     BOOT
     ======================================================================= */
  function boot() {
    initCheckout();
    initReveal();
    initFaq();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
