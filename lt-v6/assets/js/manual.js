/* =========================================================================
   Manual Ilustrado — manual.js (lt-v6)

   Veio da lt-v4-v2 (a mesma da lt-v4-27) pela lt-v5. O que a v6 mudou:
   um destino de compra por pacote (CHECKOUTS), o popup do Premium por
   R$ 37 (initPopup) e a parada das âncoras nos pacotes.

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

     Desde 29/10/2026 o botão da oferta passa pelo funil do SF
     (sf.topcorpus.com.br), no sfunnel 119, o da v4. A lt-v4-27 e a
     lt-v4-v2 usam o mesmo, então as vendas das duas cores da v4 caem
     juntas no funil, separadas das outras páginas de 27 (lt-v1-27-sf 30,
     lt-v2-27 31, lt-v3-27 46). Para separar as duas cores, é criar um
     segundo sfunnel no SF e trocar a linha abaixo em uma delas.

     Antes (27 a 29/10/2026) o botão ia direto para a Hotmart, com o link
     da lt-v1-27. O 119 redireciona para a mesma oferta, já com o
     &checkoutMode=10: pay.hotmart.com/W95360090D?off=9z1ywsjs
     &checkoutMode=10&xcod=0&external_code=0 (conferido em 29/10/2026).
     ======================================================================= */
  /* lt-v6 (23/11/2026): a oferta virou pacotes, e cada botão de compra
     diz o seu pacote em data-checkout="<chave>". As três chaves:

       basico         Pacote Básico, R$ 27 (botão do Básico e o "Não" do popup)
       premium        Pacote Premium, R$ 47
       premium-popup  o Premium com R$ 10 de desconto, R$ 37 (o "Sim" do popup)

     PENDENTE: as três ofertas ainda não existem. Vazio, o botão fica inerte
     (não sai da página) e o console avisa. Não usar o sfunnel 119 aqui: ele
     vende o Manual com todos os bônus por R$ 27, que não é nenhum dos três. */
  var CHECKOUTS = {
    "basico":        "",
    "premium":       "",
    "premium-popup": ""
  };

  /* =======================================================================
     DESTINO DOS BOTÕES DE COMPRA

     Só os botões dos pacotes (dobra 9) e os do popup saem da página. O da
     dobra 11 é âncora para #oferta, como o doc pede.
     ======================================================================= */
  function initCheckout() {
    var links = [].slice.call(document.querySelectorAll("[data-checkout]"));
    var vazios = [];

    links.forEach(function (a) {
      var chave = a.getAttribute("data-checkout");
      var url = CHECKOUTS[chave];
      if (url) {
        a.setAttribute("href", url);
        a.removeAttribute("aria-disabled");
        return;
      }
      a.setAttribute("aria-disabled", "true");
      a.addEventListener("click", function (ev) {
        /* O botão do Básico abre o popup antes; quem decide o que fazer com
           esse clique é o initPopup. */
        if (!a.hasAttribute("data-popup")) ev.preventDefault();
      });
      if (vazios.indexOf(chave) < 0) vazios.push(chave);
    });

    if (vazios.length && window.console && console.warn) {
      console.warn(
        "[manual] checkout vazio para: " + vazios.join(", ") +
        ". Esses botões ficam inertes. Preencher CHECKOUTS em assets/js/manual.js."
      );
    }
  }

  /* =======================================================================
     POPUP DO PREMIUM

     O botão do Básico ([data-popup="<id do dialog>"]) abre o popup em vez
     de ir para a compra, a cada clique, como na referência
     (paiseprofessores.com.br/musicograma-FV3-lp2): o Básico só se compra
     pelo "Não" do popup. Fechado sem escolher (X, Esc ou clique fora da
     caixa), a pessoa volta aos pacotes.

     Sem <dialog> (navegador antigo) o clique segue o link normalmente.
     Cada passo vai para o dataLayer, para medir no GTM quantos abrem o
     popup e quantos aceitam: popup_premium_aberto, popup_premium_sim,
     popup_premium_nao e popup_premium_fechado.
     ======================================================================= */
  function evento(nome) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: nome });
  }

  function initPopup() {
    [].slice.call(document.querySelectorAll("[data-popup]")).forEach(function (botao) {
      var popup = document.getElementById(botao.getAttribute("data-popup"));
      if (!popup || typeof popup.showModal !== "function") return;

      var escolheu = false;

      botao.addEventListener("click", function (e) {
        e.preventDefault();
        escolheu = false;
        popup.showModal();
        evento("popup_premium_aberto");
      });

      [].slice.call(popup.querySelectorAll("[data-evento]")).forEach(function (a) {
        a.addEventListener("click", function () {
          escolheu = true;
          evento(a.getAttribute("data-evento"));
        });
      });

      [].slice.call(popup.querySelectorAll("[data-fechar]")).forEach(function (x) {
        x.addEventListener("click", function () { popup.close(); });
      });

      /* Clique no fundo escuro: o alvo é o próprio <dialog>, fora da caixa. */
      popup.addEventListener("click", function (e) {
        if (e.target !== popup) return;
        var r = popup.getBoundingClientRect();
        var dentro = e.clientX >= r.left && e.clientX <= r.right &&
                     e.clientY >= r.top && e.clientY <= r.bottom;
        if (!dentro) popup.close();
      });

      popup.addEventListener("close", function () {
        if (!escolheu) evento("popup_premium_fechado");
      });
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

  /* Os botões que trazem para a oferta levam ao Premium, o melhor pacote
     (pedido da Fran e do Emilio, 23/11/2026):

       - celular (cards um embaixo do outro): a rolagem para no começo do
         card do Premium, com o selo "Recomendado" no alto da tela;
       - desktop (cards lado a lado): para com o pé do card do Premium no
         pé da tela, para o preço e o botão dele aparecerem, com o Básico
         ao lado. Se a dobra inteira couber, para no topo dela. */
  function alvoDaOferta() {
    var dobra = document.getElementById("oferta");
    var premium = document.querySelector("#oferta .v5p-card--premium");
    if (!dobra || !premium) return null;

    var topoPremium = topoNaPagina(premium);
    var empilhado = window.matchMedia && matchMedia("(max-width: 899px)").matches;
    if (empilhado) return Math.max(0, topoPremium - 32);

    var folga = 32;
    var topoDobra = topoNaPagina(dobra);
    var pePremium = topoPremium + premium.offsetHeight;
    return Math.max(topoDobra, pePremium + folga - window.innerHeight);
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
    initPopup();
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
