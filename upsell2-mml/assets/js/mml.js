/* =========================================================================
   Método Mãos Lucrativas — downsell do upsell — mml.js

   Página de funil: a compra não sai daqui. Quem gera os botões de aceitar
   e recusar desta etapa é a Hotmart, e o HTML dela entra no bloco #funil.
   Por isso não existe CHECKOUT_URL neste arquivo — os botões da página são
   âncoras que levam até esse bloco.

   O que roda aqui:
     - entrada com desfoque           ([data-reveal])
     - rolagem suave até o #funil     (os CTAs)
     - aviso no console enquanto o HTML da Hotmart não estiver colado

   Atenção: no taping o observer do [data-reveal] mora no form-handler.js,
   que esta página não carrega. Sem ele o CSS deixaria tudo em opacity:0 —
   por isso o observer está aqui.

   Carregar com defer.
   ========================================================================= */
(function () {
  "use strict";

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
      els.forEach(function (el) { el.classList.add("is-revealed", "is-settled"); });
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
     ROLAGEM ATÉ O FUNIL

     Os CTAs são âncoras para #funil e funcionariam sozinhos. O handler
     existe só para suavizar o salto, e respeita quem pediu menos
     movimento no sistema.
     ======================================================================= */
  function initAnchors() {
    var suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    [].slice.call(document.querySelectorAll('a[href^="#"]')).forEach(function (a) {
      a.addEventListener("click", function (ev) {
        var alvo = document.querySelector(a.getAttribute("href"));
        if (!alvo) return;
        ev.preventDefault();
        alvo.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
      });
    });
  }

  /* =======================================================================
     AVISO DO ENCAIXE VAZIO

     Enquanto o espaço reservado continuar no #funil, o HTML da Hotmart não
     foi colado — e a página não vende. O aviso é para quem estiver
     revisando não publicar sem perceber.
     ======================================================================= */
  function avisarFunilVazio() {
    var funil = document.querySelector("#funil");
    if (!funil || !funil.querySelector(".mml-ph")) return;
    if (window.console && console.warn) {
      console.warn(
        "[mml] O bloco #funil ainda está com o espaço reservado: o HTML do " +
        "funil da Hotmart não foi colado. Os botões da página só rolam até ele."
      );
    }
  }

  /* =======================================================================
     BOOT
     ======================================================================= */
  function boot() {
    initReveal();
    initAnchors();
    avisarFunilVazio();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
