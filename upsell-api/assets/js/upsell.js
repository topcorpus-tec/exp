/* =========================================================================
   Método Mãos Lucrativas — /upsell-api/ — upsell.js

   O que roda aqui:

     - destino dos botões de compra   ([data-checkout])
     - botão do suporte               ([data-whats])
     - esteira de prints              ([data-esteira])
     - FAQ, abrir uma fecha as demais

   Carregar com defer.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     DESTINO DA COMPRA

     É o mesmo href que está em todos os nove botões da página de origem.

     ATENÇÃO: "link-pagina" tem cara de placeholder que ficou no ar — o
     domínio evento.topcorpus.com.br é real, o caminho é que parece não ter
     sido trocado pela URL do checkout. Copiei como está, que é o que foi
     pedido; trocar aqui muda os nove botões de uma vez.
     ======================================================================= */
  var CHECKOUT_URL = "https://evento.topcorpus.com.br/link-pagina";

  /* Suporte — o número e o texto vieram dos dois botões de WhatsApp de lá. */
  var WHATS_URL = "https://api.whatsapp.com/send/?phone=5512936182269&text=" +
                  encodeURIComponent("Olá! Quero tirar uma dúvida sobre o Método Mãos Lucrativas");

  function avisa(msg) {
    if (window.console && console.warn) console.warn("[upsell-api] " + msg);
  }

  /* =======================================================================
     BOTÕES
     ======================================================================= */
  function initLinks(seletor, url, rotulo) {
    var els = [].slice.call(document.querySelectorAll(seletor));
    if (!els.length) return;

    if (!url) {
      els.forEach(function (a) {
        a.removeAttribute("href");
        a.setAttribute("aria-disabled", "true");
      });
      avisa(rotulo + " está vazia: " + els.length + " botão(ões) sem destino.");
      return;
    }

    els.forEach(function (a) {
      a.href = url;
      a.removeAttribute("aria-disabled");
    });
  }

  function initCheckout() {
    initLinks("[data-checkout]", CHECKOUT_URL, "CHECKOUT_URL");
    if (!CHECKOUT_URL) return;

    // O evento sai antes da navegação, para a campanha contar o clique
    // mesmo quando a próxima página demora a carregar.
    [].slice.call(document.querySelectorAll("[data-checkout]")).forEach(function (a) {
      a.addEventListener("click", function () {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "clique_checkout",
          pagina: "upsell-api",
          rotulo: (a.textContent || "").trim()
        });
      });
    });
  }

  function initWhats() {
    initLinks("[data-whats]", WHATS_URL, "WHATS_URL");
    if (!WHATS_URL) return;
    [].slice.call(document.querySelectorAll("[data-whats]")).forEach(function (a) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
  }

  /* =======================================================================
     ESTEIRA DE PRINTS

     O CSS desliza a faixa em -50%. Para que -50% caia exatamente onde o
     laço começou, a faixa precisa ter a lista duas vezes — a cópia é feita
     aqui e não no HTML para não repetir sete <img> no documento e não
     deixar imagens duplicadas na árvore de acessibilidade.
     ======================================================================= */
  function initEsteira() {
    var caixas = [].slice.call(document.querySelectorAll("[data-esteira]"));
    caixas.forEach(function (caixa) {
      var faixa = caixa.querySelector(".dw-esteira__faixa");
      if (!faixa || faixa.dataset.duplicada === "1") return;

      var originais = [].slice.call(faixa.children);
      originais.forEach(function (li) {
        var copia = li.cloneNode(true);
        copia.setAttribute("aria-hidden", "true");
        var img = copia.querySelector("img");
        if (img) img.setAttribute("alt", "");
        faixa.appendChild(copia);
      });
      faixa.dataset.duplicada = "1";
    });
  }

  /* =======================================================================
     FAQ — abrir uma pergunta fecha as demais
     ======================================================================= */
  function initFaq() {
    var items = [].slice.call(document.querySelectorAll(".dw-faq__item"));
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        items.forEach(function (o) { if (o !== item) o.open = false; });
      });
    });
  }

  /* =======================================================================
     BOOT
     ======================================================================= */
  function boot() {
    initCheckout();
    initWhats();
    initEsteira();
    initFaq();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
