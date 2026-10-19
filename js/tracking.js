/* ============================================================
   ZIPPA — Rastreamento para anúncios (Meta Pixel + Google Analytics 4)
   ============================================================

   COMO ATIVAR
   1) Meta: cole o ID do pixel na linha META_PIXEL_ID (só os números).
   2) GA4: cole o ID de medição na linha GA4_ID (formato G-XXXXXXXXXX).
   Pronto — nada mais precisa ser mexido. Os dois usam o mesmo portão de
   consentimento e os mesmos eventos, definidos uma única vez aqui.

   Enquanto o ID estiver vazio, este arquivo NÃO carrega script algum,
   não grava cookie e não faz nenhuma requisição para o Facebook.

   LGPD (Lei 13.709/2018)
   Nada dispara antes do "Aceitar todos" no aviso de cookies: nem o
   pixel da Meta, nem o gtag do Google. Quem escolhe "Só essenciais" navega sem rastreamento, e
   quem aceita depois passa a ser rastreado na hora, sem recarregar.

   EVENTOS ENVIADOS
   - PageView       toda página
   - ViewContent    páginas de consideração (parceiro, motorista,
                    entregador, comércio, franquias, anuncie)
   - Lead           clique em link do WhatsApp — o assunto da conversa
                    vai no nome do evento, para separar as campanhas
   - CliqueLoja     clique em Google Play / App Store, com o app no nome
                    (evento próprio, de propósito: assim Lead significa
                    só "quis falar no WhatsApp" e os públicos ficam limpos)
   - Contact        clique em e-mail
   - SimuladorUsado evento próprio: alguém mexeu num simulador

   Os mesmos eventos vão para o GA4 (a página é medida pelo page_view
   automático do gtag):
   - view_content    -> evento de consideração
   - generate_lead   -> nome recomendado pelo Google para captação de
                        lead (clique no WhatsApp)
   - clique_loja     -> clique em Google Play / App Store
   - contato_email   -> clique em e-mail
   - simulador_usado -> alguém mexeu num simulador
   ============================================================ */

(function () {
  'use strict';

  var META_PIXEL_ID = '970540685551369';          // ID do pixel da Meta (só números)
  var GA4_ID        = 'G-4PB0YG8MMG';            // ID de medição do Google Analytics 4

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
  var ga4Ligado = false;
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

  function eventoGA(nome, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', nome, params || {});
  }

  function paginaDeConsideracao() {
    if (PAGINAS_CONSIDERACAO.indexOf(arquivoAtual()) === -1) return;
    window.fbq('track', 'ViewContent', {
      content_name: arquivoAtual().replace('.html', ''),
      content_category: 'parceiro'
    });
    eventoGA('view_content', {
      pagina: arquivoAtual().replace('.html', ''),
      categoria: 'parceiro'
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
        eventoGA('generate_lead', {
          metodo_contato: 'WhatsApp',
          assunto: rotuloWhatsApp(href)
        });
      } else if (/play\.google\.com|apps\.apple\.com|itunes\.apple\.com/i.test(href)) {
        window.fbq('trackCustom', 'CliqueLoja', {
          content_name: nomeDoApp(href),
          content_category: plataforma(href)
        });
        eventoGA('clique_loja', {
          app: nomeDoApp(href),
          loja: plataforma(href)
        });
      } else if (/^mailto:/i.test(href)) {
        window.fbq('track', 'Contact', { content_name: 'E-mail do site' });
        eventoGA('contato_email', { metodo_contato: 'E-mail' });
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
      eventoGA('simulador_usado', { simulador: arquivoAtual() === 'motorista.html' ? 'Motorista' : 'Entregador' });
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

  function carregarGA4() {
    if (ga4Ligado || !GA4_ID || !consentiu()) return;
    ga4Ligado = true;

    /* Código base do Google (gtag.js) — o gtag precisa existir ANTES do script */
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

    var t = document.createElement('script');
    t.async = true;
    t.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(t);

    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);   // dispara o page_view da própria página
  }

  function carregarTudo() {
    carregarPixel();
    carregarGA4();
  }

  // Consentimento dado agora (sem recarregar a página)
  window.addEventListener(CONSENT_EVENT, carregarTudo);

  // Consentimento já dado antes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregarTudo);
  } else {
    carregarTudo();
  }
})();
