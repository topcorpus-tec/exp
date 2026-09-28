/* =========================================================================
   Confirmação de compra — confirmacao.js

   Página de obrigado do Manual Ilustrado. Não há checkout aqui: a compra
   já aconteceu. O que roda:

     - link de download do e-book   (um lugar só para trocar a URL)
     - entrada com desfoque         ([data-reveal])
     - sanfona do FAQ               (uma pergunta aberta por vez)

   Atenção: no taping o observer do [data-reveal] mora no form-handler.js,
   que esta página não carrega. Sem ele o CSS deixaria tudo em opacity:0 —
   por isso o observer está aqui.

   Carregar com defer.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     DOWNLOAD DO E-BOOK

     PENDÊNCIA: a URL do arquivo ainda não existe. É o único lugar da
     página que precisa ser editado quando ela existir — todos os botões de
     download apontam para cá através do [data-ebook].

     Enquanto estiver vazia, o botão fica visivelmente desativado e a nota
     de pendência aparece: uma página de obrigado com o botão principal
     morto é pior do que uma que assume que ainda falta alguma coisa.
     ======================================================================= */
  var EBOOK_URL = "";

  function initDownload() {
    var botoes = [].slice.call(document.querySelectorAll("[data-ebook]"));
    var notas  = [].slice.call(document.querySelectorAll("[data-ebook-todo]"));
    if (!botoes.length) return;

    if (EBOOK_URL) {
      botoes.forEach(function (a) {
        a.href = EBOOK_URL;
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
      // Com o link no ar a nota não tem mais o que avisar.
      notas.forEach(function (n) { n.hidden = true; });
      return;
    }

    botoes.forEach(function (a) {
      a.classList.add("is-pending");
      a.setAttribute("aria-disabled", "true");
      // href="#" saltaria para o topo e daria a impressão de que algo
      // aconteceu; sem destino o clique não faz nada.
      a.removeAttribute("href");
    });
    notas.forEach(function (n) { n.hidden = false; });

    if (window.console && console.warn) {
      console.warn(
        "[confirmacao] EBOOK_URL está vazia em assets/js/confirmacao.js: o " +
        "botão de download não leva a lugar nenhum."
      );
    }
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
     FAQ

     Os <details> funcionam sozinhos; isto só fecha os outros quando um
     abre, para a lista não crescer sem parar.
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
    initDownload();
    initReveal();
    initFaq();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
