/* ============================================================
   ZIPPA — Pixel da Meta (Facebook / Instagram) para anúncios
   ============================================================

   COMO ATIVAR
   1) Cole o ID do pixel na linha META_PIXEL_ID abaixo (só os números).
   2) Pronto — nada mais precisa ser mexido.

   Enquanto o ID estiver vazio, este arquivo NÃO carrega script algum,
   não grava cookie e não faz nenhuma requisição para o Facebook.

   LGPD (Lei 13.709/2018)
   O pixel só dispara para quem escolheu "Aceitar todos" no aviso de
   cookies. Quem escolhe "Só essenciais" navega sem rastreamento, e
   quem aceita depois passa a ser rastreado na hora, sem recarregar.

   EVENTOS ENVIADOS
   - PageView       toda página
   - ViewContent    páginas de consideração (parceiro, motorista,
                    entregador, comércio, franquias, anuncie)
   - Lead           clique em link do WhatsApp — o assunto da conversa
                    vai no nome do evento, para separar as campanhas
   - Lead           clique em Google Play / App Store, com o app no nome
   - Contact        clique em e-mail
   - SimuladorUsado evento próprio: alguém mexeu num simulador
   ============================================================ */

(function () {
  'use strict';

  var META_PIXEL_ID = '970540685551369';          // ID do pixel da Meta (só números)

  var CONSENT_COOKIE = 'zippa_cookies_consent'; // gravado pelo js/cookies.js
  var CONSENT_EVENT = 'zippa:consent';          // disparado ao clicar em "Aceitar todos"

  var PAGINAS_CONSIDERACAO = [
    'parceiro.html', 'motorista.html', 'entregador.html',
    'comercio.html', 'franquias.html', 'anuncie.html'
  ];

  // Ordem importa: o mais específico primeiro.
  var APPS = [
    ['br.com.devbase.zippa.prestador', 'Zippa Motorista'],
    ['app.zippa.entregador',           'Zippa Entregador'],
    ['app.zippa.cliente',              'Zippa Delivery'],
    ['app.zippa.lojista',              'Zippa Lojistas'],
    ['br.com.devbase.zippa',           'Zippa (passageiro)'],
    ['id6822031474',                   'Zippa Lojistas'],
    ['id6821483597',                   'Zippa Delivery'],
    ['id6745717504',                   'Zippa (passageiro)']
  ];

  var ligado = false;
  var simuladorAvisado = false;

  function lerCookie(nome) {
    var partes = document.cookie.split('; ');
    for (var i = 0; i < partes.length; i++) {
      if (partes[i].indexOf(nome + '=') === 0) return partes[i].slice(nome.length + 1);
    }
    return '';
  }

  function consentiu() {
    return lerCookie(CONSENT_COOKIE) === 'all';
  }

  function arquivoAtual() {
    return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function rotuloWhatsApp(href) {
    var m = href.match(/[?&]text=([^&]*)/);
    if (!m) return 'WhatsApp';
    try {
      var t = decodeURIComponent(m[1]).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
      return t.length > 90 ? t.slice(0, 90) + '…' : t;
    } catch (e) {
      return 'WhatsApp';
    }
  }

  function nomeDoApp(href) {
    for (var i = 0; i < APPS.length; i++) {
      if (href.indexOf(APPS[i][0]) !== -1) return APPS[i][1];
    }
    return 'App Zippa';
  }

  function plataforma(href) {
    if (href.indexOf('play.google.com') !== -1) return 'Google Play';
    if (href.indexOf('apps.apple.com') !== -1 || href.indexOf('itunes.apple.com') !== -1) return 'App Store';
    return 'Loja de aplicativos';
  }

  function paginaDeConsideracao() {
    if (PAGINAS_CONSIDERACAO.indexOf(arquivoAtual()) === -1) return;
    window.fbq('track', 'ViewContent', {
      content_name: arquivoAtual().replace('.html', ''),
      content_category: 'parceiro'
    });
  }

  function ligarEventos() {
    // Cliques em WhatsApp, lojas de app e e-mail
    document.addEventListener('click', function (ev) {
      var el = ev.target;
      while (el && el !== document && el.tagName !== 'A') el = el.parentNode;
      if (!el || el.tagName !== 'A') return;

      var href = el.getAttribute('href') || '';

      if (/wa\.me|api\.whatsapp\.com|whatsapp\.com\/send/i.test(href)) {
        window.fbq('track', 'Lead', {
          content_name: rotuloWhatsApp(href),
          content_category: 'WhatsApp'
        });
      } else if (/play\.google\.com|apps\.apple\.com|itunes\.apple\.com/i.test(href)) {
        window.fbq('track', 'Lead', {
          content_name: nomeDoApp(href),
          content_category: plataforma(href)
        });
      } else if (/^mailto:/i.test(href)) {
        window.fbq('track', 'Contact', { content_name: 'E-mail do site' });
      }
    }, true);

    // Uso dos simuladores de ganho
    document.addEventListener('input', function (ev) {
      var alvo = ev.target;
      if (simuladorAvisado || !alvo || alvo.tagName !== 'INPUT' || alvo.type !== 'range') return;
      simuladorAvisado = true;
      window.fbq('trackCustom', 'SimuladorUsado', {
        content_name: arquivoAtual() === 'motorista.html' ? 'Motorista' : 'Entregador'
      });
    }, true);
  }

  function carregarPixel() {
    if (ligado || !META_PIXEL_ID || !consentiu()) return;
    ligado = true;

    /* Código base da Meta — não alterar */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');

    paginaDeConsideracao();
    ligarEventos();
  }

  // Consentimento dado agora (sem recarregar a página)
  window.addEventListener(CONSENT_EVENT, carregarPixel);

  // Consentimento já dado antes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregarPixel);
  } else {
    carregarPixel();
  }
})();
