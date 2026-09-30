/* =========================================================================
   Método Mãos Lucrativas — página de venda — venda.js

   O que roda aqui:

     - destino do checkout          (um lugar só para editar)
     - formulário de inscrição      ([data-vaga])
     - máscara do telefone          ([data-mascara-tel])
     - contador da condição         ([data-contador])
     - botão do suporte             ([data-whats])
     - entrada com desfoque         ([data-reveal])
     - FAQ, abrir uma fecha as demais

   Atenção: no taping o observer do [data-reveal] mora no form-handler.js,
   que esta página não carrega. Sem ele o CSS deixaria tudo em opacity:0 —
   por isso o observer está aqui.

   Carregar com defer.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     DESTINO DA COMPRA

     PENDÊNCIA: a página de origem não leva ao checkout por link. Ela
     guarda o lead e a própria plataforma encaminha depois, então não há
     URL de checkout no HTML de lá para copiar.

     Enquanto isto estiver vazio o formulário valida, avisa que está sem
     destino e não finge que enviou — é melhor que engolir o lead em
     silêncio.
     ======================================================================= */
  var CHECKOUT_URL = "";

  /* =======================================================================
     DESTINO DO LEAD

     A página de origem posta para o ActiveCampaign da TopCorpus. Estes são
     o endereço e os campos escondidos que estavam lá:

         https://topcorpus.activehosted.com/proc.php
         u=80  f=80  c=0  m=0  act=sub  v=2
         or=ab35fb52ef6a45571ec8594bc0f4bc82

     Não liguei por conta própria: enviar para um CRM em produção é uma
     ação que sai daqui e não volta, e um campo errado faz o lead sumir sem
     erro nenhum. Preencher LEAD_URL abaixo liga o envio; depois disso vale
     mandar um lead de teste e conferir se ele chegou na lista certa.
     ======================================================================= */
  var LEAD_URL = "";
  var LEAD_CAMPOS = {
    u: "80", f: "80", c: "0", m: "0", act: "sub", v: "2",
    or: "ab35fb52ef6a45571ec8594bc0f4bc82"
  };

  /* =======================================================================
     SUPORTE

     PENDÊNCIA: o número não veio na página de origem.
     Formato: "https://wa.me/55DDDNUMERO".
     ======================================================================= */
  var WHATS_URL = "";

  /* Minutos que a condição dura por visita. O prazo é gravado no navegador
     na primeira visita e respeitado nas seguintes: reiniciar a cada
     recarga transformaria o contador numa peça de cenário, e quem recarrega
     uma vez percebe. */
  var MINUTOS_OFERTA = 15;
  var CHAVE_PRAZO = "mml-v1:fim-da-oferta";

  function avisa(msg) {
    if (window.console && console.warn) console.warn("[mml-v1] " + msg);
  }

  /* =======================================================================
     MÁSCARA DO TELEFONE

     Só dígitos, no formato (11) 91234-5678. A máscara é aplicada enquanto
     a pessoa digita, mas o que vai no envio é o número limpo — formato é
     assunto da tela, não do destino.
     ======================================================================= */
  function soDigitos(v) { return (v || "").replace(/\D/g, ""); }

  function formataTel(v) {
    var d = soDigitos(v).slice(0, 11);
    if (d.length <= 2)  return d.length ? "(" + d : "";
    if (d.length <= 6)  return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  function initMascara() {
    var campos = [].slice.call(document.querySelectorAll("[data-mascara-tel]"));
    campos.forEach(function (el) {
      el.addEventListener("input", function () {
        var antes = el.value;
        var depois = formataTel(antes);
        if (antes !== depois) el.value = depois;
      });
    });
  }

  /* =======================================================================
     FORMULÁRIO

     Validação própria, não a do navegador: a mensagem nativa aparece numa
     bolha que some sozinha e não é lida por todo leitor de tela. Aqui cada
     erro vira texto ao lado do campo, ligado a ele por aria-describedby.
     ======================================================================= */
  function ehEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());
  }

  function mostraErro(campo, alvoId, msg) {
    var p = campo.querySelector('[data-erro-de="' + alvoId + '"]');
    if (!p) return;
    p.textContent = msg;
    p.hidden = false;
    p.id = p.id || "erro-" + alvoId;
    var input = campo.querySelector("input");
    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", p.id);
    }
  }

  function limpaErro(campo, alvoId) {
    var p = campo.querySelector('[data-erro-de="' + alvoId + '"]');
    if (p) { p.hidden = true; p.textContent = ""; }
    var input = campo.querySelector("input");
    if (input) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  function initForm() {
    var form = document.querySelector("[data-vaga]");
    if (!form) return;

    var nome   = form.querySelector("#vd-nome");
    var email  = form.querySelector("#vd-email");
    var tel    = form.querySelector("#vd-tel");
    var aceite = form.querySelector('input[name="aceite"]');
    var botao  = form.querySelector('button[type="submit"]');

    function campoDe(el) { return el.closest(".vd-campo") || el.closest(".vd-aceite"); }

    [nome, email, tel].forEach(function (el) {
      el.addEventListener("input", function () { limpaErro(campoDe(el), el.id); });
    });
    aceite.addEventListener("change", function () { limpaErro(campoDe(aceite), "aceite"); });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();

      var problemas = [];

      if (nome.value.trim().length < 2) {
        mostraErro(campoDe(nome), nome.id, "Escreva o seu primeiro nome.");
        problemas.push(nome);
      } else { limpaErro(campoDe(nome), nome.id); }

      if (!ehEmail(email.value)) {
        mostraErro(campoDe(email), email.id, "Confira o e-mail: parece que falta algo.");
        problemas.push(email);
      } else { limpaErro(campoDe(email), email.id); }

      var tels = soDigitos(tel.value);
      if (tels.length < 10) {
        mostraErro(campoDe(tel), tel.id, "O WhatsApp precisa do DDD e do número completo.");
        problemas.push(tel);
      } else { limpaErro(campoDe(tel), tel.id); }

      if (!aceite.checked) {
        mostraErro(campoDe(aceite), "aceite", "Precisamos do seu aceite para continuar.");
        problemas.push(aceite);
      } else { limpaErro(campoDe(aceite), "aceite"); }

      if (problemas.length) { problemas[0].focus(); return; }

      var lead = {
        nome: nome.value.trim(),
        email: email.value.trim(),
        telefone: tels
      };

      // O GTM já está na página; o evento sai independente do resto, para
      // a campanha ver o lead mesmo antes do CRM estar ligado.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "lead_formulario",
        pagina: "mml-v1",
        lead_email: lead.email
      });

      botao.setAttribute("aria-busy", "true");

      enviaLead(lead).then(function () {
        if (CHECKOUT_URL) {
          window.location.href = CHECKOUT_URL;
          return;
        }
        botao.removeAttribute("aria-busy");
        avisa("CHECKOUT_URL está vazia: o formulário validou mas não tem para onde mandar. Preencher em assets/js/venda.js.");
      });
    });
  }

  function enviaLead(lead) {
    if (!LEAD_URL) {
      avisa("LEAD_URL está vazia: o lead não foi enviado para lugar nenhum. " +
            "O endereço e os campos do ActiveCampaign estão anotados no topo deste arquivo.");
      return Promise.resolve();
    }
    var dados = new FormData();
    Object.keys(LEAD_CAMPOS).forEach(function (k) { dados.append(k, LEAD_CAMPOS[k]); });
    dados.append("fullname", lead.nome);
    dados.append("email", lead.email);
    dados.append("phone", lead.telefone);

    // no-cors porque o proc.php não devolve CORS: não dá para ler a
    // resposta, só para saber que a requisição saiu. Por isso o .catch
    // segue em frente — travar a compra por causa do CRM seria pior.
    return fetch(LEAD_URL, { method: "POST", body: dados, mode: "no-cors" })
      .catch(function () { avisa("o envio do lead falhou; seguindo para o checkout."); });
  }

  /* =======================================================================
     CONTADOR
     ======================================================================= */
  function initContador() {
    var caixa = document.querySelector("[data-contador]");
    if (!caixa) return;

    var elMin = caixa.querySelector("[data-min]");
    var elSeg = caixa.querySelector("[data-seg]");

    var fim;
    try { fim = parseInt(sessionStorage.getItem(CHAVE_PRAZO), 10); } catch (e) { fim = NaN; }
    if (!fim || isNaN(fim) || fim < Date.now()) {
      fim = Date.now() + MINUTOS_OFERTA * 60 * 1000;
      try { sessionStorage.setItem(CHAVE_PRAZO, String(fim)); } catch (e) { /* aba anônima */ }
    }

    caixa.hidden = false;

    function tique() {
      var resta = Math.max(0, fim - Date.now());
      var total = Math.floor(resta / 1000);
      elMin.textContent = String(Math.floor(total / 60)).padStart(2, "0");
      elSeg.textContent = String(total % 60).padStart(2, "0");
      if (resta <= 0) { clearInterval(id); return; }
    }

    tique();
    var id = setInterval(tique, 1000);
  }

  /* =======================================================================
     SUPORTE
     ======================================================================= */
  function initWhats() {
    var botoes = [].slice.call(document.querySelectorAll("[data-whats]"));
    if (!botoes.length) return;

    if (WHATS_URL) {
      botoes.forEach(function (a) {
        a.href = WHATS_URL;
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        a.removeAttribute("aria-disabled");
      });
      return;
    }
    botoes.forEach(function (a) {
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
    });
    avisa("WHATS_URL está vazia: o botão do suporte não leva a lugar nenhum.");
  }

  /* =======================================================================
     ENTRADA COM DESFOQUE
     ======================================================================= */
  var SETTLE_MS = 1100;

  function initReveal() {
    var els = [].slice.call(document.querySelectorAll("[data-reveal]"));
    if (!els.length) return;

    function settle(el) {
      if (el.__settle) return;
      el.__settle = setTimeout(function () { el.classList.add("is-settled"); }, SETTLE_MS);
    }

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
     FAQ — abrir uma pergunta fecha as demais
     ======================================================================= */
  function initFaq() {
    var items = [].slice.call(document.querySelectorAll(".tp-faq__item"));
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
    initMascara();
    initForm();
    initContador();
    initWhats();
    initReveal();
    initFaq();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
