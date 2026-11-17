/* =============================================
   ZIPPA — Banner de Cookies / LGPD
   ============================================= */

(function () {
  const COOKIE_KEY = 'zippa_cookies_consent';

  function getCookie(name) {
    return document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1];
  }

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  }

  function hideBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) {
      banner.style.transform = 'translateY(110%)';
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 400);
    }
  }

  function acceptAll() {
    setCookie(COOKIE_KEY, 'all', 365);
    hideBanner();
    // avisa o rastreamento (js/tracking.js) para ligar o pixel agora,
    // sem precisar recarregar a página
    window.dispatchEvent(new Event('zippa:consent'));
  }

  function acceptEssential() {
    setCookie(COOKIE_KEY, 'essential', 365);
    hideBanner();
  }

  function renderBanner() {
    if (getCookie(COOKIE_KEY)) return; // já respondeu

    const banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.innerHTML = `
      <div class="ck-inner">
        <div class="ck-left">
          <div class="ck-icon">🍪</div>
          <div class="ck-text">
            <strong>Aceitar cookies ajuda a Zippa a crescer</strong>
            <p>Os essenciais mantêm o site funcionando. Os opcionais medem o que você procura e melhoram os anúncios — sem eles a Zippa fica sem saber o que está funcionando. Você decide, como manda a <strong>LGPD</strong>, e pode mudar depois.</p>
            <a href="privacidade.html#cookies" class="ck-link">Ver o que é coletado →</a>
          </div>
        </div>
        <div class="ck-actions">
          <button class="ck-btn-accept" onclick="cookiesAcceptAll()">Aceitar todos</button>
          <button class="ck-btn-essential" onclick="cookiesEssential()">Só essenciais</button>
        </div>
      </div>
    `;

    // Estilos inline para o banner
    const style = document.createElement('style');
    style.textContent = `
      #cookieBanner {
        position: fixed;
        bottom: 24px;
        left: 24px;
        right: 24px;
        max-width: 860px;
        margin: 0 auto;
        background: #111111;
        color: white;
        border-radius: 20px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.4);
        z-index: 99999;
        padding: 24px 28px;
        border: 1px solid rgba(255,255,255,0.1);
        transition: transform 0.4s ease, opacity 0.4s ease;
        animation: slideUpCookie 0.5s ease forwards;
      }
      @keyframes slideUpCookie {
        from { transform: translateY(120%); opacity: 0; }
        to   { transform: translateY(0);   opacity: 1; }
      }
      #cookieBanner .ck-inner {
        display: flex;
        align-items: center;
        gap: 24px;
        flex-wrap: wrap;
      }
      #cookieBanner .ck-left {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        flex: 1;
        min-width: 260px;
      }
      #cookieBanner .ck-icon {
        font-size: 2rem;
        line-height: 1;
        flex-shrink: 0;
        margin-top: 2px;
      }
      #cookieBanner .ck-text strong {
        display: block;
        font-size: 0.95rem;
        font-weight: 700;
        color: white;
        margin-bottom: 6px;
      }
      #cookieBanner .ck-text p {
        font-size: 0.82rem;
        color: rgba(255,255,255,0.6);
        line-height: 1.6;
        margin: 0 0 8px;
      }
      #cookieBanner .ck-text p strong { display: inline; font-size: inherit; color: #FF6B00; }
      #cookieBanner .ck-link {
        font-size: 0.78rem;
        color: #FF6B00;
        text-decoration: none;
        font-weight: 600;
      }
      #cookieBanner .ck-link:hover { text-decoration: underline; }
      #cookieBanner .ck-actions {
        display: flex;
        gap: 10px;
        flex-shrink: 0;
        flex-wrap: wrap;
      }
      #cookieBanner .ck-btn-essential {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.25);
        color: rgba(255,255,255,0.7);
        padding: 11px 20px;
        border-radius: 40px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Inter', sans-serif;
      }
      #cookieBanner .ck-btn-essential:hover {
        border-color: rgba(255,255,255,0.5);
        color: white;
      }
      #cookieBanner .ck-btn-accept {
        background: #FF6B00;
        border: none;
        color: white;
        padding: 13px 30px;
        border-radius: 40px;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 16px rgba(255,107,0,0.35);
        font-family: 'Inter', sans-serif;
      }
      #cookieBanner .ck-btn-accept:hover {
        background: #E05A00;
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(255,107,0,0.45);
      }
      @media (max-width: 600px) {
        #cookieBanner { bottom: 0; left: 0; right: 0; border-radius: 20px 20px 0 0; padding: 20px; }
        #cookieBanner .ck-actions { width: 100%; justify-content: stretch; }
        #cookieBanner .ck-btn-essential,
        #cookieBanner .ck-btn-accept { flex: 1; text-align: center; }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(banner);
  }

  // Expor funções globalmente
  window.cookiesAcceptAll = acceptAll;
  window.cookiesEssential = acceptEssential;

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBanner);
  } else {
    renderBanner();
  }
})();
