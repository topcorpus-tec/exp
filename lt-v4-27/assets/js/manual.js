/* =========================================================================
   Manual Ilustrado — manual.js (lt-v4)

   A mesma base da lt-v2 (destino da compra, parada das âncoras da oferta e
   FAQ), com uma peça nova da v4: as linhas que ligam cada dor ao seu ponto
   no corpo, na dobra 2. O carrossel de depoimentos da v2 não vem: aqui os
   depoimentos são prints em grade.

     - destino do CTA da oferta      ([data-checkout])
     - parada das âncoras da oferta   (a[href="#oferta"])
     - FAQ, abrir uma fecha as demais (.v4-faq__item)
     - linhas do mapa das dores       ([data-mapa])
     - etiquetas do mapa no celular   ([data-dor], [data-pino])

   Carregar com defer.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     DESTINO DA COMPRA

     PENDENTE: o funil do SF desta versão.

     Desde 15/10/2026 as páginas de 27 passam pelo funil do SF
     (sf.topcorpus.com.br), cada versão com o seu sfunnel, para separar as
     vendas de cada uma: a lt-v1-27-sf usa o 30, a lt-v2-27 o 31 e a
     lt-v3-27 o 46. A v4 precisa de um sfunnel novo, criado no SF, que
     redirecione para a oferta de R$27 da Hotmart (off=9z1ywsjs).

     Enquanto ele não existir, a constante fica vazia e o botão da oferta
     fica inerte de propósito (ver initCheckout): mandar direto para a
     Hotmart misturaria as vendas da v4 com as da lt-v1-27, que usa a mesma
     oferta. Quando o número chegar:

         var CHECKOUT_URL = "https://sf.topcorpus.com.br/sf/?sfunnel=NN";
     ======================================================================= */
  var CHECKOUT_URL = "";

  /* =======================================================================
     DESTINO DO CTA DA OFERTA

     Só o botão do cartão da oferta (dobra 9) sai da página. Os outros
     quatro (hero, dobra 3, dobra 7 e dobra 8) são âncoras para #oferta, como
     o doc pede: quem clica ali ainda não viu o preço.
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
     PARADA DAS ÂNCORAS DA OFERTA

     Sem JS os botões param no topo da dobra da oferta, e o botão de compra
     fica bem abaixo, fora da tela em qualquer celular. Aqui a rolagem desce
     até o pé do cartão da oferta ficar no pé da tela, com uma folga: o
     preço e o botão aparecem inteiros. Se a tela for alta o bastante para
     caber a dobra inteira, ela para no topo da dobra, como sem JS.
     ======================================================================= */
  function topoNaPagina(el) {
    var y = 0;
    for (; el; el = el.offsetParent) y += el.offsetTop;
    return y;
  }

  function alvoDaOferta() {
    var dobra = document.getElementById("oferta");
    var caixa = document.querySelector("#oferta .v4-oferta__card");
    if (!dobra || !caixa) return null;

    var folga = 24;
    var topoDobra = topoNaPagina(dobra);
    var peCaixa = topoNaPagina(caixa) + caixa.offsetHeight;
    return Math.max(topoDobra, peCaixa + folga - window.innerHeight);
  }

  function initAncoras() {
    [].slice.call(document.querySelectorAll('a[href="#oferta"]')).forEach(function (a) {
      a.addEventListener("click", function (e) {
        var y = alvoDaOferta();
        if (y === null) return;
        e.preventDefault();
        var calmo = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: y, behavior: calmo ? "auto" : "smooth" });
        if (history.replaceState) history.replaceState(null, "", "#oferta");
      });
    });
  }

  /* =======================================================================
     FAQ — abrir uma pergunta fecha as demais
     ======================================================================= */
  function initFaq() {
    var items = [].slice.call(document.querySelectorAll(".v4-faq__item"));
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        items.forEach(function (other) { if (other !== item) other.open = false; });
      });
    });
  }

  /* =======================================================================
     LINHAS DO MAPA DAS DORES

     No desktop (900px ou mais) cada dor fica de um lado da figura, e uma
     linha pontilhada sai do lado de dentro do título até o ponto da dor no
     corpo. As linhas são refeitas quando a tela muda de tamanho e quando a
     figura e as fontes terminam de carregar, porque tudo isso move os
     itens. No celular o SVG some (CSS) e a ligação é pelo número.
     ======================================================================= */
  function initMapa() {
    var mapa = document.querySelector("[data-mapa]");
    var svg = document.querySelector("[data-mapa-linhas]");
    if (!mapa || !svg || !window.matchMedia) return;

    var largo = matchMedia("(min-width: 900px)");
    var NS = "http://www.w3.org/2000/svg";
    var pedido = 0;

    function desenha() {
      pedido = 0;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (!largo.matches) return;

      var base = mapa.getBoundingClientRect();

      [].slice.call(mapa.querySelectorAll("[data-dor]")).forEach(function (item) {
        var pino = mapa.querySelector('[data-pino="' + item.getAttribute("data-dor") + '"]');
        var titulo = item.querySelector(".v4-dor__titulo");
        if (!pino || !titulo) return;

        var t = titulo.getBoundingClientRect();
        var p = pino.getBoundingClientRect();
        var esq = item.classList.contains("v4-dor--esq");

        var sx = (esq ? t.right + 12 : t.left - 12) - base.left;
        var sy = t.top + Math.min(t.height, 26) / 2 - base.top;
        var px = p.left + p.width / 2 - base.left;
        var py = p.top + p.height / 2 - base.top;
        var meio = sx + (px - sx) * 0.55;

        var linha = document.createElementNS(NS, "path");
        linha.setAttribute("d",
          "M" + sx + " " + sy +
          " C" + meio + " " + sy + " " + meio + " " + py + " " + px + " " + py);
        svg.appendChild(linha);

        var ponta = document.createElementNS(NS, "circle");
        ponta.setAttribute("cx", sx);
        ponta.setAttribute("cy", sy);
        ponta.setAttribute("r", 3);
        svg.appendChild(ponta);
      });
    }

    function agenda() {
      if (!pedido) pedido = requestAnimationFrame(desenha);
    }

    window.addEventListener("resize", agenda);
    if (largo.addEventListener) largo.addEventListener("change", agenda);

    var img = mapa.querySelector("img");
    if (img && !img.complete) img.addEventListener("load", agenda);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(agenda);

    agenda();
  }

  /* =======================================================================
     ETIQUETAS DO MAPA NO CELULAR

     Abaixo de 900px cada dor é uma etiqueta ao lado do seu ponto, com o
     texto fechado. Um toque no título ou no ponto abre o texto daquela dor
     e fecha o das outras; um toque de novo, ou fora do mapa, fecha. No
     desktop não há o que abrir (título e texto ficam sempre à vista), então
     o clique é ignorado e, se a tela crescer com uma aberta, ela fecha.
     ======================================================================= */
  function initDores() {
    var mapa = document.querySelector("[data-mapa]");
    if (!mapa || !window.matchMedia) return;

    var largo = matchMedia("(min-width: 900px)");
    var itens = [].slice.call(mapa.querySelectorAll("[data-dor]"));

    function marca(item, aberto) {
      item.classList.toggle("is-aberta", aberto);
      var btn = item.querySelector(".v4-dor__btn");
      if (btn) btn.setAttribute("aria-expanded", aberto ? "true" : "false");
      var pino = mapa.querySelector('[data-pino="' + item.getAttribute("data-dor") + '"]');
      if (pino) pino.classList.toggle("is-ativo", aberto);
    }

    function alterna(item) {
      if (largo.matches) return;
      var abrir = !item.classList.contains("is-aberta");
      itens.forEach(function (outro) { marca(outro, outro === item && abrir); });
    }

    itens.forEach(function (item) {
      var btn = item.querySelector(".v4-dor__btn");
      if (btn) btn.addEventListener("click", function () { alterna(item); });
    });

    [].slice.call(mapa.querySelectorAll("[data-pino]")).forEach(function (pino) {
      pino.addEventListener("click", function () {
        var item = mapa.querySelector('[data-dor="' + pino.getAttribute("data-pino") + '"]');
        if (item) alterna(item);
      });
    });

    document.addEventListener("click", function (e) {
      if (!mapa.contains(e.target)) itens.forEach(function (item) { marca(item, false); });
    });

    if (largo.addEventListener) {
      largo.addEventListener("change", function () {
        if (largo.matches) itens.forEach(function (item) { marca(item, false); });
      });
    }
  }

  /* =======================================================================
     BOOT
     ======================================================================= */
  function boot() {
    initCheckout();
    initAncoras();
    initFaq();
    initMapa();
    initDores();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
