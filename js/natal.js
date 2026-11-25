/* =============================================
   ZIPPA — Campanha de Natal (funil reverso)
   Leva quem está no site oficial para baixar o app.
   - Barra no topo, aviso ao entrar (1x por dia) e aviso ao tentar sair (1x por visita)
   - Configuração, datas e bônus vêm do Show de Prêmios (painel do dono):
     GET https://app.axonbrain.com.br/premios-api/config?slug=zippa  ->  config.natal
   - Se a campanha estiver desligada, vencida ou a API falhar, não aparece nada.
   - Teste: abra qualquer página com ?natal=ver (ignora as travas de "1x por dia/visita").
   ============================================= */
(function () {
  'use strict';
  var SLUG = 'zippa';
  var API = 'https://app.axonbrain.com.br/premios-api/';
  var PREMIOS = 'https://app.axonbrain.com.br/premios/' + SLUG;
  var K_IN = 'zp_nt_in', K_CLICK = 'zp_nt_click', K_BAR = 'zp_nt_bar', K_CFG = 'zp_nt_cfg';

  var teste = /[?&]natal=ver\b/.test(location.search);
  var natal = null, empresa = 'Zippa', cfg = null;
  var aberto = false, saiu = false, vistas = {}, off = 0;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; localStorage.setItem(k, v); } catch (e) {} return ''; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch (e) {} return ''; }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function reduz() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function ios() { return /iPhone|iPad|iPod/i.test(navigator.userAgent || ''); }
  function noApp() {
    try { if (window.matchMedia('(display-mode: standalone)').matches) return true; } catch (e) {}
    return !!window.navigator.standalone;
  }

  function track(tipo, origem, loja) {
    try {
      fetch(API + 'natal', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: SLUG, tipo: tipo, origem: origem, loja: loja || '' })
      }).catch(function () {});
    } catch (e) {}
  }
  function vista(origem) { if (vistas[origem]) return; vistas[origem] = 1; track('vista', origem); }

  function bonusTxt() {
    var n = natal && natal.bonus_giros;
    if (!(n > 0)) return '';
    return n === 1 ? '1 giro extra' : n + ' giros extras';
  }
  /** Cronômetro até 25/12 00:00 (Brasília). Usa a hora do servidor, então não depende do relógio do aparelho. */
  function cronometro(parar) {
    var alvo = natal.natal_ms || Date.UTC(new Date(Date.now() + off).getUTCFullYear(), 11, 25, 3, 0, 0);
    var box = el('div', 'ntz-cd');
    var l = el('div', 'l', 'Faltam para o Natal'); box.appendChild(l);
    var tm = el('div', 'ntz-tm'), nums = {};
    [['d', 'dias'], ['h', 'horas'], ['m', 'min'], ['s', 'seg']].forEach(function (u) {
      var c = el('div', 'u'), b = el('b', null, '00'); nums[u[0]] = b;
      c.appendChild(b); c.appendChild(el('i', null, u[1])); tm.appendChild(c);
    });
    box.appendChild(tm);
    function dois(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var r = Math.floor((alvo - (Date.now() + off)) / 1000);
      if (r <= 0) { box.textContent = ''; box.appendChild(el('div', 'l fim', '🎅 Feliz Natal!')); if (id) clearInterval(id); return; }
      nums.d.textContent = dois(Math.floor(r / 86400)); nums.h.textContent = dois(Math.floor(r % 86400 / 3600));
      nums.m.textContent = dois(Math.floor(r % 3600 / 60)); nums.s.textContent = dois(r % 60);
    }
    var id = setInterval(tick, 1000); tick();
    parar.push(function () { clearInterval(id); });
    return box;
  }
  function lojas() {
    var l = [];
    if (natal.android) l.push({ k: 'android', url: natal.android, nome: 'Google Play', emoji: '🤖' });
    if (natal.ios) l.push({ k: 'ios', url: natal.ios, nome: 'App Store', emoji: '🍎' });
    if (ios()) l.sort(function (a) { return a.k === 'ios' ? -1 : 1; });
    return l;
  }
  function linkBonus(origem) {
    return PREMIOS + '?nt=bonus&og=' + encodeURIComponent(origem);
  }

  // ── estilos (injetados: o CSS do site fica em cache por 7 dias) ──
  function css() {
    if (document.getElementById('ntCss')) return;
    var s = document.createElement('style'); s.id = 'ntCss';
    s.textContent =
      '.ntz-bar{position:fixed;top:0;left:0;right:0;z-index:1001;display:flex;align-items:center;justify-content:center;gap:10px;padding:7px 12px;color:#fff;font:600 13px/1.25 Inter,"Segoe UI",sans-serif;background:linear-gradient(90deg,#8b1220,#c4122f 58%,#0f6b3a);border-bottom:1px solid rgba(255,201,77,.6)}' +
      '.ntz-bar b{color:#ffc94d}.ntz-bar .go{background:#ffc94d;color:#3a0a0a;border:0;border-radius:999px;padding:6px 13px;font:800 12px Inter,sans-serif;cursor:pointer;white-space:nowrap}' +
      '.ntz-bar .x{background:none;border:0;color:rgba(255,255,255,.8);font-size:20px;line-height:1;cursor:pointer;padding:0 4px}' +
      '.ntz-bar .tx{text-align:center}' +
      'body.ntz-on .navbar{top:var(--ntz-h,40px)!important}' +
      '.ntz-over{position:fixed;inset:0;z-index:100000;background:rgba(6,2,4,.82);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:18px;animation:ntzFade .35s ease}' +
      '@keyframes ntzFade{from{opacity:0}to{opacity:1}}@keyframes ntzPop{from{transform:scale(.88);opacity:0}to{transform:none;opacity:1}}' +
      '.ntz-box{position:relative;width:100%;max-width:420px;max-height:92vh;overflow:auto;border-radius:24px;padding:26px 20px 18px;text-align:center;color:#fff;font-family:Inter,"Segoe UI",sans-serif;background:radial-gradient(420px 220px at 50% -40px,rgba(255,201,77,.28),transparent 70%),linear-gradient(160deg,#9b1426 0%,#5e0b17 55%,#0d4d2b 130%);border:1px solid rgba(255,201,77,.7);box-shadow:0 18px 60px rgba(0,0,0,.6);animation:ntzPop .4s cubic-bezier(.2,1.4,.3,1)}' +
      '.ntz-box>*:not(.ntz-snow){position:relative}.ntz-snow{position:absolute;inset:0;pointer-events:none;overflow:hidden}' +
      '.ntz-snow i{position:absolute;top:-10px;border-radius:50%;background:#fff;opacity:.8;animation:ntzSnow linear infinite}@keyframes ntzSnow{to{transform:translate3d(var(--dx,20px),108vh,0)}}' +
      '.ntz-tree{font-size:54px;line-height:1;filter:drop-shadow(0 6px 14px rgba(0,0,0,.45));animation:ntzSway 3.2s ease-in-out infinite;transform-origin:50% 90%}@keyframes ntzSway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}' +
      '.ntz-ttl{margin:2px 0 0;font-size:25px;line-height:1.15;font-weight:900;letter-spacing:-.3px;text-shadow:0 2px 12px rgba(0,0,0,.4)}' +
      '.ntz-sub{display:inline-block;margin:8px 0 4px;font-size:12px;font-weight:900;letter-spacing:2.4px;text-transform:uppercase;color:#3a0a0a;background:linear-gradient(90deg,#ffc94d,#ffe08a,#ffc94d);padding:5px 14px;border-radius:999px;box-shadow:0 4px 14px rgba(255,201,77,.35)}' +
      '.ntz-wheel{position:relative;width:min(58vw,224px,30vh);aspect-ratio:1;margin:16px auto 12px}' +
      '.ntz-wheel canvas{width:100%;height:100%;display:block;border-radius:50%;transition:transform 4.6s cubic-bezier(.12,.75,.1,1);box-shadow:0 0 0 5px #2a0710,0 0 0 8px #ffc94d,0 10px 34px rgba(255,201,77,.4)}' +
      '.ntz-wheel .pt{position:absolute;top:-13px;left:50%;transform:translateX(-50%);width:0;height:0;z-index:3;border-left:12px solid transparent;border-right:12px solid transparent;border-top:24px solid #ffc94d;filter:drop-shadow(0 3px 3px rgba(0,0,0,.6))}' +
      '.ntz-wheel .hb{position:absolute;top:50%;left:50%;width:22%;height:22%;transform:translate(-50%,-50%);border-radius:50%;z-index:2;background:radial-gradient(circle at 35% 30%,#fff3c4,#ffc94d 55%,#ff8a00);box-shadow:0 0 0 4px #2a0710;display:flex;align-items:center;justify-content:center;font-size:17px}' +
      '.ntz-cd{margin-top:2px}.ntz-cd .l{font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#ffd9a0}.ntz-cd .l.fim{font-size:15px;color:#ffc94d}' +
      '.ntz-tm{display:flex;justify-content:center;gap:7px;margin-top:6px}.ntz-tm .u{min-width:56px;background:rgba(0,0,0,.38);border:1px solid rgba(255,201,77,.6);border-radius:11px;padding:6px 4px 5px;box-shadow:inset 0 0 12px rgba(255,201,77,.12)}' +
      '.ntz-tm .u b{display:block;font:900 23px/1 Inter,"Segoe UI",sans-serif;color:#ffc94d;font-variant-numeric:tabular-nums}.ntz-tm .u i{display:block;margin-top:3px;font:700 9px/1 Inter,sans-serif;font-style:normal;letter-spacing:1px;text-transform:uppercase;color:#ffe9d6}' +
      '.ntz-box h3{font-size:23px;line-height:1.2;margin:10px 0 6px;font-weight:800}.ntz-box .tx{font-size:14px;line-height:1.5;color:#ffe9d6}' +
      '.ntz-box ul{list-style:none;text-align:left;margin:12px 0 14px;padding:0}.ntz-box li{font-size:13px;line-height:1.45;background:rgba(0,0,0,.22);border-radius:10px;padding:8px 10px;margin-bottom:6px}' +
      '.ntz-box li.bn{background:rgba(255,201,77,.18);border:1px solid rgba(255,201,77,.55);font-weight:700}' +
      '.ntz-lojas{display:flex;flex-direction:column;gap:8px}.ntz-btn{display:block;text-decoration:none;text-align:center;border-radius:14px;padding:14px;font:800 15px Inter,sans-serif;cursor:pointer;border:0}' +
      '.ntz-btn.l1{background:#ffc94d;color:#3a0a0a}.ntz-btn.l2{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.35)}' +
      '.ntz-nao{background:none;border:0;color:#ffd9bd;font:13px Inter,sans-serif;text-decoration:underline;cursor:pointer;margin-top:12px;width:100%}' +
      '@media(max-height:880px){.ntz-box{padding:20px 18px 14px}.ntz-box li.ex2{display:none}.ntz-wheel{margin:14px auto 10px}.ntz-box ul{margin:10px 0 12px}}' +
      '@media(max-height:760px){.ntz-box li.ex1{display:none}.ntz-box h3{font-size:22px}}' +
      '@media(max-height:660px){.ntz-tm .u{min-width:50px;padding:4px 3px}.ntz-tm .u b{font-size:19px}.ntz-box p.tx{display:none}.ntz-btn{padding:12px}.ntz-wheel{margin:12px auto 8px}}' +
      '@media(max-width:600px){.ntz-bar{font-size:12px;padding:6px 8px;gap:6px}.ntz-bar .go{padding:5px 10px}}' +
      '@media(prefers-reduced-motion:reduce){.ntz-snow,.ntz-tree{animation:none!important;display:none}}';
    document.head.appendChild(s);
  }
  function neve(alvo, qtd) {
    if (reduz()) return;
    for (var i = 0; i < qtd; i++) {
      var f = document.createElement('i'), sz = 2 + Math.random() * 4;
      f.style.left = (Math.random() * 100) + '%'; f.style.width = f.style.height = sz + 'px';
      f.style.animationDuration = (6 + Math.random() * 8) + 's'; f.style.animationDelay = (-Math.random() * 10) + 's';
      f.style.setProperty('--dx', ((Math.random() * 60) - 30) + 'px'); f.style.opacity = String(.4 + Math.random() * .5);
      alvo.appendChild(f);
    }
  }

  // ── roleta (mesmo desenho e mesmas fatias do Show de Prêmios) ──
  var CORES = ['#ff6a00', '#111827', '#ffb300', '#7c3aed', '#16a34a', '#e11d48'];
  function segmentos() {
    var g = cfg && cfg.games, sg = cfg && cfg.segmentos;
    if (g && g.roleta === false) return null;     // sem roleta ativa, não promete roleta
    if (!sg || sg.length < 2) return null;
    return sg;
  }
  function desenhar(c, seg) {
    var g = c.getContext('2d'), n = seg.length, R = c.width / 2, a = 2 * Math.PI / n;
    g.clearRect(0, 0, c.width, c.height);
    for (var i = 0; i < n; i++) {
      var ini = -Math.PI / 2 - a / 2 + i * a, cor = seg[i].cor || CORES[i % CORES.length];
      g.beginPath(); g.moveTo(R, R); g.arc(R, R, R - 4, ini, ini + a); g.closePath();
      g.fillStyle = cor; g.fill(); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 3; g.stroke();
      g.save(); g.translate(R, R); g.rotate(ini + a / 2); g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillStyle = /^#(ff|ffb|ffc|ffd)/i.test(cor) ? '#1a1206' : '#fff';
      var lab = seg[i].ganhou ? String(seg[i].label || '') : 'Quase!', fs = lab.length > 16 ? 26 : lab.length > 9 ? 33 : 42;
      g.font = '800 ' + fs + 'px -apple-system, Segoe UI, Roboto, sans-serif';
      g.fillText(lab, R - 40, 0, R * 0.62); g.restore();
    }
  }
  /** Gira e para num prêmio (só enfeite: o giro de verdade é feito no app, com login). Repete até fechar. */
  function animar(c, seg, parar) {
    var n = seg.length, a = 360 / n, ang = 0, vivo = true, t1 = null, t2 = null;
    var ganha = []; for (var i = 0; i < n; i++) if (seg[i].ganhou) ganha.push(i);
    if (!ganha.length) ganha = [0];
    function girar() {
      if (!vivo) return;
      var idx = ganha[Math.floor(Math.random() * ganha.length)], jitter = (Math.random() - 0.5) * a * 0.5;
      var atual = ang % 360;
      ang = ang - atual + 360 * 5 + (360 - idx * a) + jitter;
      c.style.transform = 'rotate(' + ang + 'deg)';
      t2 = setTimeout(girar, 4600 + 2600);
    }
    if (!reduz()) t1 = setTimeout(girar, 700);
    parar.push(function () { vivo = false; clearTimeout(t1); clearTimeout(t2); });
  }

  // ── aviso grande ──
  function abrir(origem) {
    if (!natal || aberto || noApp()) return;
    if (document.querySelector('.mobile-menu.open')) return;
    aberto = true;
    css();
    var ov = el('div', 'ntz-over'), box = el('div', 'ntz-box');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Natal Premiado Zippa, Show de Descontos');
    var sn = el('div', 'ntz-snow'); neve(sn, 24); box.appendChild(sn);
    var parar = [];
    box.appendChild(cronometro(parar));
    box.appendChild(el('h3', 'ntz-ttl', '🎄 ' + (natal.titulo || ('Natal Premiado ' + empresa))));
    box.appendChild(el('div', 'ntz-sub', 'Show de Descontos'));
    var seg = segmentos();
    if (seg) {
      var rb = el('div', 'ntz-wheel'); rb.setAttribute('aria-hidden', 'true');
      var cv = document.createElement('canvas'); cv.width = 680; cv.height = 680;
      rb.appendChild(el('div', 'pt')); rb.appendChild(cv); rb.appendChild(el('div', 'hb', '🎁'));
      box.appendChild(rb); desenhar(cv, seg); animar(cv, seg, parar);
    }
    box.appendChild(el('p', 'tx', natal.texto || ('Baixe o app da ' + empresa + (seg ? ', gire a roleta do Show de Prêmios e concorra a descontos nas suas corridas.' : ' e concorra a descontos nas suas corridas.'))));
    var ul = document.createElement('ul'), bt = bonusTxt();
    if (bt) ul.appendChild(el('li', 'bn', '🎁 Baixe o app e ganhe ' + bt + ' na roleta.'));
    if (cfg && cfg.fidelidade) ul.appendChild(el('li', 'ex1', '🎟️ Cartão Fidelidade: a cada ' + cfg.fidelidade.meta_corridas + ' corridas, ' + cfg.fidelidade.desconto_pct + '% de desconto na próxima.'));
    ul.appendChild(el('li', 'ex2', '🚗 Peça seu carro sem precisar mandar mensagem.'));
    box.appendChild(ul);
    var area = el('div', 'ntz-lojas');
    lojas().forEach(function (lj, i) {
      var a = document.createElement('a');
      a.href = lj.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = 'ntz-btn ' + (i === 0 ? 'l1' : 'l2');
      a.textContent = lj.emoji + ' Baixar na ' + lj.nome;
      a.addEventListener('click', function () {
        ls(K_CLICK, '1'); track('clique', origem, lj.k);
        var b = document.getElementById('ntzBar'); if (b) b.remove(); document.body.classList.remove('ntz-on');
        if (bt) passoBonus(box, area, nao, origem); else setTimeout(fim, 700);
      });
      area.appendChild(a);
    });
    box.appendChild(area);
    var nao = el('button', 'ntz-nao', origem === 's_saida' ? 'Já vou, obrigado' : 'Agora não, continuar no site');
    nao.type = 'button'; box.appendChild(nao);
    ov.appendChild(box); document.body.appendChild(ov);
    vista(origem);
    function fim() { parar.forEach(function (f) { f(); }); if (ov.parentNode) ov.remove(); aberto = false; document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') fim(); }
    nao.addEventListener('click', fim);
    ov.addEventListener('click', function (e) { if (e.target === ov) fim(); });
    document.addEventListener('keydown', esc);
    ov._fim = fim;
  }
  /** Depois de tocar em baixar: leva para pegar o giro extra no Show de Prêmios (quando o app estiver instalado). */
  function passoBonus(box, area, nao, origem) {
    area.textContent = '';
    var p = el('p', 'tx', 'Boa! Assim que o app estiver instalado, toque abaixo e entre com seu celular para receber ' + bonusTxt() + ' na roleta.');
    p.style.margin = '6px 0 12px';
    area.appendChild(p);
    var a = document.createElement('a');
    a.href = linkBonus(origem); a.className = 'ntz-btn l1'; a.textContent = '🎁 Pegar meu giro extra';
    area.appendChild(a);
    nao.textContent = 'Fechar';
  }

  // ── barra do topo ──
  function barra() {
    if (ls(K_CLICK) === '1' && !teste) return;
    if (ss(K_BAR) === 'x' && !teste) return;
    css();
    var b = el('div', 'ntz-bar'); b.id = 'ntzBar';
    var tx = el('div', 'tx');
    tx.appendChild(el('b', null, '🎄 Natal Premiado ' + empresa));
    tx.appendChild(document.createTextNode(bonusTxt() ? ' · baixe o app e ganhe ' + bonusTxt() : ' · Show de Descontos no app'));
    var go = el('button', 'go', 'Baixar app'); go.type = 'button';
    var x = el('button', 'x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar aviso');
    b.appendChild(tx); b.appendChild(go); b.appendChild(x);
    document.body.appendChild(b);
    var h = b.offsetHeight || 40;
    document.documentElement.style.setProperty('--ntz-h', h + 'px');
    document.body.classList.add('ntz-on');
    vista('s_barra');
    go.addEventListener('click', function () { abrir('s_barra'); });
    x.addEventListener('click', function () { ss(K_BAR, 'x'); b.remove(); document.body.classList.remove('ntz-on'); });
  }

  // ── gatilhos ──
  function iniciar() {
    if (noApp() || !natal || (!natal.android && !natal.ios)) return;
    barra();
    var clicou = ls(K_CLICK) === '1' && !teste;
    if (clicou) return;

    // entrada: 1x por dia, uns segundos depois de abrir (não espera o banner de cookies: o aviso fica por cima dele)
    if (teste || ls(K_IN) !== hoje()) {
      setTimeout(function () { ls(K_IN, hoje()); abrir('s_entrada'); }, 2500);
    }
    // saída: 1x por visita. Computador: mouse saindo pelo topo. Celular: primeiro toque em "voltar".
    var saida = function () { if (!teste && (saiu || ss('zp_nt_out') === '1')) return; saiu = true; ss('zp_nt_out', '1'); abrir('s_saida'); };
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) saida(); });
    var toque = false; try { toque = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}
    if (toque && window.history && history.pushState && !ss('zp_nt_hist')) {
      ss('zp_nt_hist', '1');
      try { history.pushState({ nt: 1 }, ''); } catch (e) {}
      window.addEventListener('popstate', function () { if (!saiu) saida(); });
    }
  }

  function usar(r, desvio) { cfg = r.config; natal = cfg.natal; empresa = r.empresa || 'Zippa'; off = desvio || 0; }
  function desligar() {
    natal = null; document.body.classList.remove('ntz-on');
    var b = document.getElementById('ntzBar'); if (b) b.remove();
    var o = document.querySelector('.ntz-over'); if (o && o._fim) o._fim();
  }
  function carregar() {
    // repetindo a visita, o aviso aparece na hora com a última configuração guardada (e é atualizado logo depois)
    var cache = null, usouCache = false;
    try { cache = JSON.parse(ls(K_CFG) || 'null'); } catch (e) {}
    if (cache && cache.r && cache.r.ok && cache.r.config && cache.r.config.natal && Date.now() - cache.t < 6 * 3600e3) {
      usar(cache.r, cache.off); usouCache = true; iniciar();
    }
    fetch(API + 'config?slug=' + SLUG, { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r || !r.ok || !r.config || !r.config.natal) { ls(K_CFG, ''); if (usouCache) desligar(); return; }
        var desvio = r.config.natal.agora_ms ? r.config.natal.agora_ms - Date.now() : 0;
        ls(K_CFG, JSON.stringify({ t: Date.now(), r: r, off: desvio }));
        usar(r, desvio);
        if (!usouCache) iniciar();
      })
      .catch(function () { /* sem conexão ou API fora do ar: o site segue normal */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', carregar);
  else carregar();
})();
