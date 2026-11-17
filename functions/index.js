const { onRequest } = require("firebase-functions/v2/https");

const PIXEL_ID = process.env.META_PIXEL_ID || "970540685551369";
const TOKEN = process.env.META_CAPI_TOKEN;
const ORIGENS = [
  "https://zippa.com.br",
  "https://www.zippa.com.br",
  "https://zippa-web-official.web.app",
];

/**
 * Recebe o evento do navegador e envia para a API de Conversões da Meta.
 * Existe para sobreviver a bloqueador, ITP do Safari e perda de cookie —
 * casos em que o pixel do navegador não chega, mas o usuário consentiu.
 */
exports.capi = onRequest({ region: "southamerica-east1", cors: ORIGENS }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erro: "use POST" });
  if (!TOKEN) return res.status(500).json({ ok: false, erro: "META_CAPI_TOKEN ausente" });

  const corpo = req.body || {};
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ua = req.headers["user-agent"] || "";
  const cookie = req.headers.cookie || "";
  const lerCookie = (nome) => {
    const m = cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]+)"));
    return m ? m[1] : undefined;
  };

  const evento = {
    event_name: corpo.evento || "PageView",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: corpo.url || "https://zippa.com.br/",
    user_data: { client_ip_address: ip, client_user_agent: ua },
  };
  if (corpo.id) evento.event_id = corpo.id;
  if (corpo.dados && Object.keys(corpo.dados).length) evento.custom_data = corpo.dados;

  const fbp = lerCookie("_fbp");
  const fbc = lerCookie("_fbc");
  if (fbp) evento.user_data.fbp = fbp;
  if (fbc) evento.user_data.fbc = fbc;

  try {
    const url = "https://graph.facebook.com/v27.0/" + PIXEL_ID + "/events";
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [evento], access_token: TOKEN }),
    });
    const texto = await resposta.text();
    if (!resposta.ok) console.error("capi_recusou", resposta.status, texto.slice(0, 400));
    return res.status(resposta.ok ? 200 : 502).json({ ok: resposta.ok });
  } catch (e) {
    console.error("capi_erro", e && e.message);
    return res.status(500).json({ ok: false });
  }
});
