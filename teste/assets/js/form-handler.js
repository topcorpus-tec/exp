/* =========================================================================
   tpc32 — form-handler.js
   - Máscara de telefone BR (10/11 dígitos)
   - Validação client-side (nome, email, telefone)
   - Captura UTMs
   - POST ao Worker proxy (data-endpoint do <form>)
   - Guard anti-duplo-submit (evita 2ª gravação no AC)
   - Redirect com ?email=... usando window.SITE_CONFIG.redirect (setTimeout)
   - IntersectionObserver para [data-reveal]
   - Conversão 1:1: um blocker (stopPropagation) impede o submit DOM de chegar
     ao auto-listener "Envio de formulário" do GTM; um relay despacha um submit
     DOM sintético (__gtmRelay) que o GTM processa nativamente (gtm.formSubmit),
     + push lead_submit_success — SÓ quando o Worker confirma ok:true.
     Padrão herdado da cap-gg-v1 (tpc31). Ver docs/tpc32-gtm-conversao.md.

   Carregar com defer no final do <body>.
   ========================================================================= */
(function () {
  "use strict";

  var MESSAGES = {
    invalidName:  "Digite seu primeiro nome.",
    invalidEmail: "Digite um e-mail válido.",
    invalidPhone: "Digite um WhatsApp válido com DDD.",
    submitting:   "Enviando…",
    success:      "Quase lá, falta apenas um passo!",
    redirecting:  "Quase lá! Você será redirecionada em {s}s…",
    error:        "Não foi possível concluir sua inscrição. Tente novamente.",
    network:      "Sem conexão. Verifique sua internet e tente novamente."
  };
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---- Reveal ---- */
  (function initReveal() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---- Máscara phone ---- */
  function maskPhone(value) {
    var digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2)  return digits.length ? "(" + digits : "";
    if (digits.length <= 6)  return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    if (digits.length <= 10) return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
    return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
  }
  document.querySelectorAll('[data-mask="phone"]').forEach(function (input) {
    input.addEventListener("input", function () {
      var atEnd = input.selectionStart === input.value.length;
      input.value = maskPhone(input.value);
      if (atEnd) input.setSelectionRange(input.value.length, input.value.length);
    });
  });

  /* ---- Helpers ---- */
  function sanitize(v) { return String(v == null ? "" : v).trim().slice(0, 200); }

  function setFieldError(input, message) {
    var errorEl = document.getElementById(input.getAttribute("aria-describedby") || "");
    if (message) {
      if (input.dataset.placeholderOriginal == null) {
        input.dataset.placeholderOriginal = input.placeholder || "";
      }
      input.setAttribute("aria-invalid", "true");
      input.placeholder = message;
      input.value = "";
      if (errorEl) errorEl.textContent = message;
    } else {
      input.setAttribute("aria-invalid", "false");
      if (input.dataset.placeholderOriginal != null) {
        input.placeholder = input.dataset.placeholderOriginal;
        delete input.dataset.placeholderOriginal;
      }
      if (errorEl) errorEl.textContent = "";
    }
  }

  function setStatus(statusEl, type, message) {
    if (!statusEl) return;
    statusEl.className = "form-status" + (type ? " form-status--" + type : "");
    statusEl.textContent = message || "";
    statusEl.setAttribute("role", type === "error" ? "alert" : "status");
  }

  function setSubmitting(btn, isSubmitting, originalLabel) {
    if (!btn) return;
    btn.disabled = isSubmitting;
    btn.setAttribute("aria-busy", isSubmitting ? "true" : "false");
    btn.textContent = isSubmitting ? MESSAGES.submitting : originalLabel;
  }

  function readUtms() {
    try {
      var p = new URLSearchParams(window.location.search);
      var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
      var out = {};
      keys.forEach(function (k) { var v = p.get(k); if (v) out[k] = v.slice(0, 120); });
      return out;
    } catch (_) { return {}; }
  }

  function getSiteConfig() {
    return (window.SITE_CONFIG && typeof window.SITE_CONFIG === "object")
      ? window.SITE_CONFIG
      : { key: "dev", gtm_id: "", redirect: "" };
  }

  function genTransactionId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
    } catch (_) {}
    return "txn-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  // Opt-in do seletor de país (intl-tel-input): retorna a instância guardada
  // em input.__iti quando o form tem data-intl-phone. Null caso contrário —
  // preservando o comportamento BR das páginas que não usam o seletor.
  function getIntlPhone(form) {
    // Atributo booleano: presente (mesmo sem valor) ativa o modo internacional.
    if (!form.hasAttribute("data-intl-phone")) return null;
    var input = form.querySelector('[name="phone"]');
    var iti = input && input.__iti;
    return (iti && typeof iti.getNumber === "function") ? iti : null;
  }

  function buildPayload(form) {
    var data = new FormData(form);
    var cfg = getSiteConfig();
    // Com seletor de país, grava o número em formato E.164 (ex.: +5511987654321).
    var iti = getIntlPhone(form);
    var e164 = iti ? iti.getNumber() : "";
    var payload = {
      campaign:          sanitize(form.dataset.campaign || ""),
      first_name:        sanitize(data.get("first_name")),
      email:             sanitize(data.get("email")),
      phone:             e164 ? sanitize(e164) : sanitize(data.get("phone")),
      landing_source:    "tpc32",
      landing_version:   sanitize(form.dataset.version || ""),
      landing_subdomain: cfg.key,
      landing_url:       window.location.href.slice(0, 500),
      phase:             sanitize(form.dataset.phase || ""),
      form_id:           sanitize(form.id || ""),
      transaction_id:    genTransactionId()
    };
    var utms = readUtms();
    for (var k in utms) payload[k] = utms[k];
    return payload;
  }

  async function submitToProxy(endpoint, payload) {
    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 12000);
    try {
      var res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
        credentials: "omit",
        mode: "cors",
        cache: "no-store"
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || data.ok === false) throw new Error(data.error || ("HTTP " + res.status));
      return data;
    } finally { clearTimeout(to); }
  }

  // Navegação após o envio: mostra contagem regressiva no status ("… em 2s…",
  // "… em 1s…") e navega ao zerar. O delay dá tempo dos confetes
  // e da request de conversão do GTM (disparada pelo relay fireGtmRelay).
  function navigateAfterCountdown(url, statusEl, seconds) {
    if (!url) return;
    var left = typeof seconds === "number" ? seconds : 2;
    function tick() {
      if (left <= 0) { window.location.assign(url); return; }
      setStatus(statusEl, "success", MESSAGES.redirecting.replace("{s}", left));
      if (statusEl) statusEl.classList.add("form-status--redirecting");
      left--;
      setTimeout(tick, 1000);
    }
    tick();
  }

  /* ---- Confetes (canvas vanilla, sem dep) ---- */
  function fireConfetti(targetEl) {
    var host = targetEl || document.body;
    if (!host || typeof document.createElement !== "function") return;

    var rect = host.getBoundingClientRect();
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    if (!ctx) { canvas.remove(); return; }

    var colors = ["#7b2cbf", "#a855f7", "#c084fc", "#FFCC6F", "#FCE0A5", "#22c55e", "#ffffff"];
    var originX = Math.max(0, Math.min(window.innerWidth, rect.left + rect.width / 2));
    var originY = Math.max(0, Math.min(window.innerHeight, rect.top + rect.height / 2));

    var particles = [];
    var COUNT = 160;
    for (var i = 0; i < COUNT; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 6 + Math.random() * 10;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }

    var start = performance.now();
    var DURATION = 1800;

    function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.vy += 0.28;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life = Math.max(0, 1 - t / DURATION);

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (t < DURATION) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(frame);
  }

  function buildRedirectUrl(base, email, name) {
    if (!base) return "";
    var params = "email=" + encodeURIComponent(email || "");
    if (name) params += "&nome=" + encodeURIComponent(name);
    try {
      var u = new URL(base);
      u.searchParams.set("email", email);
      if (name) u.searchParams.set("nome", name);
      return u.toString();
    } catch (_) {
      // Base relativa/inválida — concatena de forma defensiva
      var sep = base.indexOf("?") === -1 ? "?" : "&";
      return base + sep + params;
    }
  }

  /* ---- Relay GTM: conversão 1:1 com lead salvo ----
     O gtm.js atual IGNORA pushes manuais de eventos "gtm.*" no dataLayer
     (validado em produção em 2026-07-10): o gatilho "Envio de formulário" só
     dispara pelo auto-listener que o GTM instala no document. Por isso o
     relay re-emite um evento DOM submit SINTÉTICO marcado com __gtmRelay:
     o handler principal e o blocker o deixam passar, e o auto-listener do
     GTM o processa como submit normal (gerando gtm.formSubmit com
     gtm.triggers). Eventos sintéticos (isTrusted=false) não acionam a
     submissão nativa do browser — não há navegação nem reenvio real.
     O acionador do gestor filtra por form_id (gtm.elementId) = "hero-form". */
  function fireGtmRelay(form, transactionId) {
    if (window.__LEAD_RELAY_FIRED) return;   // máx. 1 relay por carregamento
    window.__LEAD_RELAY_FIRED = true;
    try {
      var ev;
      try {
        ev = new SubmitEvent("submit", { bubbles: true, cancelable: true });
      } catch (_) {
        ev = new Event("submit", { bubbles: true, cancelable: true });
      }
      ev.__gtmRelay = true;
      form.dispatchEvent(ev);
      // Evento para futuro acionador customizado com deduplicação (ver
      // "Solução recomendada" em docs/tpc32-gtm-conversao.md). Pushes de
      // eventos customizados (sem prefixo "gtm.") são processados normalmente.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "lead_submit_success",
        transaction_id: transactionId || "",
        form_id: form.id || ""
      });
    } catch (_) { /* relay nunca quebra o fluxo do form */ }
  }

  /* ---- Init forms ---- */
  function initForm(form) {
    var endpoint = form.dataset.endpoint || "";
    var statusEl = form.querySelector("[data-form-status]");
    var submitEl = form.querySelector("[data-form-submit]");
    var submitLabel = submitEl ? submitEl.textContent : "";

    form.addEventListener("submit", async function (event) {
      if (event.__gtmRelay) return;   // submit sintético do relay: só o GTM deve processá-lo
      event.preventDefault();
      if (form.dataset.submitted === "1") return;   // guard anti-duplo-submit (evita 2ª conversão)
      form.querySelectorAll('[aria-invalid="true"]').forEach(function (el) { setFieldError(el, ""); });
      setStatus(statusEl, null, "");

      var payload = buildPayload(form);
      var errors = {};
      if (!payload.first_name || payload.first_name.length < 2) errors.first_name = MESSAGES.invalidName;
      if (!RE_EMAIL.test(payload.email))                         errors.email      = MESSAGES.invalidEmail;
      var iti = getIntlPhone(form);
      if (iti) {
        // Validação por país da biblioteca (comprimento + prefixo do DDI).
        // Só bloqueia quando explicitamente inválido; se a lib ainda não estiver
        // pronta (null), deixa passar — o worker faz a validação final.
        if (iti.isValidNumber() === false)                       errors.phone      = MESSAGES.invalidPhone;
      } else {
        var phoneDigits = (payload.phone.match(/\d/g) || []).length;
        if (phoneDigits !== 10 && phoneDigits !== 11)            errors.phone      = MESSAGES.invalidPhone;
      }

      if (Object.keys(errors).length) {
        for (var name in errors) {
          var input = form.querySelector('[name="' + name + '"]');
          if (input) setFieldError(input, errors[name]);
        }
        var first = form.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        return;
      }

      var cfg = getSiteConfig();
      var redirectUrl = cfg.redirect ? buildRedirectUrl(cfg.redirect, payload.email, payload.first_name) : "";

      // Segundos de contagem antes de sair para o checkout. Padrão 2, como
      // sempre foi; data-redirect-delay="0" no <form> manda ir direto, sem
      // mostrar a contagem. Por formulário, para não mexer nas outras páginas.
      var redirectDelay = 2;
      var rawDelay = form.getAttribute("data-redirect-delay");
      if (rawDelay !== null) {
        var parsedDelay = parseInt(rawDelay, 10);
        if (!isNaN(parsedDelay) && parsedDelay >= 0) redirectDelay = parsedDelay;
      }

      var heroEl = document.querySelector(".hero, .brb") || form;

      // Modo preview: sem endpoint configurado (dev local).
      if (!endpoint) {
        console.warn("[tpc32] data-endpoint ausente — modo preview.");
        form.dataset.submitted = "1";
        setStatus(statusEl, "success", MESSAGES.success);
        form.reset();
        fireConfetti(heroEl);
        if (redirectUrl) navigateAfterCountdown(redirectUrl, statusEl, redirectDelay);
        return;
      }

      setSubmitting(submitEl, true, submitLabel);
      try {
        await submitToProxy(endpoint, payload);
        form.dataset.submitted = "1";
        fireGtmRelay(form, payload.transaction_id);
        setStatus(statusEl, "success", MESSAGES.success);
        form.reset();
        fireConfetti(heroEl);
        if (redirectUrl) navigateAfterCountdown(redirectUrl, statusEl, redirectDelay);
      } catch (err) {
        var isNet = err.name === "AbortError" || (err.message && err.message.indexOf("Failed to fetch") >= 0);
        setStatus(statusEl, "error", isNet ? MESSAGES.network : MESSAGES.error);
      } finally {
        setSubmitting(submitEl, false, submitLabel);
      }
    });

    // Blocker: impede o evento submit de subir até o document, onde o
    // auto-listener "Envio de formulário" do GTM escuta (fase bubble).
    // Registrado DEPOIS do handler principal no mesmo alvo/fase → ordem FIFO,
    // o handler roda normalmente; stopPropagation (não Immediate) não afeta
    // listeners deste mesmo nó. Incondicional de propósito: silencia o GTM
    // também nas tentativas pós-sucesso (submitted="1") e nas inválidas.
    form.addEventListener("submit", function (event) {
      if (event.__gtmRelay) return;  // deixa o submit sintético do relay subir até o GTM
      event.stopPropagation();
    }, false);

    form.addEventListener("input", function (event) {
      var t = event.target;
      if (t && t.matches && t.matches('[aria-invalid="true"]')) setFieldError(t, "");
    });
  }

  document.querySelectorAll("[data-ac-form]").forEach(initForm);

  /* ---- Tab title flicker ---- */
  (function () {
    var originalTitle = document.title;
    document.addEventListener("visibilitychange", function () {
      document.title = document.hidden ? "Volte aqui!" : originalTitle;
    });
  })();
})();
