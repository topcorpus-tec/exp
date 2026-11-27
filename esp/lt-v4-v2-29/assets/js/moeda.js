/* =========================================================================
   moeda.js — preço aproximado na moeda local (desde 27/11/2026)

   Pedido do Emilio: quem visita do México vê o preço em pesos, e não em
   dólar; o time roda também Espanha, Peru, Argentina, Chile e Colômbia.
   Os EUA (e qualquer outro país) seguem em dólar, como sempre.

   A oferta continua em dólar na Hotmart, que converte no checkout com o
   câmbio dela. Por isso a página só mostra um valor APROXIMADO, com a
   nota "el monto final aparece al pagar" e o preço base em dólar logo
   abaixo do preço. Preço fixo e exato em moeda local só existe com uma
   oferta cadastrada naquela moeda na Hotmart.

     1. País: /cdn-cgi/trace, da própria Cloudflare que serve o site
        (linha loc=XX). Para testar: ?pais=MX na URL.
     2. Câmbio do dia:
          - MXN e EUR: Banco Central Europeu (api.frankfurter.dev), a fonte
            mais próxima da Hotmart: em 27/11/2026 o checkout convertia o
            dólar para real a 5,5248 e o BCE dava 5,4984 (0,5% abaixo);
            por isso esses dois levam +0,5%.
          - COP, CLP, PEN, ARS (o BCE não publica): currency-api no
            jsDelivr; reserva: open.er-api.com.
        Guardado por 12 h no navegador (localStorage), quando disponível.
     3. Troca na tela todo "US$ 19.90" (texto corrido) e os pares
        símbolo/número separados (<span>US$</span>19.90 e
        <small>Por solo US$</small> 19.90).
     4. Qualquer falha (país fora da lista, VPN, fonte fora do ar, sem
        fetch): nada muda, fica tudo em dólar.

   O botão de compra não muda: segue para o mesmo sfunnel.
   ========================================================================= */
(function () {
  "use strict";

  if (!window.fetch || !window.Promise || !document.createTreeWalker) return;

  var PAISES = {
    MX: { moeda: "MXN", local: "es-MX", sim: "$",  cod: "MXN", casas: 0, passo: 1,   nome: "pesos mexicanos",   fonte: "bce" },
    ES: { moeda: "EUR", local: "es-ES", sim: "€",  cod: "",    casas: 2, passo: 0,   nome: "euros",             fonte: "bce", depois: true },
    CO: { moeda: "COP", local: "es-CO", sim: "$",  cod: "COP", casas: 0, passo: 100, nome: "pesos colombianos", fonte: "livre" },
    CL: { moeda: "CLP", local: "es-CL", sim: "$",  cod: "CLP", casas: 0, passo: 10,  nome: "pesos chilenos",    fonte: "livre" },
    PE: { moeda: "PEN", local: "es-PE", sim: "S/", cod: "",    casas: 2, passo: 0,   nome: "soles",             fonte: "livre" },
    AR: { moeda: "ARS", local: "es-AR", sim: "$",  cod: "ARS", casas: 0, passo: 10,  nome: "pesos argentinos",  fonte: "livre" }
  };
  var MARGEM_BCE = 1.005;
  var GUARDA = "tpc_cambio_usd_v1";
  var VALIDADE = 12 * 60 * 60 * 1000;

  function comPrazo(p, ms) {
    return Promise.race([p, new Promise(function (_, nao) { setTimeout(function () { nao(new Error("prazo")); }, ms); })]);
  }
  function json(url) {
    return comPrazo(fetch(url, { cache: "default" }), 4000).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }

  /* ---- 1. país ---------------------------------------------------------- */
  function pais() {
    var m = /[?&]pais=([A-Za-z]{2})\b/.exec(location.search);
    if (m) return Promise.resolve(m[1].toUpperCase());
    return comPrazo(fetch("/cdn-cgi/trace", { cache: "no-store" }), 2500)
      .then(function (r) { return r.text(); })
      .then(function (t) { var l = /^loc=([A-Z]{2})$/m.exec(t); return l ? l[1] : ""; });
  }

  /* ---- 2. câmbio -------------------------------------------------------- */
  function lerGuardado(moeda) {
    try {
      var g = JSON.parse(localStorage.getItem(GUARDA) || "{}");
      var e = g[moeda];
      if (e && Date.now() - e.em < VALIDADE && e.taxa > 0) return e.taxa;
    } catch (err) {}
    return 0;
  }
  function guardar(moeda, taxa) {
    try {
      var g = JSON.parse(localStorage.getItem(GUARDA) || "{}");
      g[moeda] = { taxa: taxa, em: Date.now() };
      localStorage.setItem(GUARDA, JSON.stringify(g));
    } catch (err) {}
  }
  function taxaLivre(moeda) {
    var m = moeda.toLowerCase();
    return json("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json")
      .then(function (d) { var t = d && d.usd && d.usd[m]; if (!(t > 0)) throw new Error("sem taxa"); return t; })
      .catch(function () {
        return json("https://open.er-api.com/v6/latest/USD").then(function (d) {
          var t = d && d.rates && d.rates[moeda]; if (!(t > 0)) throw new Error("sem taxa"); return t;
        });
      });
  }
  function taxaBce(moeda) {
    return json("https://api.frankfurter.dev/v1/latest?base=USD&symbols=" + moeda)
      .then(function (d) { var t = d && d.rates && d.rates[moeda]; if (!(t > 0)) throw new Error("sem taxa"); return t * MARGEM_BCE; })
      .catch(function () { return taxaLivre(moeda); });
  }
  function taxa(p) {
    var guardada = lerGuardado(p.moeda);
    if (guardada) return Promise.resolve(guardada);
    return (p.fonte === "bce" ? taxaBce(p.moeda) : taxaLivre(p.moeda)).then(function (t) { guardar(p.moeda, t); return t; });
  }

  /* ---- 3. troca na tela ------------------------------------------------- */
  function numero(usd, t, p) {
    var v = usd * t;
    if (p.passo) v = Math.round(v / p.passo) * p.passo;
    return new Intl.NumberFormat(p.local, { minimumFractionDigits: p.casas, maximumFractionDigits: p.casas }).format(v);
  }
  function inteiro(usd, t, p) {        // "$390 MXN", "18,14 €", "S/ 69,05"
    var n = numero(usd, t, p);
    if (p.depois) return n + " " + p.sim;
    return p.sim + (p.sim.length > 1 ? " " : "") + n + (p.cod ? " " + p.cod : "");   // o código pode descer de linha
  }
  function valorUsd(s) { return parseFloat(s.replace(/,/g, "")); }

  var RE_INLINE = /US\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;
  var RE_SIM_FIM = /US\$\s*$/;
  var RE_SO_NUM = /^\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*$/;

  function textos() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var pai = n.parentNode && n.parentNode.nodeName;
        if (pai === "SCRIPT" || pai === "STYLE" || pai === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var lista = [];
    for (var n = w.nextNode(); n; n = w.nextNode()) lista.push(n);
    return lista;
  }

  function trocar(p, t) {
    var lista = textos();
    for (var i = 0; i < lista.length; i++) {
      var n = lista[i];
      // par separado: "...US$" num nó e o número sozinho no próximo
      if (RE_SIM_FIM.test(n.nodeValue) && lista[i + 1] && RE_SO_NUM.test(lista[i + 1].nodeValue)) {
        var prox = lista[i + 1];
        var usd = valorUsd(RE_SO_NUM.exec(prox.nodeValue)[1]);
        n.nodeValue = n.nodeValue.replace(RE_SIM_FIM, p.depois ? "" : p.sim + (p.sim.length > 1 ? " " : ""));
        var antes = /^\s*/.exec(prox.nodeValue)[0];
        prox.nodeValue = antes + numero(usd, t, p) + (p.depois ? " " + p.sim : "");
        if (p.cod) {
          var c = document.createElement("small");
          c.className = "moeda-cod";
          c.textContent = " " + p.cod;
          prox.parentNode.insertBefore(c, prox.nextSibling);
        }
        i++;
        continue;
      }
      if (RE_INLINE.test(n.nodeValue)) {
        RE_INLINE.lastIndex = 0;
        n.nodeValue = n.nodeValue.replace(RE_INLINE, function (_, v) { return inteiro(valorUsd(v), t, p); });
      }
      RE_INLINE.lastIndex = 0;
    }
  }

  // A nota fica logo abaixo do preço principal de cada caixa de oferta.
  function notas(p, precosUsd) {
    var alvos = document.querySelectorAll(".v4-oferta__preco, .tp-offer__installment, .v2-preco__vista");
    for (var i = 0; i < alvos.length; i++) {
      var nota = document.createElement("p");
      nota.className = "moeda-nota";
      nota.textContent = "Valor aproximado en " + p.nome + ". El monto final aparece al pagar" +
        (precosUsd[i] ? " (precio base: US$ " + precosUsd[i] + ")." : ".");
      alvos[i].parentNode.insertBefore(nota, alvos[i].nextSibling);
    }
    var s = document.createElement("style");
    s.textContent =
      ".moeda-nota{margin:.35em auto .6em;max-width:34ch;font-size:.8125rem;line-height:1.4;opacity:.78;text-align:center}" +
      ".moeda-cod{font-size:.42em;font-weight:700;letter-spacing:.02em;vertical-align:baseline}" +
      ".tp-offer__installment .moeda-cod,.v2-preco__vista .moeda-cod{font-size:.5em}" +
      /* v2: os valores riscados da lista não quebravam linha; com "$127.200 COP" a coluna
         alargava e empurrava o cartão para fora da tela no celular. */
      "html[data-moeda] .tp-offer__items li .v2-item__de{white-space:normal;text-align:right;line-height:1.25;max-width:7em}" +
      "html[data-moeda] .tp-offer__items li>span{min-width:0}";
    document.head.appendChild(s);
  }

  function precosBase() {     // o número em dólar de cada preço principal, antes da troca
    var alvos = document.querySelectorAll(".v4-oferta__preco, .tp-offer__installment, .v2-preco__vista");
    var r = [];
    for (var i = 0; i < alvos.length; i++) {
      var m = /(\d+(?:\.\d{1,2})?)/.exec(alvos[i].textContent);
      r.push(m ? m[1] : "");
    }
    return r;
  }

  /* Em moedas de número longo ("$70.300 COP") o preço grande pode passar
     da caixa no celular: diminui a fonte do preço, aos poucos, só até
     caber. Refeito quando a tela muda de tamanho. */
  var GRANDES = ".v4-oferta__preco, .tp-offer__installment, .v2-preco__parcela, .v2-preco__vista";
  /* Passa da conta quando o texto vaza da própria caixa OU quando o cartão
     em volta estica além da tela (no cartão em grade, o número longo
     alarga a coluna em vez de vazar). */
  function passa(el) {
    if (el.scrollWidth > el.clientWidth + 1) return true;
    var vw = document.documentElement.clientWidth;
    for (var a = el, k = 0; a && a !== document.body && k < 6; a = a.parentElement, k++) {
      if (a.getBoundingClientRect().right > vw + 1) return true;
    }
    return false;
  }
  function caber() {
    var els = document.querySelectorAll(GRANDES);
    for (var i = 0; i < els.length; i++) els[i].style.fontSize = "";
    for (var j = 0; j < els.length; j++) {
      var el = els[j], k = 0;
      var fs = parseFloat(getComputedStyle(el).fontSize);
      while (passa(el) && k++ < 16) {
        fs *= 0.93;
        el.style.fontSize = fs + "px";
      }
    }
  }
  function vigiarTamanho() {
    var pedido = 0;
    window.addEventListener("resize", function () {
      if (pedido) return;
      pedido = requestAnimationFrame(function () { pedido = 0; caber(); });
    });
  }

  function iniciar() {
    pais().then(function (cod) {
      var p = PAISES[cod];
      if (!p) return;
      return taxa(p).then(function (t) {
        var base = precosBase();
        trocar(p, t);
        notas(p, base);
        document.documentElement.setAttribute("data-moeda", p.moeda);
        caber();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(caber);
        vigiarTamanho();
      });
    }).catch(function () { /* fica em dólar */ });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
