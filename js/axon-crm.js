/* =============================================
   ZIPPA — Integração Axon CRM
   Captura de Leads
   ============================================= */

window.AxonCRM = {
  apiKey:   'axon_live_23xj1dn4p6b56c85t2oyrpiszc6k5akc',
  endpoint: 'https://us-central1-emdia-backup.cloudfunctions.net/axonCrmCaptureLead',

  capturar: async function(dados) {
    const resp = await fetch(this.endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:       this.apiKey,
        origem_pagina: window.location.href,
        ...dados
      })
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error);
    return json;
  }
};

/* =============================================
   Função genérica de envio de formulário
   ============================================= */
async function zippaEnviarLead(formId, btnId, successId, dados) {
  const btn     = document.getElementById(btnId);
  const success = document.getElementById(successId);

  // Estado de carregando
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

  try {
    await window.AxonCRM.capturar(dados);

    // Sucesso
    btn.style.display = 'none';
    success.style.display = 'flex';

    // Limpar form
    const form = document.getElementById(formId);
    if (form) form.reset();

  } catch (err) {
    console.error('Erro Axon CRM:', err);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-redo"></i> Tentar novamente';
    btn.style.background = '#e74c3c';
    setTimeout(() => {
      btn.style.background = '';
      btn.innerHTML = btn.getAttribute('data-label');
    }, 3000);
  }
}
